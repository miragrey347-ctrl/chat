"use client";

import { useState, useEffect } from "react";
import type { NavContext } from "@/app/settings/page";
import type { Assistant } from "@/lib/types";
import SettingsPageLayout, {
  SettingsCard,
  SettingsToggleRow,
  SettingsDivider,
  SectionLabel,
} from "./SettingsPageLayout";

interface AssistantEditProps {
  nav: NavContext;
  assistantId: string | null;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border-color)",
  borderRadius: "10px",
  padding: "12px 14px",
  fontSize: "15px",
  color: "var(--text-primary)",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  WebkitAppearance: "none",
};

export default function AssistantEdit({ nav, assistantId }: AssistantEditProps) {
  const isNew = !assistantId;
  const [loading, setLoading] = useState(!isNew);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [defaultModel, setDefaultModel] = useState("anthropic/claude-sonnet-4");
  const [streamEnabled, setStreamEnabled] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [quickMsgs, setQuickMsgs] = useState<{ name: string; content: string }[]>([]);
  const [memoryEnabled, setMemoryEnabled] = useState(false);
  const [historyRefEnabled, setHistoryRefEnabled] = useState(false);
  const [historyRefCount, setHistoryRefCount] = useState(5);
  const [models, setModels] = useState<{ model_id: string; display_name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch assistant data if editing
  useEffect(() => {
    fetchModels();
    if (assistantId) {
      fetchAssistant(assistantId);
    }
  }, [assistantId]);

  const fetchModels = async () => {
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      if (Array.isArray(data)) setModels(data);
    } catch (e) {
      console.error("Failed to fetch models:", e);
    }
  };

  const fetchAssistant = async (id: string) => {
    try {
      const res = await fetch("/api/assistants");
      const data = await res.json();
      const a = Array.isArray(data) ? data.find((x: Assistant) => x.id === id) : null;
      if (a) {
        setName(a.name);
        setTags(a.tags || "");
        setDefaultModel(a.default_model);
        setStreamEnabled(a.stream_enabled !== false);
        setSystemPrompt(a.system_prompt || "");
        setQuickMsgs(
          Array.isArray(a.quick_messages) ? a.quick_messages : []
        );
        setMemoryEnabled(a.memory_enabled || false);
        // These fields may not exist yet in the DB
        setHistoryRefEnabled((a as Record<string, unknown>).history_reference_enabled as boolean || false);
        setHistoryRefCount((a as Record<string, unknown>).history_reference_count as number || 5);
      }
    } catch (e) {
      console.error("Failed to fetch assistant:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const payload = {
        ...(assistantId ? { id: assistantId } : {}),
        name: name.trim(),
        tags: tags.trim(),
        default_model: defaultModel,
        stream_enabled: streamEnabled,
        system_prompt: systemPrompt,
        quick_messages: quickMsgs.filter((q) => q.name.trim() && q.content.trim()),
        memory_enabled: memoryEnabled,
        history_reference_enabled: historyRefEnabled,
        history_reference_count: historyRefCount,
      };
      await fetch("/api/assistants", {
        method: assistantId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      nav.pop();
    } catch (e) {
      console.error("Failed to save assistant:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!assistantId) return;
    if (!confirm("确定要删除这个助手吗？")) return;
    try {
      await fetch("/api/assistants", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: assistantId }),
      });
      nav.pop();
    } catch (e) {
      console.error("Failed to delete assistant:", e);
    }
  };

  // Estimate tokens (~1.5 per Chinese char, ~0.3 per other char)
  const estimateTokens = (text: string) => {
    const cn = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const other = text.length - cn;
    return Math.ceil(cn * 1.5 + other * 0.3);
  };

  if (loading) {
    return (
      <SettingsPageLayout nav={nav} title={isNew ? "新建助手" : "编辑助手"}>
        <p style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "40px 0" }}>
          加载中...
        </p>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout nav={nav} title={isNew ? "新建助手" : "编辑助手"}>
      {/* ── 基础设定 ── */}
      <SectionLabel>基础设定</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          <label style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
            助手名称
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入助手名称"
            style={inputStyle}
          />
        </div>
        <SettingsDivider />
        <div style={{ padding: "14px 16px" }}>
          <label style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
            标签（可选）
          </label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="如：聊天、翻译、工作"
            style={inputStyle}
          />
        </div>
        <SettingsDivider />
        <div style={{ padding: "14px 16px" }}>
          <label style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
            默认模型 ID
          </label>
          <select
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
            style={{
              ...inputStyle,
              WebkitAppearance: "none",
              appearance: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237a7068'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 14px center",
              paddingRight: "36px",
            }}
          >
            {models.length > 0 ? (
              models.map((m) => (
                <option key={m.model_id} value={m.model_id}>
                  {m.display_name || m.model_id}
                </option>
              ))
            ) : (
              <option value={defaultModel}>{defaultModel}</option>
            )}
          </select>
        </div>
        <SettingsDivider />
        <SettingsToggleRow
          label="流式输出"
          value={streamEnabled}
          onChange={setStreamEnabled}
        />
      </SettingsCard>

      {/* ── 系统提示词 ── */}
      <SectionLabel>系统提示词</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="输入系统提示词..."
            rows={10}
            style={{
              ...inputStyle,
              resize: "vertical",
              minHeight: "160px",
              lineHeight: 1.6,
              fontSize: "14px",
            }}
          />
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "16px",
              fontSize: "12px",
              color: "var(--text-tertiary)",
              marginTop: "6px",
            }}
          >
            <span>字符数：{systemPrompt.length}</span>
            <span>Token 估算：~{estimateTokens(systemPrompt)}</span>
          </div>
        </div>
      </SettingsCard>

      {/* ── 快捷消息 ── */}
      <SectionLabel>快捷消息</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          {quickMsgs.map((q, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "8px",
                alignItems: "center",
              }}
            >
              <input
                value={q.name}
                onChange={(e) => {
                  const u = [...quickMsgs];
                  u[i] = { ...u[i], name: e.target.value };
                  setQuickMsgs(u);
                }}
                placeholder="按钮名"
                style={{ ...inputStyle, width: "35%" }}
              />
              <input
                value={q.content}
                onChange={(e) => {
                  const u = [...quickMsgs];
                  u[i] = { ...u[i], content: e.target.value };
                  setQuickMsgs(u);
                }}
                placeholder="发送内容"
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={() => setQuickMsgs(quickMsgs.filter((_, j) => j !== i))}
                style={{
                  background: "none",
                  border: "none",
                  color: "#e5737f",
                  fontSize: "18px",
                  cursor: "pointer",
                  flexShrink: 0,
                  padding: "4px",
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={() => setQuickMsgs([...quickMsgs, { name: "", content: "" }])}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: "8px",
              border: "1px dashed var(--border-color)",
              background: "transparent",
              color: "var(--text-tertiary)",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            + 添加快捷消息
          </button>
        </div>
      </SettingsCard>

      {/* ── 助手记忆 ── */}
      <SectionLabel>助手记忆</SectionLabel>
      <SettingsCard>
        <SettingsToggleRow
          label="启用助手记忆"
          description="开启后，模型会在对话中自动识别并记录你的重要信息，也可以主动要求模型记住某些内容。记录的信息将在该助手的所有对话中使用。"
          value={memoryEnabled}
          onChange={setMemoryEnabled}
        />
        {memoryEnabled && (
          <>
            <SettingsDivider />
            <button
              onClick={() => {
                if (assistantId) {
                  nav.push({
                    id: "memory-manage",
                    title: `管理记忆（${name}）`,
                    props: { assistantId, assistantName: name },
                  });
                }
              }}
              disabled={!assistantId}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                background: "none",
                border: "none",
                cursor: assistantId ? "pointer" : "default",
                textAlign: "left",
                WebkitTapHighlightColor: "transparent",
                opacity: assistantId ? 1 : 0.5,
              }}
            >
              <div>
                <div style={{ fontSize: "15px", color: "var(--text-primary)" }}>管理记忆</div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                  {assistantId ? "手动添加或上传文件添加记忆" : "保存助手后可管理记忆"}
                </div>
              </div>
              <span style={{ fontSize: "16px", color: "var(--text-tertiary)", opacity: 0.5 }}>›</span>
            </button>
            <SettingsDivider />
            <SettingsToggleRow
              label="参考历史聊天记录"
              description="开启后，新建对话时自动携带该助手最近几条对话的摘要作为上下文参考。"
              value={historyRefEnabled}
              onChange={setHistoryRefEnabled}
            />
            {historyRefEnabled && (
              <>
                <SettingsDivider />
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "15px", color: "var(--text-primary)" }}>参考最近</span>
                  <select
                    value={historyRefCount}
                    onChange={(e) => setHistoryRefCount(Number(e.target.value))}
                    style={{
                      background: "var(--bg-tertiary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "8px",
                      padding: "6px 28px 6px 10px",
                      fontSize: "15px",
                      color: "var(--text-primary)",
                      WebkitAppearance: "none",
                      appearance: "none",
                      outline: "none",
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237a7068'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 8px center",
                    }}
                  >
                    {[3, 5, 8, 10].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: "15px", color: "var(--text-primary)" }}>条对话</span>
                </div>
              </>
            )}
          </>
        )}
      </SettingsCard>

      {/* ── Save / Delete buttons ── */}
      <div style={{ marginTop: "24px", display: "flex", gap: "10px" }}>
        <button
          onClick={() => nav.pop()}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "12px",
            border: "1px solid var(--border-color)",
            background: "transparent",
            color: "var(--text-secondary)",
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          取消
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "12px",
            border: "none",
            background: name.trim() ? "var(--accent)" : "var(--bg-tertiary)",
            color: name.trim() ? "#1a1410" : "var(--text-tertiary)",
            fontSize: "15px",
            fontWeight: 500,
            cursor: name.trim() ? "pointer" : "default",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "保存中..." : "保存"}
        </button>
      </div>

      {!isNew && (
        <button
          onClick={handleDelete}
          style={{
            width: "100%",
            padding: "14px",
            marginTop: "16px",
            borderRadius: "12px",
            border: "none",
            background: "rgba(229, 115, 127, 0.1)",
            color: "#e5737f",
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          🗑 删除此助手
        </button>
      )}

      <div style={{ height: "40px" }} />
    </SettingsPageLayout>
  );
}
