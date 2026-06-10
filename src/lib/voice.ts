// Shared voice utilities for dictation (ChatInput) and voice mode (VoiceMode)

export interface RecordingFormat {
  mimeType: string;
  format: string; // OpenRouter input_audio.format value
}

// iOS Safari records audio/mp4 (AAC); desktop Chrome/Firefox record webm.
// Prefer mp4 when available — both are accepted by OpenRouter STT.
export function pickRecordingFormat(): RecordingFormat {
  if (typeof MediaRecorder === "undefined") return { mimeType: "", format: "webm" };
  if (MediaRecorder.isTypeSupported("audio/mp4")) return { mimeType: "audio/mp4", format: "m4a" };
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus"))
    return { mimeType: "audio/webm;codecs=opus", format: "webm" };
  if (MediaRecorder.isTypeSupported("audio/webm")) return { mimeType: "audio/webm", format: "webm" };
  return { mimeType: "", format: "webm" };
}

// Blob → raw base64 (no data URI prefix)
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const DEFAULT_STT_MODEL = "openai/gpt-4o-mini-transcribe";
export const DEFAULT_OR_TTS_MODEL = "openai/gpt-4o-mini-tts-2025-12-15";

// Transcribe a recorded audio blob via /api/stt (OpenRouter).
// Network-layer failures (Safari "Load failed") and 5xx are retried once —
// they're usually transient (VPN hiccup, cold start, connection reset).
export async function transcribe(blob: Blob, format: string): Promise<string> {
  const audio = await blobToBase64(blob);
  const model = localStorage.getItem("stt-model") || DEFAULT_STT_MODEL;
  const language = localStorage.getItem("stt-language") || "";
  const sizeKB = Math.max(1, Math.round(blob.size / 1024));

  const attempt = async (): Promise<string> => {
    let res: Response;
    try {
      res = await fetch("/api/stt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio,
          format,
          model,
          ...(language ? { language } : {}),
        }),
      });
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      const err = new Error(`${reason} — ${sizeKB}KB ${format}, request never reached server`);
      (err as Error & { retryable?: boolean }).retryable = true;
      throw err;
    }

    if (!res.ok) {
      let msg = `STT ${res.status}`;
      try {
        const data = await res.json();
        if (data.error) msg = data.error;
      } catch { /* keep default */ }
      const err = new Error(msg);
      (err as Error & { retryable?: boolean }).retryable = res.status >= 500;
      throw err;
    }

    const data = await res.json();
    return (data.text || "").trim();
  };

  try {
    return await attempt();
  } catch (e) {
    if ((e as Error & { retryable?: boolean }).retryable) {
      await new Promise((r) => setTimeout(r, 600));
      return await attempt();
    }
    throw e;
  }
}

export interface TTSConfig {
  service: "openrouter" | "openai" | "elevenlabs";
  apiKey: string;
  model: string;
  voice: string;
}

// Read TTS settings from localStorage. Returns null only when the chosen
// service requires a user key that hasn't been provided.
export function getTTSConfig(): TTSConfig | null {
  const service = (localStorage.getItem("tts-service") || "openrouter") as TTSConfig["service"];

  if (service === "openrouter") {
    return {
      service,
      apiKey: "",
      model: localStorage.getItem("tts-or-model") || DEFAULT_OR_TTS_MODEL,
      voice: localStorage.getItem("tts-or-voice") || "nova",
    };
  }
  if (service === "openai") {
    const apiKey = localStorage.getItem("tts-oai-key") || "";
    if (!apiKey) return null;
    return {
      service,
      apiKey,
      model: localStorage.getItem("tts-oai-model") || "tts-1",
      voice: localStorage.getItem("tts-oai-voice") || "nova",
    };
  }
  const apiKey = localStorage.getItem("tts-el-key") || "";
  const voice = localStorage.getItem("tts-el-voice") || "";
  if (!apiKey || !voice) return null;
  return {
    service: "elevenlabs",
    apiKey,
    model: localStorage.getItem("tts-el-model") || "eleven_multilingual_v2",
    voice,
  };
}

// Strip markdown / code / embedded HTML comments (citation cards) for speech
export function stripForSpeech(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*`_~>|]/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

// Fetch synthesized speech for text. Returns null if TTS isn't configured
// or there is nothing to speak. Throws on API errors.
export async function fetchTTSBlob(text: string): Promise<Blob | null> {
  const clean = stripForSpeech(text);
  if (!clean) return null;
  const config = getTTSConfig();
  if (!config) return null;

  const res = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service: config.service,
      apiKey: config.apiKey,
      text: clean,
      model: config.model,
      voice: config.voice,
    }),
  });

  if (!res.ok) {
    let msg = `TTS ${res.status}`;
    try {
      const data = await res.json();
      if (data.error) msg = data.error;
    } catch { /* keep default */ }
    throw new Error(msg);
  }

  return await res.blob();
}
