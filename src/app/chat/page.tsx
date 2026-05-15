"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import type { Message } from "@/lib/types";

const DEFAULT_MODEL = "anthropic/claude-sonnet-4";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [model] = useState(DEFAULT_MODEL);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (content: string) => {
    // Add user message
    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content,
      createdAt: new Date(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsStreaming(true);

    // Prepare assistant message placeholder
    const assistantMsg: Message = {
      id: generateId(),
      role: "assistant",
      content: "",
      thinking: "",
      model,
      createdAt: new Date(),
    };

    setMessages([...updatedMessages, assistantMsg]);

    // Build API messages
    const apiMessages = updatedMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      abortRef.current = new AbortController();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          model,
          stream: true,
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`API error ${response.status}: ${err}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let thinkingContent = "";
      let inThinking = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;

            if (delta?.content) {
              let chunk = delta.content;

              // Handle thinking tags
              if (chunk.includes("<thinking>")) {
                inThinking = true;
                chunk = chunk.replace("<thinking>", "");
              }
              if (chunk.includes("</thinking>")) {
                inThinking = false;
                chunk = chunk.replace("</thinking>", "");
                // Remaining chunk after </thinking> is regular content
              }

              if (inThinking) {
                thinkingContent += chunk;
              } else {
                fullContent += chunk;
              }

              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = {
                    ...last,
                    content: fullContent,
                    thinking: thinkingContent || undefined,
                  };
                }
                return updated;
              });
            }
          } catch {
            // skip
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") return;

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: `⚠️ 错误：${errorMessage}`,
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  const modelDisplayName = model.split("/").pop() || model;

  return (
    <div className="h-screen flex flex-col" style={{ background: "var(--bg-primary)" }}>
      {/* Header */}
      <header
        className="shrink-0 flex items-center justify-between px-5 py-3 border-b"
        style={{ borderColor: "var(--border-subtle)" }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            Chat
          </h1>
        </div>
        <div
          className="text-xs px-2.5 py-1 rounded-lg"
          style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
        >
          {modelDisplayName}
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto px-4 md:px-0">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-full min-h-[60vh]">
              <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
                发送一条消息开始对话
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
            />
          ))}
          <div ref={messagesEndRef} className="h-4" />
        </div>
      </main>

      {/* Input */}
      <footer className="shrink-0 px-4 pb-5 pt-2">
        <div className="max-w-2xl mx-auto">
          <ChatInput onSend={handleSend} disabled={isStreaming} />
          <p className="text-center text-xs mt-2.5" style={{ color: "var(--text-tertiary)" }}>
            AI 可能会犯错，请核实重要信息
          </p>
        </div>
      </footer>
    </div>
  );
}
