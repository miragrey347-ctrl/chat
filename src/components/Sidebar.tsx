"use client";

import { useState } from "react";
import type { Conversation } from "@/lib/types";

interface SidebarProps {
  conversations: Conversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onStar: (id: string, starred: boolean) => void;
  isOpen: boolean;
  onClose: () => void;
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小时前`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}天前`;
  return new Date(dateStr).toLocaleDateString("zh-CN");
}

export default function Sidebar({
  conversations,
  currentId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onStar,
  isOpen,
  onClose,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);

  const handleRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setMenuId(null);
  };

  const submitRename = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  const starred = conversations.filter((c) => c.is_starred);
  const normal = conversations.filter((c) => !c.is_starred);

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭侧边栏"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.5)",
            zIndex: 40,
            cursor: "pointer",
            border: "none",
            padding: 0,
            margin: 0,
            WebkitTapHighlightColor: "transparent",
            WebkitAppearance: "none",
          }}
        />
      )}

      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "min(300px, 85vw)",
          background: "var(--bg-secondary)",
          borderRight: "1px solid var(--border-subtle)",
          zIndex: 50,
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 0.25s ease",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--text-primary)" }}>
            对话
          </span>
          <button
            onClick={() => { onNew(); onClose(); }}
            style={{
              background: "var(--accent)",
              color: "#1a1410",
              border: "none",
              borderRadius: "10px",
              padding: "8px 14px",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            + 新对话
          </button>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {starred.length > 0 && (
            <div style={{ padding: "8px 8px 4px", fontSize: "11px", color: "var(--text-tertiary)", fontWeight: 500 }}>
              星标
            </div>
          )}
          {starred.map((conv) => (
            <ConvItem
              key={conv.id}
              conv={conv}
              isActive={conv.id === currentId}
              isEditing={editingId === conv.id}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              submitRename={submitRename}
              menuId={menuId}
              setMenuId={setMenuId}
              onSelect={() => { onSelect(conv.id); onClose(); }}
              onRename={() => handleRename(conv)}
              onStar={() => onStar(conv.id, !conv.is_starred)}
              onDelete={() => { onDelete(conv.id); setMenuId(null); }}
            />
          ))}

          {starred.length > 0 && normal.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border-subtle)", margin: "8px 0" }} />
          )}

          {normal.map((conv) => (
            <ConvItem
              key={conv.id}
              conv={conv}
              isActive={conv.id === currentId}
              isEditing={editingId === conv.id}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              submitRename={submitRename}
              menuId={menuId}
              setMenuId={setMenuId}
              onSelect={() => { onSelect(conv.id); onClose(); }}
              onRename={() => handleRename(conv)}
              onStar={() => onStar(conv.id, !conv.is_starred)}
              onDelete={() => { onDelete(conv.id); setMenuId(null); }}
            />
          ))}

          {conversations.length === 0 && (
            <p style={{ textAlign: "center", color: "var(--text-tertiary)", fontSize: "13px", padding: "40px 0" }}>
              暂无对话
            </p>
          )}
        </div>
      </aside>
    </>
  );
}

function ConvItem({
  conv, isActive, isEditing, editTitle, setEditTitle, submitRename,
  menuId, setMenuId, onSelect, onRename, onStar, onDelete,
}: {
  conv: Conversation;
  isActive: boolean;
  isEditing: boolean;
  editTitle: string;
  setEditTitle: (v: string) => void;
  submitRename: () => void;
  menuId: string | null;
  setMenuId: (v: string | null) => void;
  onSelect: () => void;
  onRename: () => void;
  onStar: () => void;
  onDelete: () => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <div
        onClick={isEditing ? undefined : onSelect}
        style={{
          padding: "10px 12px",
          borderRadius: "12px",
          cursor: "pointer",
          background: isActive ? "var(--bg-hover)" : "transparent",
          marginBottom: "2px",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "var(--bg-tertiary)"; }}
        onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {isEditing ? (
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => e.key === "Enter" && submitRename()}
              style={{
                flex: 1,
                background: "var(--bg-input)",
                border: "1px solid var(--accent)",
                borderRadius: "6px",
                padding: "4px 8px",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
              }}
            />
          ) : (
            <span
              style={{
                fontSize: "13px",
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                flex: 1,
              }}
            >
              {conv.is_starred && "⭐ "}{conv.title}
            </span>
          )}

          {!isEditing && (
            <button
              onClick={(e) => { e.stopPropagation(); setMenuId(menuId === conv.id ? null : conv.id); }}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-tertiary)",
                cursor: "pointer",
                padding: "2px 4px",
                fontSize: "14px",
                flexShrink: 0,
              }}
            >
              ···
            </button>
          )}
        </div>

        <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "4px" }}>
          {timeAgo(conv.updated_at)}
        </div>
      </div>

      {/* Context menu */}
      {menuId === conv.id && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            right: "8px",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            borderRadius: "10px",
            padding: "4px",
            zIndex: 60,
            minWidth: "120px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          {[
            { label: "重命名", action: onRename },
            { label: conv.is_starred ? "取消星标" : "加星标", action: onStar },
            { label: "删除", action: onDelete, danger: true },
          ].map((item) => (
            <button
              key={item.label}
              onClick={(e) => { e.stopPropagation(); item.action(); setMenuId(null); }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                border: "none",
                borderRadius: "6px",
                background: "transparent",
                color: (item as { danger?: boolean }).danger ? "#e5737f" : "var(--text-primary)",
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
