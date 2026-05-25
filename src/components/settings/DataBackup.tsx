"use client";

import { useState } from "react";
import type { NavContext } from "@/app/settings/page";
import SettingsPageLayout, { SettingsCard, SectionLabel } from "./SettingsPageLayout";

export default function DataBackup({ nav }: { nav: NavContext }) {
  const [syncing, setSyncing] = useState(false);

  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
  };

  return (
    <SettingsPageLayout nav={nav} title="数据备份与同步">
      <SectionLabel>自动同步</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "12px", lineHeight: 1.5 }}>
            所有数据存储在云端，多设备自动同步。
          </p>
          <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "4px" }}>
            同步状态：已同步
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
            {syncing ? "同步中..." : "立即同步"}
          </button>
        </div>
      </SettingsCard>

      <SectionLabel>导出数据</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "12px", lineHeight: 1.5 }}>
            导出所有对话记录、助手配置和记忆数据。
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
            导出全部数据
          </button>
          <p style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "8px" }}>
            导出格式：JSON（完整备份，可用于恢复）
          </p>
        </div>
      </SettingsCard>
    </SettingsPageLayout>
  );
}
