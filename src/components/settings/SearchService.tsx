"use client";

import { useState } from "react";
import type { NavContext } from "@/app/settings/page";
import SettingsPageLayout, {
  SettingsCard,
  SettingsToggleRow,
  SettingsDivider,
} from "./SettingsPageLayout";

export default function SearchService({ nav }: { nav: NavContext }) {
  const [enabled, setEnabled] = useState(false);
  const [maxResults, setMaxResults] = useState("5");

  return (
    <SettingsPageLayout nav={nav} title="搜索服务">
      <SettingsCard>
        <SettingsToggleRow
          label="搜索功能"
          description="使用 Anthropic 内置 web search"
          value={enabled}
          onChange={setEnabled}
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
                onChange={(e) => setMaxResults(e.target.value)}
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
    </SettingsPageLayout>
  );
}
