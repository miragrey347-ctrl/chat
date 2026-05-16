"use client";

import type { NavContext } from "@/app/settings/page";

interface SettingsPageLayoutProps {
  nav: NavContext;
  title: string;
  children: React.ReactNode;
}

export default function SettingsPageLayout({ nav, title, children }: SettingsPageLayoutProps) {
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
          paddingTop: "max(16px, env(safe-area-inset-top))",
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
          {title}
        </h1>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 16px", paddingBottom: "40px" }}>
        {children}
      </div>
    </div>
  );
}

// Shared UI components for settings pages
export function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: "12px",
        background: "var(--bg-secondary)",
        overflow: "hidden",
        marginBottom: "16px",
      }}
    >
      {children}
    </div>
  );
}

export function SettingsToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 16px",
        background: "none",
        border: "none",
        cursor: "pointer",
        textAlign: "left",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div style={{ flex: 1, marginRight: "12px" }}>
        <div style={{ fontSize: "15px", color: "var(--text-primary)" }}>{label}</div>
        {description && (
          <div
            style={{
              fontSize: "12px",
              color: "var(--text-tertiary)",
              marginTop: "4px",
              lineHeight: 1.4,
            }}
          >
            {description}
          </div>
        )}
      </div>
      <div
        style={{
          width: "44px",
          height: "26px",
          borderRadius: "13px",
          background: value ? "#4a90d9" : "var(--bg-hover)",
          position: "relative",
          transition: "background 0.2s",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "22px",
            height: "22px",
            borderRadius: "50%",
            background: "#fff",
            position: "absolute",
            top: "2px",
            left: value ? "20px" : "2px",
            transition: "left 0.2s",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          }}
        />
      </div>
    </button>
  );
}

export function SettingsDivider() {
  return (
    <div
      style={{
        height: "1px",
        background: "var(--border-subtle)",
        marginLeft: "16px",
      }}
    />
  );
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <div
      style={{
        fontSize: "13px",
        color: "var(--text-tertiary)",
        padding: "16px 0 8px",
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  );
}
