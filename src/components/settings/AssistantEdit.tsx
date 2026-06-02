"use client";
import { useLocale } from "@/lib/i18n";

import { useState, useEffect, useRef } from "react";
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
  const { t } = useLocale();
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
  const [assistantAvatar, setAssistantAvatar] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);

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
        setHistoryRefEnabled((a as Record<string, unknown>).history_reference_enabled as boolean || false);
        setHistoryRefCount((a as Record<string, unknown>).history_reference_count as number || 5);
        setAssistantAvatar(localStorage.getItem(`assistant-avatar-${id}`) || null);
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
        system_prompt: systemPrompt,
        quick_messages: quickMsgs.filter((q) => q.name.trim() && q.content.trim()),
        memory_enabled: memoryEnabled,
        history_reference_enabled: historyRefEnabled,
        history_reference_count: historyRefCount,
      };
      const res = await fetch("/api/assistants", {
        method: assistantId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        alert(t("saveFailed"));
        return;
      }
      // Save avatar for new assistants
      if (!assistantId && assistantAvatar) {
        try {
          const newAssistant = await res.json();
          if (newAssistant?.id) {
            localStorage.setItem(`assistant-avatar-${newAssistant.id}`, assistantAvatar);
          }
        } catch { /* skip */ }
      }
      nav.pop();
    } catch (e) {
      console.error("Failed to save assistant:", e);
      alert(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!assistantId) return;
    if (!confirm(t("confirmDeleteAssistant"))) return;
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
      <SettingsPageLayout nav={nav} title={isNew ? t("newAssistant") : t("editAssistantTitle")}>
        <p style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "40px 0" }}>
          {t("loading")}
        </p>
      </SettingsPageLayout>
    );
  }

  return (
    <SettingsPageLayout nav={nav} title={isNew ? t("newAssistant") : t("editAssistantTitle")}>
      {/* ── Avatar ── */}
      <SectionLabel>{t("assistantAvatar")}</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "16px", display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            onClick={() => avatarFileRef.current?.click()}
            style={{
              width: "56px", height: "56px", borderRadius: "50%",
              background: assistantAvatar ? `url(${assistantAvatar}) center/cover` : "var(--accent-muted)",
              color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: assistantAvatar ? 0 : "20px", fontWeight: 600, cursor: "pointer",
              border: "2px dashed var(--border-color)", flexShrink: 0,
            }}
          >
            {!assistantAvatar && (name?.[0]?.toUpperCase() || "A")}
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => avatarFileRef.current?.click()}
              disabled={avatarUploading}
              style={{
                padding: "6px 14px", borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-tertiary)", color: "var(--text-primary)",
                fontSize: "13px", cursor: "pointer",
              }}
            >
              {avatarUploading ? "..." : t("uploadAvatar")}
            </button>
            {assistantAvatar && (
              <button
                onClick={() => { setAssistantAvatar(null); if (assistantId) localStorage.removeItem(`assistant-avatar-${assistantId}`); }}
                style={{
                  padding: "6px 14px", borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "transparent", color: "var(--text-tertiary)",
                  fontSize: "13px", cursor: "pointer",
                }}
              >
                {t("resetAvatar")}
              </button>
            )}
          </div>
        </div>
        <input
          ref={avatarFileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setAvatarUploading(true);
            try {
              const reader = new FileReader();
              const base64 = await new Promise<string>((resolve) => { reader.onload = () => resolve(reader.result as string); reader.readAsDataURL(file); });
              const res = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: file.name, base64, mimeType: file.type }) });
              const data = await res.json();
              if (data.url) { setAssistantAvatar(data.url); if (assistantId) localStorage.setItem(`assistant-avatar-${assistantId}`, data.url); }
            } catch { /* skip */ }
            setAvatarUploading(false);
            e.target.value = "";
          }}
        />
      </SettingsCard>

      {/* ── 基础设定 ── */}
      <SectionLabel>{ t("basicSettings") }</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          <label style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
            {t("assistantNameLabel")}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("assistantNameInput")}
            style={inputStyle}
          />
        </div>
        <SettingsDivider />
        <div style={{ padding: "14px 16px" }}>
          <label style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
            {t("tagsOptional")}
          </label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder={t("tagsExample")}
            style={inputStyle}
          />
        </div>
        <SettingsDivider />
        <div style={{ padding: "14px 16px" }}>
          <label style={{ fontSize: "13px", color: "var(--text-secondary)", display: "block", marginBottom: "6px" }}>
            {t("defaultModelId")}
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
            {/* Always include current model if not in list */}
            {models.length > 0 && !models.some((m) => m.model_id === defaultModel) && (
              <option value={defaultModel}>{defaultModel}</option>
            )}
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
          label={t("streamOutput")}
          value={streamEnabled}
          onChange={setStreamEnabled}
        />
      </SettingsCard>

      {/* ── 系统提示词 ── */}
      <SectionLabel>{ t("systemPromptLabel") }</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder={t("systemPromptInput")}
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
            <span>{t("characters")}: {systemPrompt.length}</span>
            <span>{t("tokenEstimate")}: ~{estimateTokens(systemPrompt)}</span>
          </div>
        </div>
      </SettingsCard>

      {/* ── 快捷消息 ── */}
      <SectionLabel>{ t("quickMessagesLabel") }</SectionLabel>
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
                placeholder={t("buttonName")}
                style={{ ...inputStyle, width: "35%" }}
              />
              <input
                value={q.content}
                onChange={(e) => {
                  const u = [...quickMsgs];
                  u[i] = { ...u[i], content: e.target.value };
                  setQuickMsgs(u);
                }}
                placeholder={t("sendContent")}
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
            {t("addQuickMsg")}
          </button>
        </div>
      </SettingsCard>

      {/* ── 助手记忆 ── */}
      <SectionLabel>{ t("assistantMemoryLabel") }</SectionLabel>
      <SettingsCard>
        <SettingsToggleRow
          label={t("enableAssistantMemoryLabel")}
          description={t("assistantMemoryDesc")}
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
                    title: `${t("manageMemoryFor")} (${name})`,
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
                <div style={{ fontSize: "15px", color: "var(--text-primary)" }}>{ t("manageMemoryLabel") }</div>
                <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "4px" }}>
                  {assistantId ? t("manageMemoryAvailable") : t("manageMemorySaveFirst")}
                </div>
              </div>
              <span style={{ fontSize: "16px", color: "var(--text-tertiary)", opacity: 0.5 }}>›</span>
            </button>
            <SettingsDivider />
            <SettingsToggleRow
              label={t("refHistory")}
              description={t("refHistoryDesc")}
              value={historyRefEnabled}
              onChange={setHistoryRefEnabled}
            />
            {historyRefEnabled && (
              <>
                <SettingsDivider />
                <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "15px", color: "var(--text-primary)" }}>{ t("refRecent") }</span>
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
                  <span style={{ fontSize: "15px", color: "var(--text-primary)" }}>{ t("chatsUnit") }</span>
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
          {t("cancel")}
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
          {saving ? t("saving") : t("save")}
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
          {t("deleteAssistant")}
        </button>
      )}

      <div style={{ height: "40px" }} />
    </SettingsPageLayout>
  );
}
