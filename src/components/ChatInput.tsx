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
      className="border rounded-2xl flex items-end gap-3 px-4 py-3"
      style={{
        background: "var(--bg-input)",
        borderColor: "var(--border-color)",
      }}
    >
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="发送消息..."
        rows={2}
        disabled={disabled}
        className="flex-1 bg-transparent outline-none resize-none text-[15px] leading-relaxed"
        style={{
          color: "var(--text-primary)",
          maxHeight: "200px",
          minHeight: "44px",
        }}
      />
      <button
        onClick={handleSend}
        disabled={!value.trim() || disabled}
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all mb-0.5"
        style={{
          background: value.trim() ? "var(--accent)" : "var(--bg-tertiary)",
          color: value.trim() ? "#1a1410" : "var(--text-tertiary)",
          cursor: value.trim() && !disabled ? "pointer" : "not-allowed",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 13L13 8L3 3V7L9 8L3 9V13Z"
            fill="currentColor"
          />
        </svg>
      </button>
    </div>
  );
}
