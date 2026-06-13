"use client";
import { useLocale } from "@/lib/i18n";

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

function timeAgo(dateStr: string, locale: string = "zh") {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const isEn = locale === "en";
  if (mins < 1) return isEn ? "Just now" : "刚刚";
  if (mins < 60) return isEn ? `${mins} min ago` : `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return isEn ? `${hrs} hr ago` : `${hrs}小时前`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return isEn ? `${days}d ago` : `${days}天前`;
  return new Date(dateStr).toLocaleDateString(isEn ? "en-US" : "zh-CN");
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
  const { t } = useLocale();

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
      {/* Full-screen container when open: sidebar on left, tap-to-close area on right */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 50,
          pointerEvents: isOpen ? "auto" : "none",
        }}
      >
        {/* Dark overlay - covers everything, click closes sidebar */}
        <div
          onClick={onClose}
          style={{
            position: "absolute",
            inset: 0,
            background: isOpen ? "rgba(0,0,0,0.5)" : "transparent",
            transition: "background 0.25s ease",
          }}
        />

        {/* Sidebar panel */}
        <aside
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            width: "min(300px, 85vw)",
            background: "var(--bg-secondary)",
            borderRight: "1px solid var(--border-subtle)",
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
            {t("conversations")}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
              {t("newChat")}
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-tertiary)",
                fontSize: "18px",
                cursor: "pointer",
                padding: "4px 2px",
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
          {starred.length > 0 && (
            <div style={{ padding: "8px 8px 4px", fontSize: "11px", color: "var(--text-tertiary)", fontWeight: 500 }}>
              {t("starred")}
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
              {t("noConversations")}
            </p>
          )}
        </div>
      </aside>
      </div>
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
  const { locale, t } = useLocale();
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
              {conv.is_starred && <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5" style={{display:"inline",verticalAlign:"-1px",marginRight:"4px"}}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}{conv.title}
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
          {timeAgo(conv.updated_at, locale)}
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
            { label: t("rename"), action: onRename, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg> },
            { label: conv.is_starred ? t("removeStar") : t("addStar"), action: onStar, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill={conv.is_starred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
            { label: t("delete"), action: onDelete, danger: true, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> },
          ].map((item) => (
            <button
              key={item.label}
              onClick={(e) => { e.stopPropagation(); item.action(); setMenuId(null); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
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
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
