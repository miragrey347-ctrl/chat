"use client";

import { useState, useEffect, type ReactNode } from "react";
import type { NavContext } from "@/app/settings/page";

interface SettingsHomeProps {
  nav: NavContext;
}

/* ── Inline SVG icons (20×20, strokeWidth 1.5, currentColor) ── */
const I = {
  palette: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a10 10 0 0 1 0 20"/>
      <circle cx="8" cy="10" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="7.5" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="10" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="9" cy="14.5" r="1.2" fill="currentColor" stroke="none"/>
    </svg>
  ),
  display: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  ),
  sparkles: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>
      <path d="M18 14l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9z"/>
    </svg>
  ),
  cube: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12"/>
    </svg>
  ),
  key: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  ),
  search: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <path d="M21 21l-4.35-4.35"/>
    </svg>
  ),
  volume: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  ),
  database: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3"/>
      <path d="M21 12c0 1.66-4.03 3-9 3s-9-1.34-9-3"/>
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5"/>
    </svg>
  ),
  globe: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  ),
  cloud: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/>
    </svg>
  ),
};

// Reusable setting row component
function SettingRow({
  icon,
  label,
  value,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        height: "56px",
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--text-primary)",
        fontSize: "15px",
        textAlign: "left",
        WebkitTapHighlightColor: "transparent",
        touchAction: "manipulation",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ width: "24px", height: "24px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", flexShrink: 0 }}>{icon}</span>
        <span>{label}</span>
      </span>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "var(--text-tertiary)",
          fontSize: "14px",
        }}
      >
        {value && <span>{value}</span>}
        <span style={{ fontSize: "16px", opacity: 0.5 }}>›</span>
      </span>
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: "1px",
        background: "var(--border-subtle)",
        marginLeft: "52px",
      }}
    />
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div
      style={{
        fontSize: "13px",
        color: "var(--text-tertiary)",
        padding: "24px 16px 8px",
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        margin: "0 16px",
        borderRadius: "12px",
        background: "var(--bg-secondary)",
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

export default function SettingsHome({ nav }: SettingsHomeProps) {
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("深色");
  const [currentLang, setCurrentLang] = useState("简体中文");

  const themeMap: Record<string, string> = { "深色": "dark", "浅色": "light", "跟随系统": "system" };
  const themeMapReverse: Record<string, string> = { dark: "深色", light: "浅色", system: "跟随系统" };

  useEffect(() => {
    const saved = localStorage.getItem("color-mode") || "dark";
    setCurrentTheme(themeMapReverse[saved] || "深色");
  }, []);

  const applyTheme = (label: string) => {
    const value = themeMap[label] || "dark";
    setCurrentTheme(label);
    localStorage.setItem("color-mode", value);
    document.documentElement.setAttribute("data-theme", value);
    setShowThemePicker(false);
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "16px",
          paddingTop: "16px",
        }}
      >
        <button
          onClick={() => nav.pop()}
          style={{
            background: "none",
            border: "none",
            color: "var(--accent)",
            fontSize: "22px",
            cursor: "pointer",
            padding: "4px 8px 4px 0",
            lineHeight: 1,
          }}
        >
          ←
        </button>
        <h1
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "var(--text-primary)",
          }}
        >
          设置
        </h1>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", paddingBottom: "40px" }}>
        {/* ── 通用设置 ── */}
        <SectionTitle>通用设置</SectionTitle>
        <Card>
          <SettingRow
            icon={I.palette}
            label="颜色模式"
            value={currentTheme}
            onClick={() => setShowThemePicker(true)}
          />
          <Divider />
          <SettingRow
            icon={I.display}
            label="显示设置"
            onClick={() => nav.push({ id: "display", title: "显示设置" })}
          />
          <Divider />
          <SettingRow
            icon={I.sparkles}
            label="助手"
            onClick={() => nav.push({ id: "assistants", title: "助手" })}
          />
        </Card>

        {/* ── 模型与服务 ── */}
        <SectionTitle>模型与服务</SectionTitle>
        <Card>
          <SettingRow
            icon={I.cube}
            label="默认模型"
            onClick={() => nav.push({ id: "default-model", title: "默认模型" })}
          />
          <Divider />
          <SettingRow
            icon={I.key}
            label="API 配置"
            onClick={() => nav.push({ id: "api-config", title: "API 配置" })}
          />
          <Divider />
          <SettingRow
            icon={I.search}
            label="搜索服务"
            onClick={() => nav.push({ id: "search-service", title: "搜索服务" })}
          />
          <Divider />
          <SettingRow
            icon={I.volume}
            label="语音服务"
            onClick={() => nav.push({ id: "voice-service", title: "语音服务" })}
          />
          <Divider />
          <SettingRow
            icon={I.database}
            label="全局记忆"
            onClick={() => nav.push({ id: "global-memory", title: "全局记忆" })}
          />
        </Card>

        {/* ── 数据设置 ── */}
        <SectionTitle>数据设置</SectionTitle>
        <Card>
          <SettingRow
            icon={I.globe}
            label="应用语言"
            value={currentLang}
            onClick={() => setShowLangPicker(true)}
          />
          <Divider />
          <SettingRow
            icon={I.cloud}
            label="数据备份与同步"
            onClick={() => nav.push({ id: "data-backup", title: "数据备份与同步" })}
          />
        </Card>
      </div>

      {/* ── Theme Picker Modal ── */}
      {showThemePicker && (
        <BottomSheet onClose={() => setShowThemePicker(false)}>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "16px",
            }}
          >
            颜色模式
          </h3>
          {["跟随系统", "深色", "浅色"].map((t) => (
            <button
              key={t}
              onClick={() => applyTheme(t)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 4px",
                background: "none",
                border: "none",
                borderBottom: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontSize: "15px",
                cursor: "pointer",
              }}
            >
              <span>{t}</span>
              <span
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: `2px solid ${currentTheme === t ? "var(--accent)" : "var(--border-color)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {currentTheme === t && (
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: "var(--accent)",
                    }}
                  />
                )}
              </span>
            </button>
          ))}
        </BottomSheet>
      )}

      {/* ── Language Picker Modal ── */}
      {showLangPicker && (
        <BottomSheet onClose={() => setShowLangPicker(false)}>
          <h3
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "var(--text-primary)",
              marginBottom: "16px",
            }}
          >
            应用语言
          </h3>
          {["简体中文", "English"].map((l) => (
            <button
              key={l}
              onClick={() => {
                setCurrentLang(l);
                setShowLangPicker(false);
              }}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 4px",
                background: "none",
                border: "none",
                borderBottom: "1px solid var(--border-subtle)",
                color: "var(--text-primary)",
                fontSize: "15px",
                cursor: "pointer",
              }}
            >
              <span>{l}</span>
              <span
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: `2px solid ${currentLang === l ? "var(--accent)" : "var(--border-color)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {currentLang === l && (
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: "var(--accent)",
                    }}
                  />
                )}
              </span>
            </button>
          ))}
        </BottomSheet>
      )}
    </div>
  );
}

// Bottom sheet modal
function BottomSheet({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 300,
          animation: "fade-in 200ms ease",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--bg-secondary)",
          borderRadius: "16px 16px 0 0",
          padding: "24px 20px",
          paddingBottom: "24px",
          zIndex: 310,
          animation: "sheet-up 280ms cubic-bezier(0.25, 0.1, 0.25, 1)",
        }}
      >
        {children}
        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "14px",
            marginTop: "16px",
            borderRadius: "12px",
            border: "none",
            background: "var(--bg-tertiary)",
            color: "var(--text-primary)",
            fontSize: "15px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          取消
        </button>
      </div>
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sheet-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
