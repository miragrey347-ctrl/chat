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
import { pickRecordingFormat, transcribe, fetchTTSBlob } from "@/lib/voice";

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

const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==";

const VoiceMode = forwardRef<VoiceModeHandle, VoiceModeProps>(function VoiceMode(
  { open, onClose, sendMessage, liveText },
  ref
) {
  const { t } = useLocale();
  const [vstate, setVState] = useState<VState>("idle");
  const [userText, setUserText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const stateRef = useRef<VState>("idle");
  const aliveRef = useRef(false);
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rafRef = useRef<number>(0);
  const speechStartRef = useRef(0);   // timestamp when speech first detected
  const silenceStartRef = useRef(0);  // timestamp when current silence began
  const orbRef = useRef<HTMLDivElement | null>(null);
  const playUrlRef = useRef<string>("");

  // Bridge to the latest sendMessage — recorder.onstop callbacks live across
  // renders, so a direct closure would capture stale chat state (e.g. the
  // conversation id from before the first turn created it).
  const sendMessageRef = useRef(sendMessage);
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  }, [sendMessage]);

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
        audioCtxRef.current?.resume().catch(() => {});
        const p = playerRef.current;
        if (p) {
          p.muted = true;
          p.src = SILENT_WAV;
          const pr = p.play();
          if (pr) {
            pr.then(() => {
              p.pause();
              p.currentTime = 0;
              p.muted = false;
            }).catch(() => {
              p.muted = false;
            });
          }
        }
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
    const p = playerRef.current;
    if (p) {
      p.onended = null;
      p.onerror = null;
      try { p.pause(); } catch { /* noop */ }
      p.removeAttribute("src");
    }
    if (playUrlRef.current) {
      URL.revokeObjectURL(playUrlRef.current);
      playUrlRef.current = "";
    }
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
      setReplyText("");
      setStateBoth("thinking");

      const reply = await sendMessageRef.current(text);
      if (!aliveRef.current) return;
      setReplyText(reply || "");
      await speak(reply || "");
    } catch (err) {
      if (!aliveRef.current) return;
      setStateBoth("idle");
      setErrorMsg(err instanceof Error ? err.message : String(err));
      setTimeout(() => {
        if (aliveRef.current) startListening();
      }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, startListening]);

  // --- TTS playback --------------------------------------------------------------
  const speak = useCallback(
    async (text: string) => {
      const player = playerRef.current;
      let blob: Blob | null = null;
      try {
        blob = await fetchTTSBlob(text);
      } catch (err) {
        if (!aliveRef.current) return;
        setErrorMsg(err instanceof Error ? err.message : String(err));
      }
      if (!aliveRef.current) return;
      if (!blob || !player) {
        // Nothing to speak / TTS unconfigured — continue the loop
        startListening();
        return;
      }

      setStateBoth("speaking");
      if (playUrlRef.current) URL.revokeObjectURL(playUrlRef.current);
      const url = URL.createObjectURL(blob);
      playUrlRef.current = url;

      const advance = () => {
        player.onended = null;
        player.onerror = null;
        if (playUrlRef.current) {
          URL.revokeObjectURL(playUrlRef.current);
          playUrlRef.current = "";
        }
        if (aliveRef.current) startListening();
      };
      player.onended = advance;
      player.onerror = advance;
      player.src = url;
      try {
        await player.play();
      } catch {
        // Autoplay rejected (shouldn't happen after unlock) — keep the loop alive
        advance();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [startListening]
  );

  // --- orb tap: context-sensitive control ------------------------------------------
  const handleOrbTap = () => {
    if (stateRef.current === "listening") {
      // Manual "I'm done" — also the fallback when VAD misjudges
      speechStartRef.current = speechStartRef.current || performance.now() - MIN_SPEECH_MS - 1;
      silenceStartRef.current = silenceStartRef.current || performance.now();
      finishTurn();
    } else if (stateRef.current === "speaking") {
      // Skip playback, jump straight to the next listening turn
      const player = playerRef.current;
      if (player) {
        player.onended = null;
        player.onerror = null;
        try { player.pause(); } catch { /* noop */ }
      }
      if (playUrlRef.current) {
        URL.revokeObjectURL(playUrlRef.current);
        playUrlRef.current = "";
      }
      startListening();
    }
  };

  // --- open/close lifecycle -----------------------------------------------------------
  useEffect(() => {
    if (open) {
      aliveRef.current = true;
      setUserText("");
      setReplyText("");
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

  const subtitle =
    vstate === "thinking" && liveText ? liveText : replyText;

  return (
    <>
      {/* Always mounted — unlocked once by the opening tap, reused all session */}
      <audio ref={playerRef} playsInline style={{ display: "none" }} />

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
                borderRadius: "50%",
                flexShrink: 0,
                transition: "transform 0.12s ease-out",
                willChange: "transform",
              }}
            >
              <div
                className={
                  vstate === "thinking" || vstate === "transcribing"
                    ? "voice-orb voice-orb-thinking"
                    : vstate === "speaking"
                    ? "voice-orb voice-orb-speaking"
                    : "voice-orb voice-orb-listening"
                }
              />
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
