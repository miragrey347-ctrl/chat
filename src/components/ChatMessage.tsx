"use client";
import { useLocale } from "@/lib/i18n";

import { useState, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Message } from "@/lib/types";
import type { DisplaySettings } from "@/lib/useDisplaySettings";

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLocale();
  const language = className?.replace("language-", "") || "";

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(children.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [children]);

  return (
    <div className="code-block-wrapper">
      {language && (
        <div
          className="px-3 py-1.5 text-xs flex justify-between items-center rounded-t-lg"
          style={{ background: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}
        >
          <span>{language}</span>
        </div>
      )}
      <button onClick={handleCopy} className="code-copy-btn">
        {copied ? t("copied") : t("copy")}
      </button>
      <pre className={language ? "!rounded-t-none !mt-0" : ""}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  displaySettings?: DisplaySettings;
  imageData?: string[];
  onCopy?: () => void;
  onEdit?: (content: string) => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
}

export default function ChatMessage({
  message,
  isStreaming,
  displaySettings,
  imageData,
  onEdit,
  onRegenerate,
  onDelete,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [showActions, setShowActions] = useState(false);
  const { t } = useLocale();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  const handleSpeak = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const text = message.content.replace(/```[\s\S]*?```/g, "（代码块已省略）").replace(/[#*`_~\[\]()>|]/g, "");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 1.0;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      if (speaking) window.speechSynthesis.cancel();
    };
  }, [speaking]);

  // Display settings with safe defaults
  const ds = displaySettings || {
    showTimestamps: true,
    showTokenStats: true,
    showCostEstimate: false,
    showCacheStatus: false,
    thinkingMarkdown: false,
    userMarkdown: false,
    assistantMarkdown: true,
    latexRendering: true,
    autoCollapseThinking: true,
    showAvatars: false,
    showNames: false,
    showSidebar: true,
    enterToNewline: true,
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const [editSubmitting, setEditSubmitting] = useState(false);

  const handleEditSubmit = () => {
    if (editSubmitting) return;
    if (editContent.trim() && onEdit) {
      setEditSubmitting(true);
      onEdit(editContent.trim());
    }
    setEditing(false);
    setEditSubmitting(false);
  };

  // Determine if we should use markdown for this message
  const useMarkdown = isUser ? ds.userMarkdown : ds.assistantMarkdown;
  const useLatex = ds.latexRendering;

  // Build remark/rehype plugins based on settings
  const remarkPlugins: Array<typeof remarkGfm | typeof remarkMath> = [remarkGfm];
  if (useLatex) remarkPlugins.push(remarkMath);
  const rehypePlugins: Array<typeof rehypeKatex> = useLatex ? [rehypeKatex] : [];

  // Render content based on settings
  const renderContent = (content: string, isThinking?: boolean) => {
    const shouldMarkdown = isThinking ? ds.thinkingMarkdown : useMarkdown;

    if (!shouldMarkdown) {
      return (
        <div
          style={{
            fontSize: "14px",
            whiteSpace: "pre-wrap",
            color: isThinking ? "var(--text-tertiary)" : "var(--text-primary)",
            fontStyle: isThinking ? "italic" : undefined,
            lineHeight: 1.6,
          }}
        >
          {content}
        </div>
      );
    }

    return (
      <div className={`markdown-body ${!isThinking && isStreaming ? "streaming-cursor" : ""}`}>
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={{
            code({ className, children, ...props }) {
              const isBlock = className || (typeof children === "string" && children.includes("\n"));
              if (isBlock) {
                return <CodeBlock className={className}>{String(children)}</CodeBlock>;
              }
              return <code className={className} {...props}>{children}</code>;
            },
            pre({ children }) {
              return <>{children}</>;
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  return (
    <div
      style={{ padding: "12px 0" }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onTouchStart={() => setShowActions(true)}
    >
      {/* Timestamp */}
      {ds.showTimestamps && (
        <div style={{
          fontSize: "11px",
          color: "var(--text-tertiary)",
          marginBottom: "4px",
          textAlign: isUser ? "right" : "left",
          opacity: 0.7,
        }}>
          {formatTime(message.created_at)}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
        <div
          style={{
            maxWidth: isUser ? "80%" : "85%",
            borderRadius: isUser ? "20px" : undefined,
            padding: isUser ? "12px 16px" : undefined,
            background: isUser ? "var(--bg-message-user)" : undefined,
          }}
        >
          {/* Thinking block */}
          {message.thinking_content && (() => {
            const estimatedSeconds = Math.max(0.5, Math.round(message.thinking_content.length / 40 * 10) / 10);
            return (
            <details
              style={{
                marginBottom: "12px",
                background: "var(--bg-tertiary)",
                borderRadius: "12px",
                overflow: "hidden",
              }}
              open={!ds.autoCollapseThinking}
            >
              <summary style={{
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 500,
                color: "var(--text-secondary)",
                userSelect: "none",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                listStyle: "none",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                  <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/>
                  <path d="M9 21h6M10 17v1M14 17v1"/>
                </svg>
                <span>{t("thinkingLabel")}</span>
                <span style={{ fontSize: "12px", color: "var(--text-tertiary)", fontWeight: 400 }}>
                  {estimatedSeconds}s
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{marginLeft:"auto",transition:"transform 0.2s"}}>
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </summary>
              <div style={{
                padding: "0 16px 14px",
                fontSize: "14px",
                color: "var(--text-secondary)",
                lineHeight: 1.7,
              }}>
                {renderContent(message.thinking_content, true)}
              </div>
            </details>
            );
          })()}

          {/* Images */}
          {imageData && imageData.length > 0 && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
              {imageData.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt=""
                  style={{
                    maxWidth: "280px",
                    maxHeight: "280px",
                    borderRadius: "12px",
                    objectFit: "cover",
                  }}
                />
              ))}
            </div>
          )}

          {/* Content */}
          {editing ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "80px",
                  background: "var(--bg-input)",
                  border: "1px solid var(--accent)",
                  borderRadius: "12px",
                  padding: "12px",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  outline: "none",
                  resize: "vertical",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: "8px", marginTop: "8px", justifyContent: "flex-end" }}>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    padding: "6px 14px",
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
                  onClick={handleEditSubmit}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--accent)",
                    color: "#1a1410",
                    fontSize: "13px",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  重新发送
                </button>
              </div>
            </div>
          ) : (
            renderContent(message.content)
          )}
        </div>
      </div>

      {/* Token stats */}
      {ds.showTokenStats && !isUser && !isStreaming && (message.input_tokens || message.output_tokens) && (
        <div style={{
          fontSize: "11px",
          color: "var(--text-tertiary)",
          marginTop: "8px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          opacity: 0.7,
        }}>
          <span>
            {((message.input_tokens || 0) + (message.output_tokens || 0)).toLocaleString()} tokens
          </span>
          {ds.showCostEstimate && message.input_tokens && message.output_tokens && (
            <span style={{ color: "var(--accent)" }}>
              ~${((message.input_tokens * 0.003 + message.output_tokens * 0.015) / 1000).toFixed(4)}
            </span>
          )}
          {ds.showCacheStatus && message.cache_status && (
            <span>{message.cache_status}</span>
          )}
        </div>
      )}

      {/* Action bar */}
      {!isStreaming && !editing && (showActions || copied || speaking) && (
        <div style={{
          display: "flex",
          gap: "6px",
          marginTop: "6px",
          justifyContent: isUser ? "flex-end" : "flex-start",
        }}>
          <ActionBtn
            icon={copied ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            )}
            onClick={handleCopy}
          />
          {!isUser && (
            <ActionBtn
              icon={speaking ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
              )}
              onClick={handleSpeak}
            />
          )}
          {isUser && onEdit && (
            <ActionBtn
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>}
              onClick={() => { setEditing(true); setEditContent(message.content); }}
            />
          )}
          {!isUser && onRegenerate && (
            <ActionBtn
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>}
              onClick={onRegenerate}
            />
          )}
          {onDelete && (
            <ActionBtn
              icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>}
              onClick={onDelete}
              danger
            />
          )}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ icon, onClick, danger }: { icon: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        borderRadius: "8px",
        padding: "6px",
        color: danger ? "#e5737f" : "var(--text-tertiary)",
        cursor: "pointer",
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "manipulation",
      }}
    >
      {icon}
    </button>
  );
}
