"use client";
import { useLocale } from "@/lib/i18n";

import { useState, useEffect } from "react";
import type { NavContext } from "@/app/settings/page";
import type { Assistant } from "@/lib/types";
import SettingsPageLayout from "./SettingsPageLayout";

export default function AssistantList({ nav }: { nav: NavContext }) {
  const { t } = useLocale();
  const [assistants, setAssistants] = useState<Assistant[]>([]);

  useEffect(() => {
    fetchAssistants();
  }, []);

  const fetchAssistants = async () => {
    try {
      const res = await fetch("/api/assistants");
      const data = await res.json();
      if (Array.isArray(data)) setAssistants(data);
    } catch (e) {
      console.error("Failed to fetch assistants:", e);
    }
  };

  return (
    <SettingsPageLayout nav={nav} title="助手">
      {/* New assistant button */}
      <button
        onClick={() =>
          nav.push({
            id: "assistant-edit",
            title: "新建助手",
            props: { assistantId: null },
          })
        }
        style={{
          width: "100%",
          padding: "14px",
          borderRadius: "12px",
          border: "1px dashed var(--border-color)",
          background: "transparent",
          color: "var(--accent)",
          fontSize: "15px",
          fontWeight: 500,
          cursor: "pointer",
          marginBottom: "16px",
        }}
      >
        {t("newAssistant")}
      </button>

      {/* Assistant list */}
      {assistants.length > 0 && (
        <div
          style={{
            borderRadius: "12px",
            background: "var(--bg-secondary)",
            overflow: "hidden",
          }}
        >
          {assistants.map((a, i) => (
            <div key={a.id}>
              {i > 0 && (
                <div
                  style={{
                    height: "1px",
                    background: "var(--border-subtle)",
                    marginLeft: "16px",
                  }}
                />
              )}
              <button
                onClick={() =>
                  nav.push({
                    id: "assistant-edit",
                    title: "编辑助手",
                    props: { assistantId: a.id },
                  })
                }
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 16px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {/* Avatar placeholder */}
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "var(--bg-tertiary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "18px",
                    flexShrink: 0,
                    color: "var(--accent)",
                  }}
                >
                  {a.avatar_url ? (
                    <img
                      src={a.avatar_url}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        borderRadius: "10px",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    a.name.charAt(0)
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "15px",
                      fontWeight: 500,
                      color: "var(--text-primary)",
                      marginBottom: "2px",
                    }}
                  >
                    {a.name}
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    {a.tags && (
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--accent)",
                        }}
                      >
                        {a.tags}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text-tertiary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.default_model.split("/").pop()}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <span
                  style={{
                    fontSize: "16px",
                    color: "var(--text-tertiary)",
                    opacity: 0.5,
                    flexShrink: 0,
                  }}
                >
                  ›
                </span>
              </button>
            </div>
          ))}
        </div>
      )}

      {assistants.length === 0 && (
        <p
          style={{
            textAlign: "center",
            color: "var(--text-tertiary)",
            fontSize: "14px",
            padding: "40px 0",
          }}
        >
          暂无助手
        </p>
      )}
    </SettingsPageLayout>
  );
}
