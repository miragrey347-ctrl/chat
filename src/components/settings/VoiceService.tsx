"use client";
import { useLocale } from "@/lib/i18n";
import { useState, useEffect, useRef } from "react";
import type { NavContext } from "@/app/settings/page";
import SettingsPageLayout, {
  SettingsCard,
  SettingsDivider,
  SectionLabel,
} from "./SettingsPageLayout";
import { DEFAULT_OR_TTS_MODEL, DEFAULT_STT_MODEL } from "@/lib/voice";

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
  paddingRight: "36px",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237a7068'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 14px center",
  appearance: "none",
};

const OPENAI_VOICES = ["alloy", "ash", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer"];
const OR_VOICES = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse"];

const STT_MODELS = [
  { value: "openai/gpt-4o-mini-transcribe", label: "GPT-4o Mini Transcribe" },
  { value: "openai/gpt-4o-transcribe", label: "GPT-4o Transcribe" },
  { value: "openai/whisper-1", label: "Whisper 1" },
  { value: "openai/whisper-large-v3-turbo", label: "Whisper Large v3 Turbo (Groq)" },
  { value: "google/chirp-3", label: "Google Chirp 3" },
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: "14px 16px" }}>
      <label style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function VoiceService({ nav }: { nav: NavContext }) {
  const { t } = useLocale();
  const [service, setService] = useState("openrouter");
  const [orModel, setOrModel] = useState(DEFAULT_OR_TTS_MODEL);
  const [orVoice, setOrVoice] = useState("nova");
  const [oaiKey, setOaiKey] = useState("");
  const [oaiModel, setOaiModel] = useState("tts-1");
  const [oaiVoice, setOaiVoice] = useState("nova");
  const [elKey, setElKey] = useState("");
  const [elModel, setElModel] = useState("eleven_multilingual_v2");
  const [elVoice, setElVoice] = useState("");
  const [sttModel, setSttModel] = useState(DEFAULT_STT_MODEL);
  const [sttLanguage, setSttLanguage] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setService(localStorage.getItem("tts-service") || "openrouter");
    setOrModel(localStorage.getItem("tts-or-model") || DEFAULT_OR_TTS_MODEL);
    setOrVoice(localStorage.getItem("tts-or-voice") || "nova");
    setOaiKey(localStorage.getItem("tts-oai-key") || "");
    setOaiModel(localStorage.getItem("tts-oai-model") || "tts-1");
    setOaiVoice(localStorage.getItem("tts-oai-voice") || "nova");
    setElKey(localStorage.getItem("tts-el-key") || "");
    setElModel(localStorage.getItem("tts-el-model") || "eleven_v3");
    setElVoice(localStorage.getItem("tts-el-voice") || "");
    setSttModel(localStorage.getItem("stt-model") || DEFAULT_STT_MODEL);
    setSttLanguage(localStorage.getItem("stt-language") || "");
  }, []);

  const save = (key: string, val: string) => {
    localStorage.setItem(key, val);
  };

  const handlePreview = async () => {
    if (previewing && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
      setPreviewing(false);
      return;
    }
    if (service === "openai" && !oaiKey) { setError("请先填写 API Key"); return; }
    if (service === "elevenlabs") {
      if (!elKey) { setError("请先填写 API Key"); return; }
      if (!elVoice) { setError("请填写 Voice ID"); return; }
    }

    const apiKey = service === "openai" ? oaiKey : service === "elevenlabs" ? elKey : "";
    const model = service === "openai" ? oaiModel : service === "elevenlabs" ? elModel : orModel;
    const voice = service === "openai" ? oaiVoice : service === "elevenlabs" ? elVoice : orVoice;

    setPreviewing(true);
    setError("");
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service,
          apiKey,
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
      if (blob.size === 0) throw new Error("Empty audio");
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; setPreviewing(false); };
      audio.onerror = () => { URL.revokeObjectURL(url); audioRef.current = null; setPreviewing(false); setError("Playback failed"); };
      await audio.play();
    } catch (e) {
      setPreviewing(false);
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  };

  useEffect(() => { return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = ""; } }; }, []);

  return (
    <SettingsPageLayout nav={nav} title={t("voiceService")}>
      <SectionLabel>{t("defaultTts")}</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          <select
            value={service}
            onChange={(e) => { setService(e.target.value); save("tts-service", e.target.value); setError(""); }}
            style={selectStyle}
          >
            <option value="openrouter">OpenRouter</option>
            <option value="openai">OpenAI TTS</option>
            <option value="elevenlabs">ElevenLabs</option>
          </select>
        </div>
      </SettingsCard>

      {service === "openrouter" && (
        <>
          <SectionLabel>OpenRouter TTS</SectionLabel>
          <SettingsCard>
            <div style={{ padding: "12px 16px 0" }}>
              <p style={{ fontSize: "12px", color: "var(--text-tertiary)", margin: 0 }}>
                {t("orTtsHint")}
              </p>
            </div>
            <Field label={t("modelLabel")}>
              <input
                value={orModel}
                onChange={(e) => { setOrModel(e.target.value); save("tts-or-model", e.target.value); }}
                placeholder={DEFAULT_OR_TTS_MODEL}
                style={{ ...inputStyle, fontFamily: "monospace", fontSize: "13px" }}
              />
            </Field>
            <SettingsDivider />
            <Field label={t("voiceLabel")}>
              <select
                value={orVoice}
                onChange={(e) => { setOrVoice(e.target.value); save("tts-or-voice", e.target.value); }}
                style={selectStyle}
              >
                {OR_VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
          </SettingsCard>
        </>
      )}

      {service === "openai" && (
        <>
          <SectionLabel>OpenAI TTS</SectionLabel>
          <SettingsCard>
            <Field label="API Key">
              <input
                type="password"
                value={oaiKey}
                onChange={(e) => { setOaiKey(e.target.value); save("tts-oai-key", e.target.value); }}
                placeholder="sk-..."
                style={inputStyle}
              />
            </Field>
            <SettingsDivider />
            <Field label={t("modelLabel")}>
              <select
                value={oaiModel}
                onChange={(e) => { setOaiModel(e.target.value); save("tts-oai-model", e.target.value); }}
                style={selectStyle}
              >
                <option value="tts-1">TTS-1</option>
                <option value="tts-1-hd">TTS-1 HD</option>
                <option value="gpt-4o-mini-tts">GPT-4o Mini TTS</option>
              </select>
            </Field>
            <SettingsDivider />
            <Field label={t("voiceLabel")}>
              <select
                value={oaiVoice}
                onChange={(e) => { setOaiVoice(e.target.value); save("tts-oai-voice", e.target.value); }}
                style={selectStyle}
              >
                {OPENAI_VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </Field>
          </SettingsCard>
        </>
      )}

      {service === "elevenlabs" && (
        <>
          <SectionLabel>ElevenLabs</SectionLabel>
          <SettingsCard>
            <Field label="API Key">
              <input
                type="password"
                value={elKey}
                onChange={(e) => { setElKey(e.target.value); save("tts-el-key", e.target.value); }}
                placeholder="xi-..."
                style={inputStyle}
              />
            </Field>
            <SettingsDivider />
            <Field label={t("modelLabel")}>
              <select
                value={elModel}
                onChange={(e) => { setElModel(e.target.value); save("tts-el-model", e.target.value); }}
                style={selectStyle}
              >
                <option value="eleven_v3">Eleven v3 (70+ 语言)</option>
                <option value="eleven_multilingual_v2">Multilingual v2 (29 语言)</option>
                <option value="eleven_flash_v2_5">Flash v2.5 (低延迟)</option>
              </select>
            </Field>
            <SettingsDivider />
            <Field label="Voice ID">
              <input
                value={elVoice}
                onChange={(e) => { setElVoice(e.target.value); save("tts-el-voice", e.target.value); }}
                placeholder="Voice ID"
                style={{ ...inputStyle, fontFamily: "monospace" }}
              />
              <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                elevenlabs.io → Voices → 复制 Voice ID
              </p>
            </Field>
          </SettingsCard>
        </>
      )}

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

      <SectionLabel>{t("sttSection")}</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "12px 16px 0" }}>
          <p style={{ fontSize: "12px", color: "var(--text-tertiary)", margin: 0 }}>
            {t("sttHint")}
          </p>
        </div>
        <Field label={t("modelLabel")}>
          <select
            value={sttModel}
            onChange={(e) => { setSttModel(e.target.value); save("stt-model", e.target.value); }}
            style={selectStyle}
          >
            {STT_MODELS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </Field>
        <SettingsDivider />
        <Field label={t("sttLanguage")}>
          <select
            value={sttLanguage}
            onChange={(e) => { setSttLanguage(e.target.value); save("stt-language", e.target.value); }}
            style={selectStyle}
          >
            <option value="">{t("sttLangAuto")}</option>
            <option value="zh">中文</option>
            <option value="en">English</option>
            <option value="ja">日本語</option>
          </select>
        </Field>
      </SettingsCard>

      {error && (
        <div style={{
          padding: "12px 16px",
          background: "rgba(220,60,60,0.1)",
          borderRadius: "10px",
          fontSize: "13px",
          color: "#dc3c3c",
          wordBreak: "break-all",
          marginTop: "8px",
        }}>
          {error}
        </div>
      )}
    </SettingsPageLayout>
  );
}
