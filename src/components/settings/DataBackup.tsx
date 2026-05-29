"use client";
import { useLocale } from "@/lib/i18n";

import { useState } from "react";
import type { NavContext } from "@/app/settings/page";
import SettingsPageLayout, { SettingsCard, SectionLabel } from "./SettingsPageLayout";

export default function DataBackup({ nav }: { nav: NavContext }) {
  const { t } = useLocale();
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  };

  return (
    <SettingsPageLayout nav={nav} title={t("dataBackup")}>
      <SectionLabel>{ t("autoSync") }</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "12px", lineHeight: 1.5 }}>
            {t("autoSyncDesc")}
          </p>
          <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "4px" }}>
            {t("syncStatus")}：{t("synced")}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              marginTop: "12px",
              padding: "10px 20px",
              borderRadius: "10px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              fontSize: "14px",
              cursor: syncing ? "default" : "pointer",
              opacity: syncing ? 0.6 : 1,
            }}
          >
            {syncing ? t("syncing") : t("syncNow")}
          </button>
        </div>
      </SettingsCard>

      <SectionLabel>{ t("exportData") }</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "12px", lineHeight: 1.5 }}>
            {t("exportDataDesc")}
          </p>
          <button
            style={{
              padding: "10px 20px",
              borderRadius: "10px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            {t("exportAll")}
          </button>
          <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "8px" }}>
            {t("exportFormat")}
          </p>
        </div>
      </SettingsCard>
    </SettingsPageLayout>
  );
}
