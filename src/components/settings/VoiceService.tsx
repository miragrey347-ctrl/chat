"use client";
import { useLocale } from "@/lib/i18n";
import { useState, useEffect, useRef } from "react";
import type { NavContext } from "@/app/settings/page";
import SettingsPageLayout, {
  SettingsCard,
  SettingsDivider,
  SectionLabel,
} from "./SettingsPageLayout";

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border-color)",
  borderRadius: "10px",
  padding: "12px 14px",
  fontSize: "15px",
  color: "var(--text-primary)",
  outline: "none",
  boxSizing: "border-box",
  WebkitAppearance: "none",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  fontFamily: "monospace",
  paddingRight: "36px",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237a7068'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 14px center",
  appearance: "none",
};

const MODELS = [
  { id: "openai/gpt-4o-mini-tts-2025-12-15", label: "GPT-4o Mini TTS" },
  { id: "mistralai/voxtral-mini-tts-2603", label: "Voxtral Mini TTS" },
  { id: "x-ai/grok-voice-tts-1.0", label: "Grok Voice TTS" },
];

const VOICES: Record<string, string[]> = {
  "openai/gpt-4o-mini-tts-2025-12-15": ["alloy", "ash", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"],
  "x-ai/grok-voice-tts-1.0": ["Eve", "Ara", "Rex", "Sal", "Leo"],
};

const DEFAULT_MODEL = "x-ai/grok-voice-tts-1.0";
const DEFAULT_VOICE = "Sal";

export default function VoiceService({ nav }: { nav: NavContext }) {
  const { t } = useLocale();
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [voice, setVoice] = useState(DEFAULT_VOICE);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const validIds = MODELS.map((m) => m.id);
    let savedModel = localStorage.getItem("tts-model") || DEFAULT_MODEL;
    const savedVoice = localStorage.getItem("tts-voice") || DEFAULT_VOICE;
    // Migrate: if stored model ID is invalid, reset to default
    if (!validIds.includes(savedModel)) {
      savedModel = DEFAULT_MODEL;
      localStorage.setItem("tts-model", DEFAULT_MODEL);
      localStorage.setItem("tts-voice", DEFAULT_VOICE);
    }
    setModel(savedModel);
    setVoice(!validIds.includes(localStorage.getItem("tts-model") || "") ? DEFAULT_VOICE : savedVoice);
    // Ensure defaults are persisted
    if (!localStorage.getItem("tts-model")) localStorage.setItem("tts-model", DEFAULT_MODEL);
    if (!localStorage.getItem("tts-voice")) localStorage.setItem("tts-voice", DEFAULT_VOICE);
  }, []);

  const save = (m: string, v: string) => {
    localStorage.setItem("tts-model", m);
    localStorage.setItem("tts-voice", v);
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    const voices = VOICES[newModel];
    const newVoice = voices ? voices[0] : voice;
    setVoice(newVoice);
    save(newModel, newVoice);
    setError("");
  };

  const handleVoiceChange = (newVoice: string) => {
    setVoice(newVoice);
    save(model, newVoice);
    setError("");
  };

  const handlePreview = async () => {
    if (previewing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
      setPreviewing(false);
      return;
    }
    setPreviewing(true);
    setError("");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: t("ttsPreviewText"),
          model,
          voice,
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(errBody || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      if (blob.size === 0) throw new Error("Empty audio response");
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setPreviewing(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        setPreviewing(false);
        setError("Audio playback failed");
      };
      await audio.play();
    } catch (e) {
      setPreviewing(false);
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
    };
  }, []);

  const voiceList = VOICES[model];

  return (
    <SettingsPageLayout nav={nav} title={t("voiceService")}>
      <SectionLabel>{t("modelLabel")}</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          <select
            value={model}
            onChange={(e) => handleModelChange(e.target.value)}
            style={selectStyle}
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "6px" }}>
            OpenRouter /audio/speech
          </p>
        </div>
      </SettingsCard>

      <SectionLabel>{t("voiceLabel")}</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          {voiceList ? (
            <select
              value={voice}
              onChange={(e) => handleVoiceChange(e.target.value)}
              style={selectStyle}
            >
              {voiceList.map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          ) : (
            <input
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              onBlur={() => save(model, voice)}
              placeholder="voice name"
              style={{ ...inputStyle, fontFamily: "monospace" }}
            />
          )}
        </div>
      </SettingsCard>

      <div style={{ padding: "16px 0", display: "flex", gap: "10px", alignItems: "center" }}>
        <button
          onClick={handlePreview}
          style={{
            background: previewing ? "var(--bg-hover)" : "var(--accent-color)",
            color: previewing ? "var(--text-primary)" : "#fff",
            border: "none",
            borderRadius: "10px",
            padding: "12px 24px",
            fontSize: "15px",
            fontWeight: 500,
            cursor: "pointer",
            WebkitAppearance: "none",
          }}
        >
          {previewing ? "■ Stop" : `▶ ${t("ttsPreview")}`}
        </button>
      </div>

      {error && (
        <div style={{
          padding: "12px 16px",
          background: "rgba(220,60,60,0.1)",
          borderRadius: "10px",
          fontSize: "13px",
          color: "#dc3c3c",
          wordBreak: "break-all",
        }}>
          {error}
        </div>
      )}
    </SettingsPageLayout>
  );
}
