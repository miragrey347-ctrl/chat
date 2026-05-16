"use client";

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
  showCostEstimate: false,
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
    <SettingsPageLayout nav={nav} title="显示设置">
      <SectionLabel>聊天项显示</SectionLabel>
      <SettingsCard>
        <SettingsToggleRow
          label="显示用户和助手头像"
          value={settings.showAvatars}
          onChange={() => toggle("showAvatars")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label="显示用户和模型名称"
          value={settings.showNames}
          onChange={() => toggle("showNames")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label="显示时间戳"
          description="格式：2026-05-14 18:12"
          value={settings.showTimestamps}
          onChange={() => toggle("showTimestamps")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label="显示 Token 与上下文统计"
          value={settings.showTokenStats}
          onChange={() => toggle("showTokenStats")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label="显示费用估算"
          description="依赖 Token 统计开启"
          value={settings.showCostEstimate}
          onChange={() => toggle("showCostEstimate")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label="显示缓存状态"
          description="显示缓存命中/写入及命中率"
          value={settings.showCacheStatus}
          onChange={() => toggle("showCacheStatus")}
        />
      </SettingsCard>

      <SectionLabel>渲染设置</SectionLabel>
      <SettingsCard>
        <SettingsToggleRow
          label="思维链 Markdown 渲染"
          value={settings.thinkingMarkdown}
          onChange={() => toggle("thinkingMarkdown")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label="用户消息 Markdown 渲染"
          value={settings.userMarkdown}
          onChange={() => toggle("userMarkdown")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label="助手消息 Markdown 渲染"
          value={settings.assistantMarkdown}
          onChange={() => toggle("assistantMarkdown")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label="LaTeX 渲染"
          description="识别 $...$ 和 $$...$$ 公式"
          value={settings.latexRendering}
          onChange={() => toggle("latexRendering")}
        />
      </SettingsCard>

      <SectionLabel>行为与启动</SectionLabel>
      <SettingsCard>
        <SettingsToggleRow
          label="自动折叠思维链"
          description="开启后思维链默认折叠，点击可展开"
          value={settings.autoCollapseThinking}
          onChange={() => toggle("autoCollapseThinking")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label="显示侧边栏"
          value={settings.showSidebar}
          onChange={() => toggle("showSidebar")}
        />
        <SettingsDivider />
        <SettingsToggleRow
          label="回车键换行"
          description="开启后回车=换行，使用发送按钮发送消息。所有设备行为统一"
          value={settings.enterToNewline}
          onChange={() => toggle("enterToNewline")}
        />
      </SettingsCard>
    </SettingsPageLayout>
  );
}
