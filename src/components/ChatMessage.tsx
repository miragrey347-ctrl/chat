"use client";
import { useLocale } from "@/lib/i18n";

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import type { Message } from "@/lib/types";
import type { DisplaySettings } from "@/lib/useDisplaySettings";

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const { t } = useLocale();
  const language = className?.replace("language-", "") || "";
  const code = children.trim();

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const handleDownload = useCallback(() => {
    const ext = language || "html";
    const mimeMap: Record<string, string> = {
      html: "text/html", htm: "text/html", svg: "image/svg+xml",
      js: "text/javascript", ts: "text/typescript", css: "text/css",
      json: "application/json", py: "text/x-python", md: "text/markdown",
      txt: "text/plain", csv: "text/csv", xml: "text/xml",
    };
    const mime = mimeMap[ext] || "text/plain";
    const blob = new Blob([code], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `artifact.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [code, language]);

  // Determine if this code block can be rendered as a preview
  const isRenderable = ["html", "svg", "htm"].includes(language.toLowerCase()) ||
    (!language && code.startsWith("<") && (code.includes("<div") || code.includes("<svg") || code.includes("<!DOCTYPE")));

  if (isRenderable && showPreview) {
    // Build full HTML document for iframe
    const iframeContent = code.startsWith("<svg")
      ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100%;background:transparent;}</style></head><body>${code}</body></html>`
      : code.includes("<html") || code.includes("<!DOCTYPE")
        ? code
        : `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;padding:16px;font-family:-apple-system,system-ui,sans-serif;color:#333;}</style></head><body>${code}</body></html>`;

    return (
      <div style={{
        borderRadius: "12px",
        overflow: "hidden",
        border: "0.5px solid var(--border-color)",
        margin: "8px 0",
      }}>
        {/* Toolbar */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 12px",
          background: "var(--bg-tertiary)",
          fontSize: "12px",
          color: "var(--text-tertiary)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
            <span>{language || "html"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <button
              onClick={() => setShowPreview(false)}
              style={{
                background: "none", border: "none", color: "var(--text-tertiary)",
                cursor: "pointer", padding: "4px 8px", fontSize: "12px",
                display: "flex", alignItems: "center", gap: "4px",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              Code
            </button>
            <button
              onClick={handleDownload}
              style={{
                background: "none", border: "none", color: "var(--text-tertiary)",
                cursor: "pointer", padding: "4px 8px", fontSize: "12px",
                display: "flex", alignItems: "center", gap: "4px",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button
              onClick={handleCopy}
              style={{
                background: "none", border: "none", color: "var(--text-tertiary)",
                cursor: "pointer", padding: "4px 8px", fontSize: "12px",
              }}
            >
              {copied ? "✓" : "Copy"}
            </button>
          </div>
        </div>
        {/* Preview iframe */}
        <iframe
          srcDoc={iframeContent}
          sandbox="allow-scripts"
          style={{
            width: "100%",
            minHeight: "200px",
            border: "none",
            background: "#fff",
            display: "block",
          }}
          onLoad={(e) => {
            // Auto-resize iframe to content height
            const iframe = e.target as HTMLIFrameElement;
            try {
              const h = iframe.contentDocument?.body?.scrollHeight;
              if (h) iframe.style.height = Math.min(Math.max(h + 20, 200), 600) + "px";
            } catch { /* cross-origin */ }
          }}
        />
      </div>
    );
  }

  return (
    <div className="code-block-wrapper">
      {(language || isRenderable) && (
        <div
          className="px-3 py-1.5 text-xs flex justify-between items-center rounded-t-lg"
          style={{ background: "var(--bg-tertiary)", color: "var(--text-tertiary)" }}
        >
          <span>{language || "html"}</span>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {isRenderable && (
              <button
                onClick={() => setShowPreview(true)}
                style={{
                  background: "none", border: "none", color: "var(--accent)",
                  cursor: "pointer", padding: "2px 6px", fontSize: "12px",
                  display: "flex", alignItems: "center", gap: "4px",
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                Preview
              </button>
            )}
          </div>
        </div>
      )}
      <button onClick={handleCopy} className="code-copy-btn">
        {copied ? t("copied") : t("copy")}
      </button>
      <pre className={language ? "!rounded-t-none !mt-0" : ""}>
        <code className={className}>{code}</code>
      </pre>
    </div>
  );
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Auto-sizing iframe for render_visual
function VisualIframe({ srcDoc, msgId, fixedHeight }: { srcDoc: string; msgId: string; fixedHeight?: number }) {
  const ref = React.useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(fixedHeight || 100);

  useEffect(() => {
    if (fixedHeight) return;
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "iframe-height" && e.data.id === msgId) {
        setHeight(Math.max(e.data.height, 50));
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [msgId, fixedHeight]);

  return (
    <iframe
      ref={ref}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      style={{ width: "100%", height: height + "px", border: "none", display: "block", background: "transparent", marginTop: "8px" }}
    />
  );
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  displaySettings?: DisplaySettings;
  imageData?: string[];
  assistantAvatarUrl?: string | null;
  assistantName?: string;
  onCopy?: () => void;
  onEdit?: (content: string) => void;
  onRegenerate?: () => void;
  onDelete?: () => void;
  onChoiceSelect?: (value: string) => void;
}

export default function ChatMessage({
  message,
  isStreaming,
  displaySettings,
  imageData,
  assistantAvatarUrl,
  assistantName,
  onEdit,
  onRegenerate,
  onDelete,
  onChoiceSelect,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [showActions, setShowActions] = useState(false);
  const { t } = useLocale();

  // Parse embedded tool_calls from content
  const toolCallsFromContent = useMemo(() => {
    const match = message.content.match(/<!-- TOOL_CALLS:([A-Za-z0-9+/=]+) -->/);
    if (!match) return null;
    try {
      return JSON.parse(decodeURIComponent(escape(atob(match[1])))) as Array<{ name: string; arguments: string }>;
    } catch { return null; }
  }, [message.content]);

  // Parse embedded search sources from content
  const searchSourcesFromContent = useMemo(() => {
    const match = message.content.match(/<!-- SEARCH_SOURCES:([A-Za-z0-9+/=]+) -->/);
    if (!match) return null;
    try {
      return JSON.parse(decodeURIComponent(escape(atob(match[1])))) as Array<{ title: string; snippet: string; url: string }>;
    } catch { return null; }
  }, [message.content]);

  const effectiveToolCalls = message.tool_calls || toolCallsFromContent;
  const searchSources = searchSourcesFromContent;

  // Strip markers from displayed content
  const displayContent = message.content
    .replace(/\n*<!-- TOOL_CALLS:[A-Za-z0-9+/=]+ -->/, "")
    .replace(/\n*<!-- SEARCH_SOURCES:[A-Za-z0-9+/=]+ -->/, "")
    .trim();
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleSpeak = async () => {
    if (speaking || ttsLoading) {
      // Stop
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current.src = "";
        ttsAudioRef.current = null;
      }
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setTtsLoading(false);
      return;
    }

    const text = message.content
      .replace(/```[\s\S]*?```/g, "")
      .replace(/[#*`_~\[\]()>|]/g, "")
      .trim();
    if (!text) return;

    const VALID_MODELS = ["openai/gpt-4o-mini-tts-2025-12-15", "mistralai/voxtral-mini-tts-2603", "x-ai/grok-voice-tts-1.0"];
    let ttsModel = localStorage.getItem("tts-model") || "openai/gpt-4o-mini-tts-2025-12-15";
    const ttsVoice = localStorage.getItem("tts-voice") || "nova";
    if (!VALID_MODELS.includes(ttsModel)) {
      ttsModel = "openai/gpt-4o-mini-tts-2025-12-15";
      localStorage.setItem("tts-model", ttsModel);
      localStorage.setItem("tts-voice", "nova");
    }

    setTtsLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, model: ttsModel, voice: ttsVoice }),
      });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      if (blob.size === 0) throw new Error("Empty audio");
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      ttsAudioRef.current = audio;
      setTtsLoading(false);
      setSpeaking(true);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        ttsAudioRef.current = null;
        setSpeaking(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        ttsAudioRef.current = null;
        setSpeaking(false);
      };
      await audio.play();
    } catch (e) {
      console.error("TTS error:", e);
      setTtsLoading(false);
      setSpeaking(false);
    }
  };

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      if (ttsAudioRef.current) {
        ttsAudioRef.current.pause();
        ttsAudioRef.current.src = "";
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  // Display settings with safe defaults
  const ds = displaySettings || {
    showTimestamps: true,
    showTokenStats: true,
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

      <div style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start", gap: "8px" }}>
        {/* Avatar - assistant side */}
        {ds.showAvatars && !isUser && (() => {
          const initial = (assistantName?.[0] || message.model_used?.split("/").pop()?.[0] || "A").toUpperCase();
          return assistantAvatarUrl ? (
            <img src={assistantAvatarUrl} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, marginTop: "2px" }} />
          ) : (
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              background: "var(--accent-muted)", color: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", fontWeight: 600, flexShrink: 0, marginTop: "2px",
            }}>
              {initial}
            </div>
          );
        })()}
        <div style={{ minWidth: 0, maxWidth: isUser ? "80%" : undefined }}>
          {/* Name */}
          {ds.showNames && (
            <div style={{
              fontSize: "12px", fontWeight: 500, color: "var(--text-tertiary)",
              marginBottom: "4px", textAlign: isUser ? "right" : "left",
            }}>
              {isUser
                ? (typeof window !== "undefined" ? localStorage.getItem("user-name") : null) || "You"
                : assistantName || (message.model_used?.split("/").pop() || "Assistant")}
            </div>
          )}
        <div
          style={{
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

          {/* Images - from content URLs or imageData prop */}
          {(() => {
            // Extract markdown image URLs from content: ![name](url)
            const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
            const contentUrls: string[] = [];
            let match;
            while ((match = imgRegex.exec(displayContent)) !== null) {
              contentUrls.push(match[2]);
            }
            const images = contentUrls.length > 0 ? contentUrls : (imageData || []);
            if (images.length === 0) return null;
            return (
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                {images.map((src, idx) => (
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
            );
          })()}

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
            renderContent(displayContent.replace(/!\[[^\]]*\]\([^)]+\)/g, "").replace(/\[图片: [^\]]+\]/g, "").trim())
          )}
        </div>
        </div>
        {/* Avatar - user side */}
        {ds.showAvatars && isUser && (() => {
          const uAvatar = typeof window !== "undefined" ? localStorage.getItem("user-avatar") : null;
          const uName = typeof window !== "undefined" ? localStorage.getItem("user-name") : null;
          const initial = (uName?.[0] || "U").toUpperCase();
          return uAvatar ? (
            <img src={uAvatar} alt="" style={{ width: "28px", height: "28px", borderRadius: "50%", objectFit: "cover", flexShrink: 0, marginTop: "2px" }} />
          ) : (
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              background: "var(--accent-muted)", color: "var(--accent)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "13px", fontWeight: 600, flexShrink: 0, marginTop: "2px",
            }}>
              {initial}
            </div>
          );
        })()}
      </div>

      {/* Interactive choice buttons */}
      {!isStreaming && effectiveToolCalls && effectiveToolCalls.length > 0 && (() => {
        const elements: React.ReactNode[] = [];

        // Choice buttons
        const choiceCall = effectiveToolCalls.find((tc) => tc.name === "present_choices");
        if (choiceCall) {
          try {
            const { options } = JSON.parse(choiceCall.arguments) as { question?: string; options: Array<{ label: string; value: string }> };
            if (options && options.length > 0) {
              elements.push(
                <div key="choices" style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "10px" }}>
                  {options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => onChoiceSelect?.(opt.value)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "20px",
                        border: "1.5px solid var(--accent)",
                        background: "transparent",
                        color: "var(--accent)",
                        fontSize: "14px",
                        fontWeight: 500,
                        cursor: "pointer",
                        transition: "all 0.15s",
                        touchAction: "manipulation",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "#fff"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--accent)"; }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              );
            }
          } catch { /* skip */ }
        }

        // Visual card - seamless inline rendering
        const visualCall = effectiveToolCalls.find((tc) => tc.name === "render_visual");
        if (visualCall) {
          try {
            const { html, height } = JSON.parse(visualCall.arguments) as { title?: string; html: string; height?: number };
            // Inject auto-height reporting script
            const heightScript = `<script>
function reportHeight(){
  var els=document.body.children;var maxH=0;
  for(var i=0;i<els.length;i++){var r=els[i].getBoundingClientRect();var b=r.top+r.height;if(b>maxH)maxH=b;}
  if(maxH<10)maxH=document.body.scrollHeight;
  window.parent.postMessage({type:'iframe-height',height:Math.ceil(maxH),id:'${message.id}'},'*');
}
new ResizeObserver(reportHeight).observe(document.body);
setTimeout(reportHeight,100);setTimeout(reportHeight,500);
</script>`;
            const iframeDoc = html.includes("<html") || html.includes("<!DOCTYPE")
              ? html.replace("</body>", heightScript + "</body>")
              : `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,system-ui,sans-serif;background:transparent;overflow:hidden;}img,svg,canvas{max-width:100%;height:auto;}</style></head><body>${html}${heightScript}</body></html>`;
            elements.push(
              <VisualIframe key="visual" srcDoc={iframeDoc} msgId={message.id} fixedHeight={height} />
            );
          } catch { /* skip */ }
        }

        return elements.length > 0 ? <>{elements}</> : null;
      })()}

      {/* Search source cards */}
      {!isStreaming && searchSources && searchSources.length > 0 && (
        <details style={{ marginTop: "10px" }}>
          <summary style={{
            cursor: "pointer",
            fontSize: "13px",
            color: "var(--text-tertiary)",
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            listStyle: "none",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            {searchSources.length} {t("sources") || "sources"}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
            {searchSources.map((s, i) => {
              const domain = (() => { try { return new URL(s.url).hostname.replace("www.", ""); } catch { return s.url; } })();
              return (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    background: "var(--bg-tertiary)",
                    textDecoration: "none",
                    color: "var(--text-primary)",
                    transition: "opacity 0.15s",
                  }}
                >
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
                    alt=""
                    width={20}
                    height={20}
                    style={{ borderRadius: "4px", flexShrink: 0 }}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "13px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                      {domain}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </details>
      )}

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
          {ds.showCacheStatus && message.cache_status && (() => {
            const s = message.cache_status;
            // Translate stored cache status (may be in Chinese or English)
            const hitMatch = s.match(/(?:缓存命中|Cache hit)[：:]\s*(\d+)\s*tokens.*?(?:命中率|Hit rate)\s*([\d.]+)%/);
            const writeMatch = s.match(/(?:缓存写入|Cache write)[：:]\s*(\d+)\s*tokens/);
            if (hitMatch) return <span>{t("cacheHitLabel")}: {hitMatch[1]} tokens ({t("hitRateLabel")} {hitMatch[2]}%)</span>;
            if (writeMatch) return <span>{t("cacheWriteLabel")}: {writeMatch[1]} tokens</span>;
            return <span>{s}</span>;
          })()}
        </div>
      )}

      {/* Action bar */}
      {!isStreaming && !editing && (showActions || copied || speaking || ttsLoading) && (
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
              icon={ttsLoading ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              ) : speaking ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
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
