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
  { id: "openai/tts-1", label: "OpenAI TTS-1" },
  { id: "openai/tts-1-hd", label: "OpenAI TTS-1 HD" },
  { id: "openai/gpt-4o-mini-tts", label: "GPT-4o Mini TTS" },
  { id: "google/gemini-2.5-flash-tts", label: "Gemini Flash TTS" },
  { id: "mistralai/voxtral-mini-tts-2603", label: "Voxtral Mini TTS" },
  { id: "x-ai/grok-voice-tts-1.0", label: "Grok Voice TTS" },
];

const VOICES: Record<string, string[]> = {
  "openai/tts-1": ["alloy", "ash", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"],
  "openai/tts-1-hd": ["alloy", "ash", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"],
  "openai/gpt-4o-mini-tts": ["alloy", "ash", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"],
  "x-ai/grok-voice-tts-1.0": ["Eve", "Ara", "Rex", "Sal", "Leo"],
};

export default function VoiceService({ nav }: { nav: NavContext }) {
  const { t } = useLocale();
  const [model, setModel] = useState("openai/tts-1");
  const [voice, setVoice] = useState("alloy");
  const [previewing, setPreviewing] = useState(false);
  const [saved, setSaved] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setModel(localStorage.getItem("tts-model") || "openai/tts-1");
    setVoice(localStorage.getItem("tts-voice") || "alloy");
  }, []);

  const save = (m: string, v: string) => {
    localStorage.setItem("tts-model", m);
    localStorage.setItem("tts-voice", v);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    const voices = VOICES[newModel];
    const newVoice = voices ? voices[0] : voice;
    setVoice(newVoice);
    save(newModel, newVoice);
  };

  const handleVoiceChange = (newVoice: string) => {
    setVoice(newVoice);
    save(model, newVoice);
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
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
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
      };
      await audio.play();
    } catch {
      setPreviewing(false);
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
        {saved && (
          <span style={{ fontSize: "13px", color: "var(--accent-color)" }}>
            ✓ {t("ttsSaved")}
          </span>
        )}
      </div>
    </SettingsPageLayout>
  );
}
