"use client";

import { useState } from "react";
import type { NavContext } from "@/app/settings/page";
import SettingsPageLayout, {
  SettingsCard,
  SettingsToggleRow,
  SectionLabel,
} from "./SettingsPageLayout";

export default function ApiConfig({ nav }: { nav: NavContext }) {
  const [apiKey, setApiKey] = useState("••••••••••••••••••••");
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [cachingEnabled, setCachingEnabled] = useState(true);

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    // Simulate test
    setTimeout(() => {
      setTestResult("连接成功");
      setTesting(false);
    }, 1500);
  };

  return (
    <SettingsPageLayout nav={nav} title="API 配置">
      <SectionLabel>OpenRouter</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          <label style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
            API Key
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              style={{
                width: "100%",
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                padding: "12px 44px 12px 14px",
                fontSize: "15px",
                color: "var(--text-primary)",
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "monospace",
                WebkitAppearance: "none",
              }}
            />
            <button
              onClick={() => setShowKey(!showKey)}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              {showKey ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              onClick={testConnection}
              disabled={testing}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                fontSize: "14px",
                cursor: testing ? "default" : "pointer",
                opacity: testing ? 0.6 : 1,
              }}
            >
              {testing ? "测试中..." : "测试连接"}
            </button>
            {testResult && (
              <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                {testResult}
              </span>
            )}
          </div>
        </div>
      </SettingsCard>

      <SectionLabel>Prompt Caching</SectionLabel>
      <SettingsCard>
        <SettingsToggleRow
          label="启用 Prompt Caching"
          description="对 Anthropic 模型自动启用缓存，减少重复 token 消耗"
          value={cachingEnabled}
          onChange={setCachingEnabled}
        />
      </SettingsCard>
    </SettingsPageLayout>
  );
}
