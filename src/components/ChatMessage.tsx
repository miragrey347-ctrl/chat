"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "@/lib/types";

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

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`py-4 ${isUser ? "flex justify-end" : ""}`}>
      <div
        className={`${isUser ? "max-w-[80%] rounded-2xl px-4 py-3" : "max-w-[85%]"}`}
        style={isUser ? { background: "var(--bg-message-user)" } : undefined}
      >
        {/* Thinking block */}
        {message.thinking && (
          <details className="mb-3">
            <summary
              className="cursor-pointer text-xs select-none py-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              思维过程
            </summary>
            <div className="thinking-block mt-2 text-sm whitespace-pre-wrap">
              {message.thinking}
            </div>
          </details>
        )}

        {/* Message content */}
        {isUser ? (
          <div className="text-sm whitespace-pre-wrap" style={{ color: "var(--text-primary)" }}>
            {message.content}
          </div>
        ) : (
          <div className={`markdown-body ${isStreaming ? "streaming-cursor" : ""}`}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
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
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
