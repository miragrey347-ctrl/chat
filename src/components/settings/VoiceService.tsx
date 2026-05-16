"use client";

import { useState } from "react";
import type { NavContext } from "@/app/settings/page";
import SettingsPageLayout, {
  SettingsCard,
  SettingsDivider,
  SectionLabel,
} from "./SettingsPageLayout";

const selectStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border-color)",
  borderRadius: "10px",
  padding: "12px 36px 12px 14px",
  fontSize: "15px",
  color: "var(--text-primary)",
  WebkitAppearance: "none",
  appearance: "none",
  outline: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237a7068'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 14px center",
};

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
  fontFamily: "monospace",
  WebkitAppearance: "none",
};

export default function VoiceService({ nav }: { nav: NavContext }) {
  const [defaultTTS, setDefaultTTS] = useState("openai");
  const [openaiModel, setOpenaiModel] = useState("tts-1");
  const [openaiVoice, setOpenaiVoice] = useState("alloy");

  return (
    <SettingsPageLayout nav={nav} title="语音服务">
      <SectionLabel>默认 TTS 服务</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          <select value={defaultTTS} onChange={(e) => setDefaultTTS(e.target.value)} style={selectStyle}>
            <option value="openai">OpenAI TTS</option>
            <option value="elevenlabs">ElevenLabs</option>
          </select>
        </div>
      </SettingsCard>

      <SectionLabel>OpenAI TTS</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          <label style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
            API Key
          </label>
          <input type="password" placeholder="sk-..." style={inputStyle} />
        </div>
        <SettingsDivider />
        <div style={{ padding: "14px 16px" }}>
          <label style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
            模型
          </label>
          <select value={openaiModel} onChange={(e) => setOpenaiModel(e.target.value)} style={selectStyle}>
            <option value="tts-1">tts-1</option>
            <option value="tts-1-hd">tts-1-hd</option>
          </select>
        </div>
        <SettingsDivider />
        <div style={{ padding: "14px 16px" }}>
          <label style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
            声音
          </label>
          <select value={openaiVoice} onChange={(e) => setOpenaiVoice(e.target.value)} style={selectStyle}>
            {["alloy", "echo", "fable", "onyx", "nova", "shimmer"].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </div>
      </SettingsCard>

      <SectionLabel>ElevenLabs</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          <label style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
            API Key
          </label>
          <input type="password" placeholder="输入 ElevenLabs API Key" style={inputStyle} />
        </div>
        <SettingsDivider />
        <div style={{ padding: "14px 16px" }}>
          <label style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
            声音
          </label>
          <select style={selectStyle}>
            <option value="rachel">Rachel</option>
          </select>
          <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>
            从 ElevenLabs 声音库拉取列表
          </p>
        </div>
      </SettingsCard>
    </SettingsPageLayout>
  );
}
