"use client";

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
}

export default function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter = newline (default), no send shortcut
    // This matches the spec: Enter = 换行, send = click button
  };

  return (
    <div
      className="border rounded-3xl flex flex-col overflow-hidden"
      style={{
        background: "var(--bg-secondary)",
        borderColor: "var(--border-color)",
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="发送消息..."
        rows={1}
        disabled={disabled}
        className="flex-1 bg-transparent outline-none resize-none text-[15px] leading-relaxed px-5 pt-4 pb-1"
        style={{
          color: "var(--text-primary)",
          maxHeight: "200px",
          minHeight: "48px",
        }}
      />
      <div className="flex items-center justify-end px-3 pb-3 pt-1">
        <button
          onClick={handleSend}
          disabled={!value.trim() || disabled}
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all"
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
