"use client";
import { useLocale } from "@/lib/i18n";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { pickRecordingFormat, transcribe, fetchTTSBlob, stripForSpeech } from "@/lib/voice";

// ---------------------------------------------------------------------------
// VoiceMode: full-screen GPT-style voice conversation loop.
//   listening → (VAD detects end of speech) → transcribing → thinking (LLM
//   streams in background) → speaking (TTS playback) → listening → ...
//
// iOS autoplay strategy: the <audio> element below is ALWAYS mounted. The
// parent must call ref.unlock() synchronously inside the user's tap that
// opens voice mode — that single gesture authorizes this element for the
// whole session, so later src swaps + play() succeed outside gesture context.
// ---------------------------------------------------------------------------

export interface VoiceModeHandle {
  unlock: () => void;
}

interface VoiceModeProps {
  open: boolean;
  onClose: () => void;
  // Sends a user message through the normal chat pipeline; resolves with the
  // assistant's full reply text once streaming finishes.
  sendMessage: (content: string) => Promise<string | undefined>;
  // Live assistant text while streaming (for subtitles during "thinking")
  liveText?: string;
}

type VState = "idle" | "listening" | "transcribing" | "thinking" | "speaking";

// Tunables — adjust after real-device testing
const SPEECH_RMS_THRESHOLD = 0.022; // above = speech, below = silence
const SILENCE_END_MS = 1400;        // this much trailing silence ends the turn
const MIN_SPEECH_MS = 400;          // shorter bursts are treated as noise
const MIN_BLOB_BYTES = 2000;        // tiny recordings are discarded

// Radial float of the thinking cloud, calibrated frame-by-frame against a
// 5x slow-motion GPT capture (2026-06-11): per-petal tip travel ≈ ±3px
// visual at our scale (was ±9 — far too deep), period ≈ 1s real time with
// scattered per-petal periods (GPT looks noise-driven; unequal sine periods
// approximate that beatless organic wobble). The think bubble does NOT orbit
// the cloud (bearing locked at ~135°, ±1.5°) but breathes radially ±5px and
// scales ±10% on the same rhythm. Driven inside the spin rAF loop.
// Petal amplitudes are pre-divided by each wrapper's CSS scale and
// pre-multiplied by the outward unit vector of its CSS translate.
// Order: blob-2..6, then think bubble (scale 1, no compensation).
const PETAL_FLOAT = [
  { ax: 0.84, ay: -4.93, ph: 0.0, T: 1040, sBase: 0.96, sAmp: 0.04 },  // blob-2 (7,-41)/0.60
  { ax: 5.91, ay: -1.05, ph: 1.7, T: 920, sBase: 0.96, sAmp: 0.04 },   // blob-3 (45,-8)/0.50
  { ax: 3.06, ay: 4.4, ph: 3.5, T: 1180, sBase: 0.96, sAmp: 0.04 },    // blob-4 (25,36)/0.56
  { ax: -5.0, ay: 4.19, ph: 5.0, T: 1000, sBase: 0.96, sAmp: 0.04 },   // blob-5 (-31,26)/0.46
  { ax: -5.04, ay: -2.34, ph: 0.9, T: 1310, sBase: 0.96, sAmp: 0.04 }, // blob-6 (-41,-19)/0.54
  { ax: -3.78, ay: 3.27, ph: 2.6, T: 1120, sBase: 1.0, sAmp: 0.1 },    // think bubble (-60,52)
];

// --- streaming TTS sentence pipeline helpers ---------------------------------
interface SpeechSlot {
  text: string;            // sentence chunk this slot speaks
  buf: AudioBuffer | null; // decoded audio, null = synthesis failed (skip)
  done: boolean;           // synthesis attempt finished
}

const SENTENCE_END_RE = /[。！？!?；;\n]|\.(?=\s|$)/g;

// Index just past the next sentence boundary at/after `from`, or -1
function nextCut(text: string, from: number): number {
  SENTENCE_END_RE.lastIndex = from;
  const m = SENTENCE_END_RE.exec(text);
  return m ? m.index + m[0].length : -1;
}

// First segment can ship at a comma once enough text has accumulated —
// trading a slightly rising intonation for ~1s earlier time-to-speech.
const FIRST_SOFT_CUT_MIN_CHARS = 14;
const SOFT_CUT_RE = /[，、,：:]/g;

// Index just past the last comma-ish boundary, or -1
function lastSoftCut(text: string): number {
  SOFT_CUT_RE.lastIndex = 0;
  let pos = -1;
  let m: RegExpExecArray | null;
  while ((m = SOFT_CUT_RE.exec(text))) pos = m.index + 1;
  return pos;
}

// Clean streaming text for speech with prefix stability: stop before any
// unclosed code fence / HTML comment so their content never leaks into TTS
// mid-stream and earlier cleaned prefixes never change retroactively.
function streamSafeClean(raw: string): string {
  let safe = raw;
  const fenceCount = safe.split("```").length - 1;
  if (fenceCount % 2 === 1) safe = safe.slice(0, safe.lastIndexOf("```"));
  const lastOpen = safe.lastIndexOf("<!--");
  if (lastOpen !== -1 && safe.indexOf("-->", lastOpen) === -1) {
    safe = safe.slice(0, lastOpen);
  }
  return stripForSpeech(safe);
}

const VoiceMode = forwardRef<VoiceModeHandle, VoiceModeProps>(function VoiceMode(
  { open, onClose, sendMessage, liveText },
  ref
) {
  const { t } = useLocale();
  const [vstate, setVState] = useState<VState>("idle");
  const [userText, setUserText] = useState("");
  const [spokenText, setSpokenText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const stateRef = useRef<VState>("idle");
  const aliveRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferSrcRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>(0);
  const speechStartRef = useRef(0);   // timestamp when speech first detected
  const silenceStartRef = useRef(0);  // timestamp when current silence began
  const orbRef = useRef<HTMLDivElement | null>(null);

  // JS-driven cloud spin (CSS animation on the spin group silently fails on iOS)
  const spinRef = useRef<HTMLDivElement | null>(null);
  const spinAngleRef = useRef(0);
  const spinRafRef = useRef(0);

  // Audio-reactive speaking pills
  const pillRefs = useRef<(HTMLElement | null)[]>([]);
  // Thinking-cloud petal cores (blob-2..6) for the radial float
  const petalRefs = useRef<(HTMLElement | null)[]>([]);
  const playAnalyserRef = useRef<AnalyserNode | null>(null);
  const eqRafRef = useRef(0);
  const eqLevelsRef = useRef([1, 1, 1, 1]);

  // Streaming TTS pipeline state (refs only — no re-renders per segment)
  const turnIdRef = useRef(0);          // bumped to invalidate in-flight work
  const segQueueRef = useRef<SpeechSlot[]>([]);
  const playIdxRef = useRef(0);
  const isPlayingRef = useRef(false);
  const llmDoneRef = useRef(false);
  const consumedRef = useRef(0);        // chars of cleaned text already enqueued

  // Bridge to the latest sendMessage — recorder.onstop callbacks live across
  // renders, so a direct closure would capture stale chat state (e.g. the
  // conversation id from before the first turn created it).
  const sendMessageRef = useRef(sendMessage);
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);
  // Pending LLM stream from a previous turn (e.g. user skipped playback while
  // the model was still generating) — never run two streams concurrently.
  const pendingSendRef = useRef<Promise<unknown> | null>(null);

  const setStateBoth = (s: VState) => {
    stateRef.current = s;
    setVState(s);
  };

  // --- iOS audio unlock: MUST run synchronously inside a user gesture -------
  useImperativeHandle(ref, () => ({
    unlock: () => {
      try {
        if (!audioCtxRef.current) {
          const Ctx =
            window.AudioContext ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).webkitAudioContext;
          if (Ctx) audioCtxRef.current = new Ctx();
        }
        // One gesture-bound resume authorizes this context for the whole
        // session — both VAD analysis and Web Audio playback run through it.
        audioCtxRef.current?.resume().catch(() => {});
      } catch { /* unlock is best-effort */ }
    },
  }));

  // --- session teardown ------------------------------------------------------
  const cleanup = useCallback(() => {
    aliveRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      try { rec.stop(); } catch { /* noop */ }
    }
    recorderRef.current = null;
    chunksRef.current = [];
    try { sourceRef.current?.disconnect(); } catch { /* noop */ }
    sourceRef.current = null;
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    turnIdRef.current++;
    const src = bufferSrcRef.current;
    if (src) {
      src.onended = null;
      try { src.stop(); } catch { /* already stopped */ }
      bufferSrcRef.current = null;
    }
    isPlayingRef.current = false;
    segQueueRef.current = [];
    playIdxRef.current = 0;
    llmDoneRef.current = false;
    consumedRef.current = 0;
    audioCtxRef.current?.suspend().catch(() => {});
    setStateBoth("idle");
  }, []);

  // --- VAD loop ---------------------------------------------------------------
  const vadLoop = useCallback(() => {
    if (!aliveRef.current || stateRef.current !== "listening") return;
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / data.length);

    // Drive orb scale directly on the DOM (no re-render per frame)
    if (orbRef.current) {
      const scale = 1 + Math.min(rms * 5, 0.45);
      orbRef.current.style.transform = `scale(${scale.toFixed(3)})`;
    }

    const now = performance.now();
    if (rms > SPEECH_RMS_THRESHOLD) {
      if (!speechStartRef.current) speechStartRef.current = now;
      silenceStartRef.current = 0;
    } else if (speechStartRef.current) {
      if (!silenceStartRef.current) {
        silenceStartRef.current = now;
      } else if (
        now - silenceStartRef.current > SILENCE_END_MS &&
        silenceStartRef.current - speechStartRef.current > MIN_SPEECH_MS
      ) {
        finishTurn();
        return;
      } else if (now - silenceStartRef.current > SILENCE_END_MS) {
        // Too-short burst followed by silence: reset, keep listening
        speechStartRef.current = 0;
        silenceStartRef.current = 0;
      }
    }
    rafRef.current = requestAnimationFrame(vadLoop);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- start a listening turn --------------------------------------------------
  const startListening = useCallback(async () => {
    if (!aliveRef.current) return;
    setErrorMsg("");
    try {
      if (!streamRef.current) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (!aliveRef.current) {
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
          return;
        }
        if (!audioCtxRef.current) {
          const Ctx =
            window.AudioContext ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).webkitAudioContext;
          if (Ctx) audioCtxRef.current = new Ctx();
        }
        const ctx = audioCtxRef.current;
        if (ctx) {
          ctx.resume().catch(() => {});
          sourceRef.current = ctx.createMediaStreamSource(streamRef.current);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          sourceRef.current.connect(analyser);
          analyserRef.current = analyser;
        }
      } else {
        audioCtxRef.current?.resume().catch(() => {});
      }

      const { mimeType } = pickRecordingFormat();
      chunksRef.current = [];
      const recorder = new MediaRecorder(
        streamRef.current,
        mimeType ? { mimeType } : undefined
      );
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = handleTurnAudio;
      recorder.start();
      recorderRef.current = recorder;
      speechStartRef.current = 0;
      silenceStartRef.current = 0;
      setStateBoth("listening");
      rafRef.current = requestAnimationFrame(vadLoop);
    } catch {
      setErrorMsg(t("voiceMicDenied"));
      setStateBoth("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, vadLoop]);

  // --- end of user's turn: stop recorder, onstop handles the rest --------------
  const finishTurn = useCallback(() => {
    if (stateRef.current !== "listening") return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    if (orbRef.current) orbRef.current.style.transform = "scale(1)";
    setStateBoth("transcribing");
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try { rec.stop(); } catch { setStateBoth("idle"); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- recorder.onstop: transcribe → send → speak -------------------------------
  const handleTurnAudio = useCallback(async () => {
    if (!aliveRef.current || stateRef.current !== "transcribing") return;
    const { mimeType, format } = pickRecordingFormat();
    const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
    chunksRef.current = [];

    if (blob.size < MIN_BLOB_BYTES) {
      startListening();
      return;
    }

    let text = "";
    try {
      text = await transcribe(blob, format);
    } catch (err) {
      if (!aliveRef.current) return;
      setStateBoth("idle");
      setErrorMsg(`${t("sttFailed")}: ${err instanceof Error ? err.message : String(err)}`);
      setTimeout(() => {
        if (aliveRef.current) startListening();
      }, 3000);
      return;
    }

    if (!aliveRef.current) return;
    if (!text) {
      startListening();
      return;
    }

    try {
      setUserText(text);
      setSpokenText("");
      setStateBoth("thinking");

      abortSpeech(); // reset pipeline, invalidate stale segments
      const turnId = turnIdRef.current;

      // If a previous turn's stream is still finishing (skipped playback),
      // let it settle first — page-level chat state isn't reentrant.
      if (pendingSendRef.current) {
        try { await pendingSendRef.current; } catch { /* previous turn's problem */ }
        if (!aliveRef.current || turnId !== turnIdRef.current) return;
      }

      // While this await is pending, the liveText effect harvests complete
      // sentences from the stream and feeds them into the playback queue.
      const sendPromise = sendMessageRef.current(text);
      pendingSendRef.current = sendPromise;
      const reply = await sendPromise;
      if (!aliveRef.current || turnId !== turnIdRef.current) return;

      // Flush the tail past the last harvested sentence, then let the
      // pump's drain check decide when to go back to listening.
      llmDoneRef.current = true;
      const clean = streamSafeClean(reply || "");
      harvest(clean, turnId); // cut remaining complete sentences one by one
      if (clean.length > consumedRef.current) {
        const tail = clean.slice(consumedRef.current).trim();
        consumedRef.current = clean.length;
        if (tail) enqueueSegment(tail, turnId);
      }
      pump(turnId);
    } catch (err) {
      if (!aliveRef.current) return;
      abortSpeech(); // stop any half-played segments before recovery
      setStateBoth("idle");
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setTimeout(() => {
        if (aliveRef.current) startListening();
      }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, startListening]);

  // --- streaming TTS pipeline (Web Audio, same context as VAD) ---------------------
  // Sentences are synthesized in parallel as the LLM streams, but played
  // strictly in order. Playing through the shared AudioContext (not an
  // <audio> element) keeps iOS from interrupting the VAD analyser.

  // Invalidate every in-flight synthesis/playback and reset the pipeline
  const abortSpeech = useCallback(() => {
    turnIdRef.current++;
    const src = bufferSrcRef.current;
    if (src) {
      src.onended = null;
      try { src.stop(); } catch { /* already stopped */ }
      bufferSrcRef.current = null;
    }
    isPlayingRef.current = false;
    segQueueRef.current = [];
    playIdxRef.current = 0;
    llmDoneRef.current = false;
    consumedRef.current = 0;
  }, []);

  // Play the next ready slot in order; when drained and the LLM is done,
  // hand the floor back to the user.
  const pump = useCallback(
    (turnId: number) => {
      if (!aliveRef.current || turnId !== turnIdRef.current) return;
      if (isPlayingRef.current) return;
      const q = segQueueRef.current;
      const i = playIdxRef.current;

      if (i < q.length) {
        if (!q[i].done) return; // synthesis still running — its callback re-pumps
        playIdxRef.current = i + 1;
        const slotText = q[i].text;
        if (slotText) {
          setSpokenText((prev) => (prev ? prev + " " + slotText : slotText));
        }
        const buf = q[i].buf;
        const ctx = audioCtxRef.current;
        if (!buf || !ctx) {
          pump(turnId); // failed segment — text shown, audio skipped
          return;
        }
        isPlayingRef.current = true;
        if (stateRef.current === "thinking") setStateBoth("speaking");
        ctx.resume().catch(() => {});
        const src = ctx.createBufferSource();
        src.buffer = buf;
        let analyser = playAnalyserRef.current;
        if (!analyser || analyser.context !== ctx) {
          analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.5;
          analyser.connect(ctx.destination);
          playAnalyserRef.current = analyser;
        }
        src.connect(analyser);
        src.onended = () => {
          if (bufferSrcRef.current === src) bufferSrcRef.current = null;
          isPlayingRef.current = false;
          pump(turnId);
        };
        bufferSrcRef.current = src;
        src.start();
        return;
      }

      if (llmDoneRef.current &&
          (stateRef.current === "thinking" || stateRef.current === "speaking")) {
        startListening();
      }
    },
    [startListening]
  );

  // Synthesize one sentence chunk into its ordered slot
  const enqueueSegment = useCallback(
    (text: string, turnId: number) => {
      const slot: SpeechSlot = { text, buf: null, done: false };
      segQueueRef.current.push(slot);
      (async () => {
        try {
          const blob = await fetchTTSBlob(text);
          if (!aliveRef.current || turnId !== turnIdRef.current) {
            slot.done = true;
            return;
          }
          const ctx = audioCtxRef.current;
          if (blob && ctx) {
            const arr = await blob.arrayBuffer();
            slot.buf = await ctx.decodeAudioData(arr);
          }
        } catch { /* failed segment: buf stays null, pump skips it */ }
        slot.done = true;
        if (aliveRef.current && turnId === turnIdRef.current) pump(turnId);
      })();
    },
    [pump]
  );

  // Cut newly completed sentences out of the cleaned stream text.
  // First sentence ships alone (fastest time-to-speech); afterwards all
  // currently complete sentences merge into one chunk per harvest.
  const harvest = useCallback(
    (cleanText: string, turnId: number) => {
      if (turnId !== turnIdRef.current) return;
      if (consumedRef.current === 0) {
        let cut = nextCut(cleanText, 0);
        if (cut === -1) {
          const soft = lastSoftCut(cleanText);
          if (soft >= FIRST_SOFT_CUT_MIN_CHARS) cut = soft;
        }
        if (cut === -1) return;
        const first = cleanText.slice(0, cut).trim();
        consumedRef.current = cut;
        if (first) enqueueSegment(first, turnId);
      }
      // Every further complete sentence ships as its own segment, so
      // subtitles and audio advance sentence by sentence.
      for (;;) {
        const cut = nextCut(cleanText, consumedRef.current);
        if (cut === -1) break;
        const seg = cleanText.slice(consumedRef.current, cut).trim();
        consumedRef.current = cut;
        if (seg) enqueueSegment(seg, turnId);
      }
    },
    [enqueueSegment]
  );

  // Rigid cloud spin while thinking: ~45deg/s ccw (8s per revolution).
  // On exit, snap to the nearest equivalent angle (visually identical) and
  // transition back to 0 in step with the morph so beans never sit crooked.
  useEffect(() => {
    const spinning = vstate === "thinking" || vstate === "transcribing";
    const el = spinRef.current;
    if (!spinning || !el) return;
    el.style.transition = "none";
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      spinAngleRef.current -= dt * 45;
      if (spinRef.current) {
        spinRef.current.style.transform = `rotate(${spinAngleRef.current.toFixed(2)}deg)`;
      }
      // Radial float, driven in the same loop (lesson: JS, never CSS, for
      // anything that must actually run on iOS). Per-element periods kill
      // any perceivable beat; same-phase micro-scale makes a blob shrink as
      // it sinks and swell as it rises. Last entry is the think bubble.
      for (let i = 0; i < PETAL_FLOAT.length; i++) {
        const core = petalRefs.current[i];
        if (!core) continue;
        const p = PETAL_FLOAT[i];
        const w = Math.sin(((now / p.T) * Math.PI * 2) + p.ph);
        const s = p.sBase + p.sAmp * w;
        core.style.transform = `translate(${(p.ax * w).toFixed(1)}px, ${(p.ay * w).toFixed(1)}px) scale(${s.toFixed(3)})`;
      }
      spinRafRef.current = requestAnimationFrame(tick);
    };
    spinRafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(spinRafRef.current);
      // Hand the petal cores back to CSS (speaking's EQ loop or listening's
      // breath). The 0.55s wrapper morph masks the small snap.
      petalRefs.current.forEach((core) => {
        if (core) core.style.transform = "";
      });
      const node = spinRef.current;
      if (!node) return;
      let a = spinAngleRef.current % 360;
      if (a < -180) a += 360;
      node.style.transition = "none";
      node.style.transform = `rotate(${a.toFixed(2)}deg)`;
      void node.offsetWidth; // commit the equivalent angle without transition
      node.style.transition = "transform 0.55s cubic-bezier(0.34, 1.3, 0.64, 1)";
      node.style.transform = "rotate(0deg)";
      spinAngleRef.current = 0;
    };
  }, [vstate]);

  // Audio-reactive pills: four frequency bands of the TTS output drive the
  // four beans' heights while speaking (round at rest, stretched when loud).
  useEffect(() => {
    if (vstate !== "speaking") return;
    const analyser = playAnalyserRef.current;
    const freq = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    // ~187Hz per bin at 48kHz/fftSize 256; bands cover the voice range
    const bands: [number, number][] = [[1, 4], [5, 9], [10, 16], [17, 26]];
    const tick = () => {
      if (stateRef.current !== "speaking") return;
      if (analyser && freq) {
        analyser.getByteFrequencyData(freq);
        for (let b = 0; b < 4; b++) {
          const [s, e] = bands[b];
          let sum = 0;
          for (let i = s; i <= e; i++) sum += freq[i];
          const level = sum / (e - s + 1) / 255;
          const target = 1 + Math.min(level * 1.6, 1.2);
          const cur = eqLevelsRef.current[b];
          const next = cur + (target - cur) * 0.35;
          eqLevelsRef.current[b] = next;
          const el = pillRefs.current[b];
          if (el) el.style.transform = `scaleY(${next.toFixed(3)})`;
        }
      }
      eqRafRef.current = requestAnimationFrame(tick);
    };
    eqRafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(eqRafRef.current);
      eqLevelsRef.current = [1, 1, 1, 1];
      pillRefs.current.forEach((el) => {
        if (el) el.style.transform = "";
      });
    };
  }, [vstate]);

  // Harvest sentences as the assistant's reply streams in
  useEffect(() => {
    if (!open || !aliveRef.current || llmDoneRef.current) return;
    if (stateRef.current !== "thinking" && stateRef.current !== "speaking") return;
    if (!liveText) return;
    harvest(streamSafeClean(liveText), turnIdRef.current);
  }, [liveText, open, harvest]);

  // --- orb tap: context-sensitive control ------------------------------------------
  const handleOrbTap = () => {
    if (stateRef.current === "listening") {
      // Manual "I'm done" — also the fallback when VAD misjudges
      speechStartRef.current = speechStartRef.current || performance.now() - MIN_SPEECH_MS - 1;
      silenceStartRef.current = silenceStartRef.current || performance.now();
      finishTurn();
    } else if (stateRef.current === "speaking") {
      // Skip the rest of the reply — invalidate all in-flight segments
      abortSpeech();
      startListening();
    }
  };

  // --- open/close lifecycle -----------------------------------------------------------
  useEffect(() => {
    if (open) {
      aliveRef.current = true;
      setUserText("");
      setSpokenText("");
      setErrorMsg("");
      startListening();
    } else {
      cleanup();
    }
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const statusText =
    vstate === "listening" ? t("voiceListening")
    : vstate === "transcribing" ? t("voiceTranscribing")
    : vstate === "thinking" ? t("voiceThinking")
    : vstate === "speaking" ? t("voiceTapToSkip")
    : "";

  const hintText =
    vstate === "listening" ? t("voiceTapToFinish") : "";

  const subtitle = spokenText;

  return (
    <>
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "var(--bg-primary)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "calc(24px + env(safe-area-inset-top)) 24px calc(28px + env(safe-area-inset-bottom))",
            boxSizing: "border-box",
          }}
        >
          {/* Status */}
          <div style={{ textAlign: "center", minHeight: "24px" }}>
            <span style={{ fontSize: "14px", color: "var(--text-secondary)", letterSpacing: "0.05em" }}>
              {statusText}
            </span>
          </div>

          {/* Orb */}
          <div
            onClick={handleOrbTap}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "28px",
              cursor: "pointer",
              touchAction: "manipulation",
              flex: 1,
              justifyContent: "center",
              width: "100%",
              minHeight: 0,
            }}
          >
            <div
              ref={orbRef}
              style={{
                width: "160px",
                height: "160px",
                flexShrink: 0,
                transition: "transform 0.12s ease-out",
                willChange: "transform",
              }}
            >
              <div
                className={`voice-stage ${
                  vstate === "thinking" || vstate === "transcribing"
                    ? "voice-stage-thinking"
                    : vstate === "speaking"
                    ? "voice-stage-speaking"
                    : "voice-stage-listening"
                }`}
              >
                <div className="voice-cloud-spin" ref={spinRef}>
                  <div className="voice-blob voice-blob-1"><i className="voice-blob-core" /></div>
                  <div className="voice-blob voice-blob-2"><i className="voice-blob-core" ref={(el) => { pillRefs.current[0] = el; petalRefs.current[0] = el; }} /></div>
                  <div className="voice-blob voice-blob-3"><i className="voice-blob-core" ref={(el) => { pillRefs.current[1] = el; petalRefs.current[1] = el; }} /></div>
                  <div className="voice-blob voice-blob-4"><i className="voice-blob-core" ref={(el) => { pillRefs.current[2] = el; petalRefs.current[2] = el; }} /></div>
                  <div className="voice-blob voice-blob-5"><i className="voice-blob-core" ref={(el) => { pillRefs.current[3] = el; petalRefs.current[3] = el; }} /></div>
                  <div className="voice-blob voice-blob-6"><i className="voice-blob-core" ref={(el) => { petalRefs.current[4] = el; }} /></div>
                </div>
                <div className="voice-blob voice-think-bubble"><i className="voice-blob-core" ref={(el) => { petalRefs.current[5] = el; }} /></div>
              </div>
            </div>

            {/* Subtitles */}
            <div
              style={{
                maxWidth: "600px",
                width: "100%",
                maxHeight: "30vh",
                overflowY: "auto",
                textAlign: "center",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {userText && (
                <div style={{ fontSize: "14px", color: "var(--text-tertiary)", marginBottom: "10px", lineHeight: 1.6 }}>
                  {userText}
                </div>
              )}
              {subtitle && (
                <div style={{ fontSize: "16px", color: "var(--text-primary)", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {subtitle}
                </div>
              )}
              {errorMsg && (
                <div style={{ fontSize: "13px", color: "#e74c3c", marginTop: "10px", wordBreak: "break-all" }}>
                  {errorMsg}
                </div>
              )}
              {!userText && !subtitle && !errorMsg && hintText && (
                <div style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>{hintText}</div>
              )}
            </div>
          </div>

          {/* Hang up */}
          <button
            onClick={onClose}
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "#e74c3c",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              touchAction: "manipulation",
              flexShrink: 0,
              boxShadow: "0 4px 20px rgba(231, 76, 60, 0.35)",
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff">
              <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.29-.7.29-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.7l-2.48 2.49c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.37-2.67-1.86-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
});

export default VoiceMode;
