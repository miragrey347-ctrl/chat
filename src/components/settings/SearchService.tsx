"use client";

import { useState, useEffect } from "react";
import type { NavContext } from "@/app/settings/page";
import SettingsPageLayout, {
  SettingsCard,
  SettingsToggleRow,
  SettingsDivider,
  SectionLabel,
} from "./SettingsPageLayout";

export default function SearchService({ nav }: { nav: NavContext }) {
  const [enabled, setEnabled] = useState(false);
  const [maxResults, setMaxResults] = useState("5");

  useEffect(() => {
    setEnabled(localStorage.getItem("search-enabled") === "true");
    setMaxResults(localStorage.getItem("search-max-results") || "5");
  }, []);

  const handleToggle = (v: boolean) => {
    setEnabled(v);
    localStorage.setItem("search-enabled", String(v));
  };

  const handleMaxResults = (v: string) => {
    setMaxResults(v);
    localStorage.setItem("search-max-results", v);
  };

  return (
    <SettingsPageLayout nav={nav} title="搜索服务">
      <SettingsCard>
        <SettingsToggleRow
          label="搜索功能"
          description="开启后聊天界面底部会出现搜索开关，发消息时可自动搜索网络获取最新信息。"
          value={enabled}
          onChange={handleToggle}
        />
        {enabled && (
          <>
            <SettingsDivider />
            <div style={{ padding: "14px 16px" }}>
              <label style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
                最大搜索结果数
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={maxResults}
                onChange={(e) => handleMaxResults(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "10px",
                  padding: "12px 14px",
                  fontSize: "15px",
                  color: "var(--text-primary)",
                  outline: "none",
                  WebkitAppearance: "none",
                }}
              />
              <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                范围 1-10，默认 5
              </p>
            </div>
          </>
        )}
      </SettingsCard>

      <SectionLabel>说明</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <p style={{ marginBottom: "8px" }}>搜索使用 DuckDuckGo，无需 API Key。</p>
          <p>如需更稳定的搜索，可在 Vercel 环境变量中添加 <span style={{ fontFamily: "monospace", color: "var(--accent)" }}>BRAVE_SEARCH_API_KEY</span>（Brave Search 免费注册即可获取）。</p>
        </div>
      </SettingsCard>
    </SettingsPageLayout>
  );
}
