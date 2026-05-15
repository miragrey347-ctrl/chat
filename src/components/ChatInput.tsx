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
      className="rounded-2xl overflow-hidden transition-colors duration-200"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="发送消息..."
        rows={3}
        disabled={disabled}
        className="w-full bg-transparent outline-none resize-none text-[15px] leading-relaxed px-5 pt-4 pb-2"
        style={{
          color: "var(--text-primary)",
          maxHeight: "200px",
          minHeight: "80px",
        }}
      />
      <div className="flex items-center justify-between px-4 pb-3 pt-0">
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          Enter 换行
        </span>
        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
          style={{
            background: value.trim() ? "var(--accent)" : "var(--bg-tertiary)",
            color: value.trim() ? "#1a1410" : "var(--text-tertiary)",
            cursor: value.trim() && !disabled ? "pointer" : "not-allowed",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" />
            <polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
