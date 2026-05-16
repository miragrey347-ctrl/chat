"use client";

import { useState, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Message } from "@/lib/types";
import type { DisplaySettings } from "@/lib/useDisplaySettings";

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
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
        {copied ? "已复制" : "复制"}
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
  onCopy?: () => void;
  onEdit?: (content: string) => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
}

export default function ChatMessage({
  message,
  isStreaming,
  displaySettings,
  onEdit,
  onRegenerate,
  onDelete,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [showActions, setShowActions] = useState(false);
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

  const handleEditSubmit = () => {
    if (editContent.trim() && onEdit) {
      onEdit(editContent.trim());
    }
    setEditing(false);
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
          {message.thinking_content && (
            <details
              style={{ marginBottom: "12px" }}
              open={!ds.autoCollapseThinking}
            >
              <summary style={{
                cursor: "pointer",
                fontSize: "12px",
                color: "var(--text-tertiary)",
                userSelect: "none",
                padding: "4px 0",
              }}>
                思维过程
              </summary>
              <div style={{
                borderLeft: "2px solid var(--text-tertiary)",
                paddingLeft: "12px",
                marginTop: "8px",
              }}>
                {renderContent(message.thinking_content, true)}
              </div>
            </details>
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
          flexDirection: "column",
          gap: "2px",
          opacity: 0.7,
        }}>
          <div style={{ display: "flex", gap: "12px" }}>
            {message.input_tokens && <span>输入: {message.input_tokens.toLocaleString()}</span>}
            {message.output_tokens && <span>输出: {message.output_tokens.toLocaleString()}</span>}
            {message.input_tokens && message.output_tokens && (
              <span>共: {(message.input_tokens + message.output_tokens).toLocaleString()}</span>
            )}
            {ds.showCostEstimate && message.input_tokens && message.output_tokens && (
              <span style={{ color: "var(--accent)" }}>
                ~${((message.input_tokens * 0.003 + message.output_tokens * 0.015) / 1000).toFixed(4)}
              </span>
            )}
          </div>
          {ds.showCacheStatus && message.cache_status && (
            <div>{message.cache_status}</div>
          )}
        </div>
      )}

      {/* Action bar */}
      {!isStreaming && !editing && (showActions || copied || speaking) && (
        <div style={{
          display: "flex",
          gap: "4px",
          marginTop: "6px",
          justifyContent: isUser ? "flex-end" : "flex-start",
        }}>
          <ActionBtn label={copied ? "已复制" : "复制"} onClick={handleCopy} />
          {!isUser && (
            <ActionBtn label={speaking ? "⏹ 停止" : "🔊 朗读"} onClick={handleSpeak} />
          )}
          {isUser && onEdit && (
            <ActionBtn label="编辑" onClick={() => { setEditing(true); setEditContent(message.content); }} />
          )}
          {!isUser && onRegenerate && (
            <ActionBtn label="重新生成" onClick={onRegenerate} />
          )}
          {onDelete && (
            <ActionBtn label="删除" onClick={onDelete} danger />
          )}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ label, onClick, danger }: { label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: "transparent",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        padding: "4px 10px",
        fontSize: "11px",
        color: danger ? "#e5737f" : "var(--text-tertiary)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}
