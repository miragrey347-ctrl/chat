"use client";

import { useState, useRef, useEffect } from "react";

interface UserModel {
  id: string;
  model_id: string;
  display_name: string;
}

interface ModelSelectorProps {
  currentModel: string;
  onChange: (model: string) => void;
}

export default function ModelSelector({ currentModel, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<UserModel[]>([]);
  const [adding, setAdding] = useState(false);
  const [newModelId, setNewModelId] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAdding(false);
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      if (Array.isArray(data)) setModels(data);
    } catch (e) {
      console.error("Failed to fetch models:", e);
    }
  };

  const handleAdd = async () => {
    if (!newModelId.trim() || !newDisplayName.trim()) return;
    try {
      await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_id: newModelId.trim(), display_name: newDisplayName.trim() }),
      });
      setNewModelId("");
      setNewDisplayName("");
      setAdding(false);
      await fetchModels();
    } catch (e) {
      console.error("Failed to add model:", e);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch("/api/models", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await fetchModels();
    } catch (err) {
      console.error("Failed to delete model:", err);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) { setEditingId(null); return; }
    try {
      await fetch("/api/models", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, display_name: editName.trim() }),
      });
      setEditingId(null);
      await fetchModels();
    } catch (err) {
      console.error("Failed to rename model:", err);
    }
  };

  const currentName = models.find((m) => m.model_id === currentModel)?.display_name
    || currentModel.split("/").pop();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "var(--bg-tertiary)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "10px",
          padding: "6px 12px",
          fontSize: "13px",
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {currentName}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 4L5 7L8 4" />
        </svg>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: "0",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            borderRadius: "14px",
            padding: "6px",
            zIndex: 100,
            minWidth: "260px",
            maxHeight: "400px",
            overflowY: "auto",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          {models.map((m) => (
            <div
              key={m.id}
              onClick={() => { if (!editingId) { onChange(m.model_id); setOpen(false); } }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: "8px",
                background: m.model_id === currentModel ? "var(--accent-muted)" : "transparent",
                cursor: editingId ? "default" : "pointer",
                marginBottom: "2px",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingId === m.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleRename(m.id); if (e.key === "Escape") setEditingId(null); }}
                    onBlur={() => handleRename(m.id)}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: "100%",
                      background: "var(--bg-input)",
                      border: "1px solid var(--accent)",
                      borderRadius: "6px",
                      padding: "4px 8px",
                      fontSize: "13px",
                      color: "var(--text-primary)",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                ) : (
                  <>
                    <div style={{
                      fontSize: "13px",
                      color: m.model_id === currentModel ? "var(--accent)" : "var(--text-primary)",
                      fontWeight: m.model_id === currentModel ? 600 : 400,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {m.display_name}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {m.model_id}
                    </div>
                  </>
                )}
              </div>
              {editingId !== m.id && (
                <div style={{ display: "flex", alignItems: "center", gap: "2px", flexShrink: 0, marginLeft: "8px" }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setEditingId(m.id); setEditName(m.display_name); }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDelete(m.id, e)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                      fontSize: "14px",
                      padding: "4px",
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Divider */}
          <div style={{ borderTop: "1px solid var(--border-color)", margin: "6px 0" }} />

          {adding ? (
            <div style={{ padding: "8px" }}>
              <input
                autoFocus
                placeholder="显示名称，如 Claude Sonnet 4"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  outline: "none",
                  marginBottom: "6px",
                  boxSizing: "border-box",
                }}
              />
              <input
                placeholder="模型 ID，如 anthropic/claude-sonnet-4"
                value={newModelId}
                onChange={(e) => setNewModelId(e.target.value)}
                style={{
                  width: "100%",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  outline: "none",
                  marginBottom: "8px",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  onClick={() => setAdding(false)}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!newModelId.trim() || !newDisplayName.trim()}
                  style={{
                    flex: 1,
                    padding: "8px",
                    borderRadius: "8px",
                    border: "none",
                    background: newModelId.trim() && newDisplayName.trim() ? "var(--accent)" : "var(--bg-hover)",
                    color: newModelId.trim() && newDisplayName.trim() ? "#1a1410" : "var(--text-tertiary)",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: newModelId.trim() && newDisplayName.trim() ? "pointer" : "default",
                  }}
                >
                  添加
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "center",
                padding: "10px",
                border: "none",
                borderRadius: "8px",
                background: "transparent",
                color: "var(--accent)",
                fontSize: "13px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              + 添加模型
            </button>
          )}
        </div>
      )}
    </div>
  );
}
