"use client";

import { useState, useEffect } from "react";
import type { NavContext } from "@/app/settings/page";
import FileUploadMemory from "./FileUploadMemory";
import SettingsPageLayout, {
  SettingsCard,
  SettingsDivider,
  SectionLabel,
} from "./SettingsPageLayout";

interface Memory {
  id: string;
  content: string;
  source: string;
  token_count?: number;
}

interface MemoryManageProps {
  nav: NavContext;
  assistantId?: string;
  assistantName?: string;
}

export default function MemoryManage({ nav, assistantId, assistantName }: MemoryManageProps) {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [newMemory, setNewMemory] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  useEffect(() => {
    if (assistantId) fetchMemories();
  }, [assistantId]);

  const fetchMemories = async () => {
    try {
      const res = await fetch(`/api/memories?assistant_id=${assistantId}`);
      const data = await res.json();
      if (Array.isArray(data)) setMemories(data);
    } catch (e) {
      console.error(e);
    }
  };

  const addMemory = async () => {
    if (!newMemory.trim() || !assistantId) return;
    await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assistant_id: assistantId,
        content: newMemory.trim(),
        source: "manual",
      }),
    });
    setNewMemory("");
    fetchMemories();
  };

  const addFileMemory = async (filename: string, content: string) => {
    if (!assistantId) return;
    const memContent = `[文件: ${filename}]\n${content}`;
    await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assistant_id: assistantId,
        content: memContent,
        source: "file",
      }),
    });
    fetchMemories();
  };

  const deleteMemory = async (id: string) => {
    await fetch("/api/memories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, type: "assistant" }),
    });
    fetchMemories();
  };

  const saveEdit = async (id: string) => {
    await fetch("/api/memories", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, content: editContent, type: "assistant" }),
    });
    setEditingId(null);
    fetchMemories();
  };

  const estimateTokens = (text: string) => {
    const cn = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const other = text.length - cn;
    return Math.ceil(cn * 1.5 + other * 0.3);
  };

  const totalTokens = memories.reduce(
    (sum, m) => sum + (m.token_count || estimateTokens(m.content)),
    0
  );

  const title = assistantName ? `管理记忆（${assistantName}）` : "管理记忆";

  return (
    <SettingsPageLayout nav={nav} title={title}>
      <SectionLabel>添加记忆</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={newMemory}
              onChange={(e) => setNewMemory(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addMemory()}
              placeholder="输入一条记忆..."
              style={{
                flex: 1,
                background: "var(--bg-tertiary)",
                border: "1px solid var(--border-color)",
                borderRadius: "10px",
                padding: "10px 14px",
                fontSize: "14px",
                color: "var(--text-primary)",
                outline: "none",
              }}
            />
            <button
              onClick={addMemory}
              disabled={!newMemory.trim()}
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "none",
                background: newMemory.trim() ? "var(--accent)" : "var(--bg-tertiary)",
                color: newMemory.trim() ? "#1a1410" : "var(--text-tertiary)",
                fontSize: "14px",
                fontWeight: 500,
                cursor: newMemory.trim() ? "pointer" : "default",
                flexShrink: 0,
              }}
            >
              添加
            </button>
          </div>
        </div>
        <SettingsDivider />
        <div style={{ padding: "14px 16px" }}>
          <FileUploadMemory onFileAdd={addFileMemory} />
        </div>
      </SettingsCard>

      <SectionLabel>已有记忆</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          {/* Token usage */}
          <div style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "12px" }}>
            {memories.length} 条记忆，约 {totalTokens} tokens
          </div>

          {/* Memory list */}
          {memories.map((m) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "8px",
                marginBottom: "6px",
                background: "var(--bg-tertiary)",
              }}
            >
              <span style={{ color: "var(--text-tertiary)", cursor: "grab", fontSize: "14px", marginTop: "2px" }}>
                ≡
              </span>
              {editingId === m.id ? (
                <div style={{ flex: 1, display: "flex", gap: "6px" }}>
                  <input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveEdit(m.id)}
                    autoFocus
                    style={{
                      flex: 1,
                      background: "var(--bg-primary)",
                      border: "1px solid var(--accent)",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontSize: "13px",
                      color: "var(--text-primary)",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => saveEdit(m.id)}
                    style={{
                      background: "var(--accent)",
                      border: "none",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      color: "#1a1410",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    style={{
                      background: "none",
                      border: "1px solid var(--border-color)",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      color: "var(--text-tertiary)",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <span style={{ flex: 1, fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.5, overflow: "hidden" }}>
                    {m.source === "file" && m.content.startsWith("[文件:") ? (
                      <>
                        <div style={{ fontWeight: 500, marginBottom: "2px" }}>
                          {m.content.split("]\n")[0].replace("[文件: ", "")}
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "400px" }}>
                          {m.content.split("]\n").slice(1).join("").slice(0, 80)}...
                        </div>
                      </>
                    ) : (
                      m.content
                    )}
                  </span>
                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)", flexShrink: 0, marginTop: "2px" }}>
                    {m.source === "manual" ? "手动" : m.source === "file" ? "文件" : m.source === "auto" ? "自动" : m.source}
                  </span>
                  {m.source !== "file" && (
                    <button
                      onClick={() => {
                        setEditingId(m.id);
                        setEditContent(m.content);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-tertiary)",
                        cursor: "pointer",
                        fontSize: "14px",
                        flexShrink: 0,
                      }}
                    >
                      ✎
                    </button>
                  )}
                  <button
                    onClick={() => deleteMemory(m.id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                      fontSize: "14px",
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </>
              )}
            </div>
          ))}

          {memories.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px", padding: "20px 0" }}>
              暂无记忆
            </p>
          )}
        </div>
      </SettingsCard>
    </SettingsPageLayout>
  );
}
