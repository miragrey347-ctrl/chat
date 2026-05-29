"use client";
import { useLocale } from "@/lib/i18n";

import { useState, useEffect } from "react";
import type { NavContext } from "@/app/settings/page";
import SettingsPageLayout, {
  SettingsCard,
  SettingsToggleRow,
  SettingsDivider,
  SectionLabel,
} from "./SettingsPageLayout";

export default function SearchService({ nav }: { nav: NavContext }) {
  const { t } = useLocale();
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
    <SettingsPageLayout nav={nav} title={t("searchService")}>
      <SettingsCard>
        <SettingsToggleRow
          label={t("searchFeature")}
          description={t("searchFeatureDesc")}
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
                {t("searchRange")}
              </p>
            </div>
          </>
        )}
      </SettingsCard>

      <SectionLabel>{ t("searchNote") }</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px", fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.6 }}>
          <p style={{ marginBottom: "8px" }}>{t("searchApiNote")}</p>
          <p style={{ marginBottom: "6px" }}>• <span style={{ fontFamily: "monospace", color: "var(--accent)" }}>SERPER_API_KEY</span>（推荐，serper.dev 免费 2500 次/月）</p>
          <p>• <span style={{ fontFamily: "monospace", color: "var(--accent)" }}>BRAVE_SEARCH_API_KEY</span>（api.search.brave.com 免费 2000 次/月）</p>
        </div>
      </SettingsCard>
    </SettingsPageLayout>
  );
}
