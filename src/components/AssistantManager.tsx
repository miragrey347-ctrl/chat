"use client";

import { useState, useEffect } from "react";
import type { Assistant } from "@/lib/types";

interface Memory {
  id: string;
  content: string;
  source: string;
}

interface AssistantManagerProps {
  assistants: Assistant[];
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onRefreshMemories?: () => void;
}

export default function AssistantManager({ assistants, isOpen, onClose, onRefresh, onRefreshMemories }: AssistantManagerProps) {
  const [editing, setEditing] = useState<Assistant | null>(null);
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<"assistants" | "memories">("assistants");
  const [globalMemories, setGlobalMemories] = useState<Memory[]>([]);
  const [newMemory, setNewMemory] = useState("");

  useEffect(() => {
    if (isOpen && tab === "memories") fetchGlobalMemories();
  }, [isOpen, tab]);

  const fetchGlobalMemories = async () => {
    const res = await fetch("/api/memories?type=global");
    const data = await res.json();
    if (Array.isArray(data)) setGlobalMemories(data);
  };

  const addGlobalMemory = async () => {
    if (!newMemory.trim()) return;
    await fetch("/api/memories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "global", content: newMemory.trim() }),
    });
    setNewMemory("");
    fetchGlobalMemories();
    onRefreshMemories?.();
  };

  const deleteGlobalMemory = async (id: string) => {
    await fetch("/api/memories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, type: "global" }),
    });
    fetchGlobalMemories();
    onRefreshMemories?.();
  };

  if (!isOpen) return null;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200 }} />
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "min(420px, 90vw)",
        background: "var(--bg-secondary)",
        borderLeft: "1px solid var(--border-subtle)",
        zIndex: 210,
        display: "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        <div style={{ padding: "20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)" }}>设置</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-tertiary)", fontSize: "20px", cursor: "pointer" }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border-subtle)" }}>
          {(["assistants", "memories"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: "12px", border: "none", background: "transparent",
                color: tab === t ? "var(--accent)" : "var(--text-tertiary)",
                borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                fontSize: "13px", fontWeight: 500, cursor: "pointer",
              }}
            >
              {t === "assistants" ? "助手" : "全局记忆"}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
          {tab === "memories" ? (
            /* Global Memories */
            <div>
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <input
                  value={newMemory}
                  onChange={(e) => setNewMemory(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addGlobalMemory()}
                  placeholder="添加一条全局记忆..."
                  style={{
                    flex: 1, background: "var(--bg-input)", border: "1px solid var(--border-color)",
                    borderRadius: "10px", padding: "10px 14px", fontSize: "13px",
                    color: "var(--text-primary)", outline: "none",
                  }}
                />
                <button
                  onClick={addGlobalMemory}
                  disabled={!newMemory.trim()}
                  style={{
                    background: newMemory.trim() ? "var(--accent)" : "var(--bg-tertiary)",
                    color: newMemory.trim() ? "#1a1410" : "var(--text-tertiary)",
                    border: "none", borderRadius: "10px", padding: "10px 16px",
                    fontSize: "13px", fontWeight: 500, cursor: newMemory.trim() ? "pointer" : "default",
                  }}
                >添加</button>
              </div>
              <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginBottom: "12px" }}>
                全局记忆会注入到所有助手的系统提示词中。
              </p>
              {globalMemories.map((m) => (
                <div key={m.id} style={{
                  display: "flex", alignItems: "flex-start", gap: "8px",
                  padding: "10px 12px", borderRadius: "10px", marginBottom: "6px",
                  background: "var(--bg-tertiary)",
                }}>
                  <span style={{ flex: 1, fontSize: "13px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                    {m.content}
                  </span>
                  <button
                    onClick={() => deleteGlobalMemory(m.id)}
                    style={{ background: "none", border: "none", color: "var(--text-tertiary)", cursor: "pointer", fontSize: "14px", flexShrink: 0 }}
                  >✕</button>
                </div>
              ))}
              {globalMemories.length === 0 && (
                <p style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px", padding: "30px 0" }}>暂无全局记忆</p>
              )}
            </div>
          ) : editing || creating ? (
            <AssistantForm
              assistant={editing}
              onSave={async (data) => {
                if (editing) {
                  await fetch("/api/assistants", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, ...data }) });
                } else {
                  await fetch("/api/assistants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
                }
                setEditing(null);
                setCreating(false);
                onRefresh();
              }}
              onCancel={() => { setEditing(null); setCreating(false); }}
            />
          ) : (
            <>
              <button
                onClick={() => setCreating(true)}
                style={{
                  width: "100%", padding: "14px", borderRadius: "14px", border: "none",
                  background: "var(--accent)", color: "#1a1410", fontSize: "14px",
                  fontWeight: 500, cursor: "pointer", marginBottom: "16px",
                }}
              >
                + 新建助手
              </button>

              {assistants.map((a) => (
                <div key={a.id} style={{
                  padding: "14px", borderRadius: "14px", marginBottom: "8px",
                  background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>{a.name}</span>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={() => setEditing(a)} style={{ background: "none", border: "none", color: "var(--accent)", fontSize: "13px", cursor: "pointer" }}>编辑</button>
                      <button onClick={async () => {
                        if (confirm("确定删除？")) {
                          await fetch("/api/assistants", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: a.id }) });
                          onRefresh();
                        }
                      }} style={{ background: "none", border: "none", color: "#e5737f", fontSize: "13px", cursor: "pointer" }}>删除</button>
                    </div>
                  </div>
                  {a.tags && <div style={{ fontSize: "11px", color: "var(--accent)", marginBottom: "4px" }}>{a.tags}</div>}
                  <div style={{ fontSize: "12px", color: "var(--text-tertiary)", lineHeight: 1.5 }}>
                    {a.system_prompt ? (a.system_prompt.length > 100 ? a.system_prompt.slice(0, 100) + "..." : a.system_prompt) : "无系统提示词"}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "6px" }}>
                    模型: {a.default_model.split("/").pop()}
                  </div>
                  {a.quick_messages && Array.isArray(a.quick_messages) && a.quick_messages.length > 0 && (
                    <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                      快捷消息: {a.quick_messages.map((q: {name: string}) => q.name).join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function AssistantForm({
  assistant,
  onSave,
  onCancel,
}: {
  assistant: Assistant | null;
  onSave: (data: Partial<Assistant>) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(assistant?.name || "");
  const [tags, setTags] = useState(assistant?.tags || "");
  const [systemPrompt, setSystemPrompt] = useState(assistant?.system_prompt || "");
  const [defaultModel, setDefaultModel] = useState(assistant?.default_model || "anthropic/claude-sonnet-4");
  const [quickMsgs, setQuickMsgs] = useState<{ name: string; content: string }[]>(
    (assistant?.quick_messages as { name: string; content: string }[]) || []
  );
  const [memoryEnabled, setMemoryEnabled] = useState(assistant?.memory_enabled || false);

  const inputStyle = {
    width: "100%",
    background: "var(--bg-input)",
    border: "1px solid var(--border-color)",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "14px",
    color: "var(--text-primary)",
    outline: "none",
    boxSizing: "border-box" as const,
    fontFamily: "inherit",
  };

  const labelStyle = {
    display: "block",
    fontSize: "12px",
    fontWeight: 500 as const,
    color: "var(--text-secondary)",
    marginBottom: "6px",
    marginTop: "16px",
  };

  return (
    <div>
      <h3 style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
        {assistant ? "编辑助手" : "新建助手"}
      </h3>

      <label style={labelStyle}>名称</label>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="助手名称" style={inputStyle} />

      <label style={labelStyle}>标签（可选）</label>
      <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="如：聊天、翻译、工作" style={inputStyle} />

      <label style={labelStyle}>默认模型 ID</label>
      <input value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)} placeholder="anthropic/claude-sonnet-4" style={inputStyle} />

      <label style={labelStyle}>系统提示词</label>
      <textarea
        value={systemPrompt}
        onChange={(e) => setSystemPrompt(e.target.value)}
        placeholder="输入 system prompt..."
        rows={8}
        style={{ ...inputStyle, resize: "vertical", minHeight: "120px", lineHeight: 1.6 }}
      />
      <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "4px", textAlign: "right" }}>
        {systemPrompt.length} 字符
      </div>

      {/* Quick messages */}
      <label style={labelStyle}>快捷消息</label>
      {quickMsgs.map((q, i) => (
        <div key={i} style={{ display: "flex", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
          <input
            value={q.name}
            onChange={(e) => { const u = [...quickMsgs]; u[i] = { ...u[i], name: e.target.value }; setQuickMsgs(u); }}
            placeholder="按钮名"
            style={{ ...inputStyle, width: "30%" }}
          />
          <input
            value={q.content}
            onChange={(e) => { const u = [...quickMsgs]; u[i] = { ...u[i], content: e.target.value }; setQuickMsgs(u); }}
            placeholder="发送内容"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button
            onClick={() => setQuickMsgs(quickMsgs.filter((_, j) => j !== i))}
            style={{ background: "none", border: "none", color: "#e5737f", fontSize: "16px", cursor: "pointer", flexShrink: 0 }}
          >✕</button>
        </div>
      ))}
      <button
        onClick={() => setQuickMsgs([...quickMsgs, { name: "", content: "" }])}
        style={{
          background: "transparent", border: "1px dashed var(--border-color)", borderRadius: "8px",
          padding: "8px", width: "100%", color: "var(--text-tertiary)", fontSize: "13px", cursor: "pointer",
        }}
      >
        + 添加快捷消息
      </button>

      {/* Memory toggle */}
      <label style={labelStyle}>助手记忆</label>
      <div
        onClick={() => setMemoryEnabled(!memoryEnabled)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 14px", borderRadius: "10px", cursor: "pointer",
          background: "var(--bg-input)", border: "1px solid var(--border-color)",
        }}
      >
        <span style={{ fontSize: "13px", color: "var(--text-primary)" }}>
          启用助手级记忆
        </span>
        <div style={{
          width: "36px", height: "20px", borderRadius: "10px",
          background: memoryEnabled ? "var(--accent)" : "var(--bg-hover)",
          position: "relative", transition: "background 0.2s",
        }}>
          <div style={{
            width: "16px", height: "16px", borderRadius: "50%",
            background: "#fff", position: "absolute", top: "2px",
            left: memoryEnabled ? "18px" : "2px", transition: "left 0.2s",
          }} />
        </div>
      </div>
      <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "4px", marginLeft: "2px" }}>
        开启后，助手记忆会注入到系统提示词中。
      </p>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", marginTop: "24px" }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: "12px", borderRadius: "12px",
          border: "1px solid var(--border-color)", background: "transparent",
          color: "var(--text-secondary)", fontSize: "14px", cursor: "pointer",
        }}>取消</button>
        <button
          onClick={() => onSave({ name, tags, system_prompt: systemPrompt, default_model: defaultModel, quick_messages: quickMsgs, memory_enabled: memoryEnabled })}
          disabled={!name.trim()}
          style={{
            flex: 1, padding: "12px", borderRadius: "12px", border: "none",
            background: name.trim() ? "var(--accent)" : "var(--bg-tertiary)",
            color: name.trim() ? "#1a1410" : "var(--text-tertiary)",
            fontSize: "14px", fontWeight: 500, cursor: name.trim() ? "pointer" : "default",
          }}
        >保存</button>
      </div>
    </div>
  );
}
