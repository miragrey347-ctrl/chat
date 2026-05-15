"use client";

import { useState, useRef, useEffect } from "react";

const MODELS = [
  { id: "anthropic/claude-sonnet-4", name: "Claude Sonnet 4" },
  { id: "anthropic/claude-opus-4", name: "Claude Opus 4" },
  { id: "anthropic/claude-haiku-3.5", name: "Claude Haiku 3.5" },
  { id: "openai/gpt-4.1", name: "GPT-4.1" },
  { id: "openai/gpt-4.1-mini", name: "GPT-4.1 Mini" },
  { id: "openai/gpt-4.1-nano", name: "GPT-4.1 Nano" },
  { id: "openai/o4-mini", name: "o4-mini" },
  { id: "google/gemini-2.5-pro-preview", name: "Gemini 2.5 Pro" },
  { id: "google/gemini-2.5-flash-preview", name: "Gemini 2.5 Flash" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1" },
  { id: "deepseek/deepseek-chat", name: "DeepSeek V3" },
];

interface ModelSelectorProps {
  currentModel: string;
  onChange: (model: string) => void;
}

export default function ModelSelector({ currentModel, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentName = MODELS.find((m) => m.id === currentModel)?.name || currentModel.split("/").pop();

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
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--bg-tertiary)",
            border: "1px solid var(--border-color)",
            borderRadius: "14px",
            padding: "6px",
            zIndex: 100,
            minWidth: "200px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
          }}
        >
          {MODELS.map((m) => (
            <button
              key={m.id}
              onClick={() => { onChange(m.id); setOpen(false); }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "10px 14px",
                border: "none",
                borderRadius: "8px",
                background: m.id === currentModel ? "var(--accent-muted)" : "transparent",
                color: m.id === currentModel ? "var(--accent)" : "var(--text-primary)",
                fontSize: "13px",
                cursor: "pointer",
                fontWeight: m.id === currentModel ? 600 : 400,
              }}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
