"use client";
import { useLocale } from "@/lib/i18n";

import { useState, useEffect } from "react";
import type { NavContext } from "@/app/settings/page";
import { notifyDisplaySettingsChanged } from "@/lib/useDisplaySettings";
import SettingsPageLayout, {
  SettingsCard,
  SettingsToggleRow,
  SettingsDivider,
  SectionLabel,
} from "./SettingsPageLayout";

// Load/save display settings from localStorage
function loadDisplaySettings(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem("display-settings") || "{}");
  } catch {
    return {};
  }
}

function saveDisplaySettings(settings: Record<string, boolean>) {
  localStorage.setItem("display-settings", JSON.stringify(settings));
}

const DEFAULTS: Record<string, boolean> = {
  showAvatars: false,
  showNames: false,
  showTimestamps: true,
  showTokenStats: true,
  showCacheStatus: false,
  thinkingMarkdown: false,
  userMarkdown: false,
  assistantMarkdown: true,
  latexRendering: true,
  autoCollapseThinking: true,
  showSidebar: true,
  enterToNewline: true,
};

export default function DisplaySettings({ nav }: { nav: NavContext }) {
  const { t } = useLocale();
  const [settings, setSettings] = useState<Record<string, boolean>>(DEFAULTS);

  useEffect(() => {
    const saved = loadDisplaySettings();
    setSettings({ ...DEFAULTS, ...saved });
  }, []);

  const toggle = (key: string) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    saveDisplaySettings(updated);
    notifyDisplaySettingsChanged();
  };

  return (
    <SettingsPageLayout nav={nav} title={t("displaySettings")}>
      <SectionLabel>{ t("chatDisplay") }</SectionLabel>
      <SettingsCard>
        <SettingsToggleRow
          label={t("showAvatar")}
          value={settings.showAvatars}
          onChange={() => toggle("showAvatars")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label={t("showNames")}
          value={settings.showNames}
          onChange={() => toggle("showNames")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label={t("showTimestamps")}
          description={t("timestampFormat")}
          value={settings.showTimestamps}
          onChange={() => toggle("showTimestamps")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label={t("showTokenStats")}
          value={settings.showTokenStats}
          onChange={() => toggle("showTokenStats")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label={t("showCacheStatus")}
          description={t("cacheStatusDesc")}
          value={settings.showCacheStatus}
          onChange={() => toggle("showCacheStatus")}
        />
      </SettingsCard>

      <SectionLabel>{ t("renderSettings") }</SectionLabel>
      <SettingsCard>
        <SettingsToggleRow
          label={t("thinkingMarkdown")}
          value={settings.thinkingMarkdown}
          onChange={() => toggle("thinkingMarkdown")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label={t("userMarkdown")}
          value={settings.userMarkdown}
          onChange={() => toggle("userMarkdown")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label={t("assistantMarkdown")}
          value={settings.assistantMarkdown}
          onChange={() => toggle("assistantMarkdown")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label={t("latexRendering")}
          description={t("latexDesc")}
          value={settings.latexRendering}
          onChange={() => toggle("latexRendering")}
        />
      </SettingsCard>

      <SectionLabel>{ t("behaviorSettings") }</SectionLabel>
      <SettingsCard>
        <SettingsToggleRow
          label={t("autoCollapseThinking")}
          description={t("autoCollapseDesc")}
          value={settings.autoCollapseThinking}
          onChange={() => toggle("autoCollapseThinking")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label={t("showSidebarLabel")}
          value={settings.showSidebar}
          onChange={() => toggle("showSidebar")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label={t("enterNewline")}
          description={t("enterNewlineDesc")}
          value={settings.enterToNewline}
          onChange={() => toggle("enterToNewline")}
        />
      </SettingsCard>
    </SettingsPageLayout>
  );
}
