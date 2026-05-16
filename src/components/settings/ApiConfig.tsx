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
      setTestResult("✅ 连接成功");
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
              {showKey ? "🙈" : "👁"}
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
