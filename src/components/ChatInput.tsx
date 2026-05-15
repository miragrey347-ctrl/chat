"use client";

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "24px",
        overflow: "hidden",
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="发送消息..."
        rows={4}
        disabled={disabled}
        style={{
          width: "100%",
          background: "transparent",
          color: "var(--text-primary)",
          border: "none",
          outline: "none",
          resize: "none",
          fontSize: "15px",
          lineHeight: "1.8",
          padding: "20px 20px 4px 20px",
          minHeight: "120px",
          maxHeight: "200px",
          boxSizing: "border-box",
          WebkitAppearance: "none",
          fontFamily: "inherit",
        }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "4px 16px 16px 16px",
        }}
      >
        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--accent)",
            color: "#1a1410",
            border: "none",
            opacity: value.trim() && !disabled ? 1 : 0.35,
            cursor: value.trim() && !disabled ? "pointer" : "default",
            transition: "opacity 0.2s",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
