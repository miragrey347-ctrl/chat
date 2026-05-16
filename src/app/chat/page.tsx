"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import ModelSelector from "@/components/ModelSelector";
import AssistantManager from "@/components/AssistantManager";
import type { Message, Conversation, Assistant } from "@/lib/types";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function ChatPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assistantManagerOpen, setAssistantManagerOpen] = useState(false);
  const [model, setModel] = useState("anthropic/claude-sonnet-4");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load conversations and assistants on mount
  useEffect(() => {
    fetchConversations();
    fetchAssistants();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/conversations");
      const data = await res.json();
      if (Array.isArray(data)) setConversations(data);
    } catch (e) {
      console.error("Failed to fetch conversations:", e);
    }
  };

  const fetchAssistants = async () => {
    try {
      const res = await fetch("/api/assistants");
      const data = await res.json();
      if (Array.isArray(data)) setAssistants(data);
    } catch (e) {
      console.error("Failed to fetch assistants:", e);
    }
  };

  // Load messages when conversation changes
  useEffect(() => {
    if (!currentConvId) {
      setMessages([]);
      return;
    }
    fetchMessages(currentConvId);

    // Set model from conversation
    const conv = conversations.find((c) => c.id === currentConvId);
    if (conv) setModel(conv.current_model);
  }, [currentConvId]);

  const fetchMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/messages?conversation_id=${convId}`);
      const data = await res.json();
      if (Array.isArray(data)) setMessages(data);
    } catch (e) {
      console.error("Failed to fetch messages:", e);
    }
  };

  // Auto scroll
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Get current assistant's system prompt
  const [globalMemories, setGlobalMemories] = useState<{ id: string; content: string }[]>([]);
  const [assistantMemories, setAssistantMemories] = useState<{ id: string; content: string }[]>([]);

  // Fetch global memories on mount
  useEffect(() => {
    fetchGlobalMemories();
  }, []);

  const fetchGlobalMemories = async () => {
    try {
      const res = await fetch("/api/memories?type=global");
      const data = await res.json();
      if (Array.isArray(data)) setGlobalMemories(data);
    } catch (e) { console.error("Failed to fetch global memories:", e); }
  };

  // Fetch assistant memories when conversation changes
  useEffect(() => {
    const assistant = getCurrentAssistantRaw();
    if (assistant?.memory_enabled && assistant?.id) {
      fetchAssistantMemories(assistant.id);
    } else {
      setAssistantMemories([]);
    }
  }, [currentConvId, conversations, assistants]);

  const fetchAssistantMemories = async (assistantId: string) => {
    try {
      const res = await fetch(`/api/memories?assistant_id=${assistantId}`);
      const data = await res.json();
      if (Array.isArray(data)) setAssistantMemories(data);
    } catch (e) { console.error("Failed to fetch assistant memories:", e); }
  };

  // Raw helper (no dependency on state setters)
  const getCurrentAssistantRaw = (): Assistant | null => {
    if (!currentConvId) return assistants[0] || null;
    const conv = conversations.find((c) => c.id === currentConvId);
    if (!conv?.assistant_id) return null;
    return assistants.find((a) => a.id === conv.assistant_id) || null;
  };

  const getCurrentSystemPrompt = () => {
    const conv = conversations.find((c) => c.id === currentConvId);
    const assistant = conv?.assistant_id ? assistants.find((a) => a.id === conv.assistant_id) : null;
    let prompt = assistant?.system_prompt || "";

    // Inject memories
    const memoryParts: string[] = [];
    if (globalMemories.length > 0) {
      memoryParts.push("## 全局记忆\n" + globalMemories.map((m) => "- " + m.content).join("\n"));
    }
    if (assistant?.memory_enabled && assistantMemories.length > 0) {
      memoryParts.push("## 助手记忆\n" + assistantMemories.map((m) => "- " + m.content).join("\n"));
    }

    if (memoryParts.length > 0) {
      const memoryBlock = "\n\n<memories>\n" + memoryParts.join("\n\n") + "\n</memories>";
      prompt = prompt ? prompt + memoryBlock : memoryBlock;
    }

    return prompt;
  };

  const getCurrentAssistant = (): Assistant | null => {
    return getCurrentAssistantRaw();
  };

  // Create new conversation
  const handleNewConversation = async () => {
    try {
      const defaultAssistant = assistants[0];
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assistant_id: defaultAssistant?.id || null,
          current_model: model,
        }),
      });
      const conv = await res.json();
      if (conv.id) {
        await fetchConversations();
        setCurrentConvId(conv.id);
        setMessages([]);
      }
    } catch (e) {
      console.error("Failed to create conversation:", e);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      await fetch("/api/conversations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (currentConvId === id) {
        setCurrentConvId(null);
        setMessages([]);
      }
      await fetchConversations();
    } catch (e) {
      console.error("Failed to delete conversation:", e);
    }
  };

  // Rename conversation
  const handleRename = async (id: string, title: string) => {
    try {
      await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title }),
      });
      await fetchConversations();
    } catch (e) {
      console.error("Failed to rename:", e);
    }
  };

  // Star/unstar
  const handleStar = async (id: string, starred: boolean) => {
    try {
      await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, is_starred: starred }),
      });
      await fetchConversations();
    } catch (e) {
      console.error("Failed to star:", e);
    }
  };

  // Model change
  const handleModelChange = async (newModel: string) => {
    setModel(newModel);
    if (currentConvId) {
      await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: currentConvId, current_model: newModel }),
      });
    }
  };

  // Save message to DB
  const saveMessage = async (msg: {
    conversation_id: string;
    role: string;
    content: string;
    thinking_content?: string;
    model_used?: string;
    input_tokens?: number | null;
    output_tokens?: number | null;
  }) => {
    try {
      await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg),
      });
    } catch (e) {
      console.error("Failed to save message:", e);
    }
  };

  // Auto-title based on first message
  const autoTitle = async (convId: string, content: string) => {
    const title = content.slice(0, 30) + (content.length > 30 ? "..." : "");
    await handleRename(convId, title);
  };

  // Send message
  const handleSend = async (content: string) => {
    // Auto-create conversation if none selected
    let convId = currentConvId;
    if (!convId) {
      try {
        const defaultAssistant = assistants[0];
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assistant_id: defaultAssistant?.id || null,
            current_model: model,
          }),
        });
        const conv = await res.json();
        convId = conv.id;
        setCurrentConvId(conv.id);
        await fetchConversations();
      } catch (e) {
        console.error("Failed to create conversation:", e);
        return;
      }
    }

    // User message
    const userMsg: Message = {
      id: generateId(),
      conversation_id: convId!,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsStreaming(true);

    // Save user message
    saveMessage({ conversation_id: convId!, role: "user", content });

    // Auto-title on first message
    if (updatedMessages.filter((m) => m.role === "user").length === 1) {
      autoTitle(convId!, content);
    }

    // Placeholder for assistant
    const assistantMsg: Message = {
      id: generateId(),
      conversation_id: convId!,
      role: "assistant",
      content: "",
      thinking_content: "",
      model_used: model,
      created_at: new Date().toISOString(),
    };
    setMessages([...updatedMessages, assistantMsg]);

    // Build API messages
    const systemPrompt = getCurrentSystemPrompt();
    const apiMessages: { role: string; content: string }[] = [];

    if (systemPrompt) {
      apiMessages.push({ role: "system", content: systemPrompt });
    }

    updatedMessages.forEach((m) => {
      apiMessages.push({ role: m.role, content: m.content });
    });

    try {
      abortRef.current = new AbortController();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, model, stream: true, caching: true }),
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
      let usageData: { prompt_tokens?: number; completion_tokens?: number } = {};

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

            // Capture usage data
            if (parsed.usage) {
              usageData = parsed.usage;
            }

            const delta = parsed.choices?.[0]?.delta;

            if (delta?.content) {
              let chunk = delta.content;

              if (chunk.includes("<thinking>")) {
                inThinking = true;
                chunk = chunk.replace("<thinking>", "");
              }
              if (chunk.includes("</thinking>")) {
                inThinking = false;
                chunk = chunk.replace("</thinking>", "");
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
                    thinking_content: thinkingContent || undefined,
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

      // Save assistant message to DB with token stats
      saveMessage({
        conversation_id: convId!,
        role: "assistant",
        content: fullContent,
        thinking_content: thinkingContent || undefined,
        model_used: model,
        input_tokens: usageData.prompt_tokens || null,
        output_tokens: usageData.completion_tokens || null,
      });

      // Update local message with token stats
      if (usageData.prompt_tokens || usageData.completion_tokens) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === "assistant") {
            updated[updated.length - 1] = {
              ...last,
              input_tokens: usageData.prompt_tokens,
              output_tokens: usageData.completion_tokens,
            };
          }
          return updated;
        });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") return;

      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          updated[updated.length - 1] = { ...last, content: `⚠️ 错误：${errorMessage}` };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  // Edit and resend: remove messages after index, send new content
  const handleEditResend = async (index: number, newContent: string) => {
    if (!currentConvId) return;

    // Delete messages from DB (from edited index onward)
    const toDelete = messages.slice(index);
    for (const msg of toDelete) {
      await fetch("/api/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: msg.id }),
      });
    }

    // Keep messages before edited one, add new user message
    const kept = messages.slice(0, index);
    const newUserMsg: Message = {
      id: generateId(),
      conversation_id: currentConvId,
      role: "user",
      content: newContent,
      created_at: new Date().toISOString(),
    };
    const newAssistant: Message = {
      id: generateId(),
      conversation_id: currentConvId,
      role: "assistant",
      content: "",
      thinking_content: "",
      model_used: model,
      created_at: new Date().toISOString(),
    };

    const updatedKept = [...kept, newUserMsg];
    setMessages([...updatedKept, newAssistant]);
    setIsStreaming(true);

    // Save new user message to DB
    saveMessage({ conversation_id: currentConvId, role: "user", content: newContent });

    // Build API messages
    const systemPrompt = getCurrentSystemPrompt();
    const apiMessages: { role: string; content: string }[] = [];
    if (systemPrompt) apiMessages.push({ role: "system", content: systemPrompt });
    updatedKept.forEach((m) => apiMessages.push({ role: m.role, content: m.content }));

    try {
      abortRef.current = new AbortController();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, model, stream: true, caching: true }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`API error ${response.status}`);
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
              if (chunk.includes("<thinking>")) { inThinking = true; chunk = chunk.replace("<thinking>", ""); }
              if (chunk.includes("</thinking>")) { inThinking = false; chunk = chunk.replace("</thinking>", ""); }
              if (inThinking) thinkingContent += chunk; else fullContent += chunk;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: fullContent, thinking_content: thinkingContent || undefined };
                }
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }

      saveMessage({
        conversation_id: currentConvId,
        role: "assistant",
        content: fullContent,
        thinking_content: thinkingContent || undefined,
        model_used: model,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") return;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") updated[updated.length - 1] = { ...last, content: `⚠️ 错误：${errorMessage}` };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  // Regenerate: remove last assistant message, re-request with same context
  const handleRegenerate = async () => {
    if (!currentConvId || messages.length < 2) return;

    const lastAssistant = messages[messages.length - 1];
    if (lastAssistant.role !== "assistant") return;

    // Delete assistant message from DB
    await fetch("/api/messages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lastAssistant.id }),
    });

    // Keep all messages except last assistant
    const kept = messages.slice(0, -1);

    // Create new placeholder
    const newAssistant: Message = {
      id: generateId(),
      conversation_id: currentConvId,
      role: "assistant",
      content: "",
      thinking_content: "",
      model_used: model,
      created_at: new Date().toISOString(),
    };
    setMessages([...kept, newAssistant]);
    setIsStreaming(true);

    // Build API messages
    const systemPrompt = getCurrentSystemPrompt();
    const apiMessages: { role: string; content: string }[] = [];
    if (systemPrompt) apiMessages.push({ role: "system", content: systemPrompt });
    kept.forEach((m) => apiMessages.push({ role: m.role, content: m.content }));

    try {
      abortRef.current = new AbortController();
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, model, stream: true, caching: true }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) throw new Error(`API error ${response.status}`);

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
              if (chunk.includes("<thinking>")) { inThinking = true; chunk = chunk.replace("<thinking>", ""); }
              if (chunk.includes("</thinking>")) { inThinking = false; chunk = chunk.replace("</thinking>", ""); }
              if (inThinking) thinkingContent += chunk; else fullContent += chunk;

              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = { ...last, content: fullContent, thinking_content: thinkingContent || undefined };
                }
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }

      saveMessage({
        conversation_id: currentConvId,
        role: "assistant",
        content: fullContent,
        thinking_content: thinkingContent || undefined,
        model_used: model,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") return;
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") updated[updated.length - 1] = { ...last, content: `⚠️ 错误：${errorMessage}` };
        return updated;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  };

  // Delete single message
  const handleDeleteMessage = async (msgId: string, index: number) => {
    await fetch("/api/messages", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: msgId }),
    });

    // If deleting user message, also delete the following assistant message
    const updated = [...messages];
    if (messages[index].role === "user" && messages[index + 1]?.role === "assistant") {
      await fetch("/api/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: messages[index + 1].id }),
      });
      updated.splice(index, 2);
    } else {
      updated.splice(index, 1);
    }
    setMessages(updated);
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-primary)" }}>
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        currentId={currentConvId}
        onSelect={setCurrentConvId}
        onNew={handleNewConversation}
        onDelete={handleDeleteConversation}
        onRename={handleRename}
        onStar={handleStar}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Header */}
      <header
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            padding: "6px",
            fontSize: "18px",
          }}
        >
          ☰
        </button>

        <ModelSelector currentModel={model} onChange={handleModelChange} />

        <button
          onClick={() => router.push("/settings")}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            padding: "6px",
            fontSize: "16px",
          }}
        >
          ⚙
        </button>
      </header>

      {/* Assistant Manager */}
      <AssistantManager
        assistants={assistants}
        isOpen={assistantManagerOpen}
        onClose={() => setAssistantManagerOpen(false)}
        onRefresh={fetchAssistants}
        onRefreshMemories={fetchGlobalMemories}
      />

      {/* Messages */}
      <main style={{ flex: 1, overflowY: "auto", padding: "0 16px" }}>
        <div style={{ maxWidth: "768px", margin: "0 auto" }}>
          {messages.length === 0 && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "60vh",
              gap: "12px",
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p style={{ fontSize: "14px", color: "var(--text-tertiary)" }}>
                发送一条消息开始对话
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatMessage
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && i === messages.length - 1 && msg.role === "assistant"}
              onEdit={msg.role === "user" ? (newContent) => handleEditResend(i, newContent) : undefined}
              onRegenerate={msg.role === "assistant" && i === messages.length - 1 ? () => handleRegenerate() : undefined}
              onDelete={() => handleDeleteMessage(msg.id, i)}
            />
          ))}
          <div ref={messagesEndRef} style={{ height: "16px" }} />
        </div>
      </main>

      {/* Input */}
      <footer style={{ flexShrink: 0, padding: "8px 16px 20px" }}>
        <div style={{ maxWidth: "768px", margin: "0 auto" }}>
          {/* Quick messages */}
          {(() => {
            const assistant = getCurrentAssistant();
            const qm = assistant?.quick_messages as { name: string; content: string }[] | undefined;
            if (!qm || qm.length === 0 || isStreaming) return null;
            return (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
                {qm.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q.content)}
                    style={{
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-color)",
                      borderRadius: "20px",
                      padding: "6px 14px",
                      fontSize: "12px",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {q.name}
                  </button>
                ))}
              </div>
            );
          })()}
          <ChatInput onSend={handleSend} disabled={isStreaming} />
          <p style={{ textAlign: "center", fontSize: "12px", marginTop: "10px", color: "var(--text-tertiary)" }}>
            AI 可能会犯错，请核实重要信息
          </p>
        </div>
      </footer>
    </div>
  );
}
