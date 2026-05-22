"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import ChatMessage from "@/components/ChatMessage";
import ChatInput from "@/components/ChatInput";
import Sidebar from "@/components/Sidebar";
import ModelSelector from "@/components/ModelSelector";
import AssistantManager from "@/components/AssistantManager";
import { useDisplaySettings } from "@/lib/useDisplaySettings";
import type { Message, Conversation, Assistant } from "@/lib/types";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export default function ChatPage() {
  const router = useRouter();
  const displaySettings = useDisplaySettings();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [assistantManagerOpen, setAssistantManagerOpen] = useState(false);
  const [showAssistantPicker, setShowAssistantPicker] = useState(false);
  const [showExportPicker, setShowExportPicker] = useState(false);
  const [pendingAssistantId, setPendingAssistantId] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [searching, setSearching] = useState(false);
  const [thinkingMode, setThinkingMode] = useState(false);
  const [thinkingBudget, setThinkingBudget] = useState(10000);

  // Load search enabled from settings
  useEffect(() => {
    setSearchEnabled(localStorage.getItem("search-enabled") === "true");
  }, []);
  const [model, setModel] = useState("anthropic/claude-sonnet-4");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const prevConvIdRef = useRef<string | null>(null);

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
      if (Array.isArray(data)) {
        setAssistants(data);
        // Set defaults from first assistant if no conversation selected
        if (!currentConvId && data.length > 0) {
          setModel(data[0].default_model);
          setPendingAssistantId(data[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to fetch assistants:", e);
    }
  };

  // Load messages when conversation changes (skip during streaming to prevent overwrite)
  useEffect(() => {
    if (!currentConvId) {
      setMessages([]);
      if (assistants.length > 0) {
        setModel(assistants[0].default_model);
      }
      return;
    }
    if (!isStreaming) {
      fetchMessages(currentConvId);
    }

    // Set model: prefer conversation's saved model, fall back to assistant's default
    const conv = conversations.find((c) => c.id === currentConvId);
    if (conv) {
      const assistant = conv.assistant_id
        ? assistants.find((a) => a.id === conv.assistant_id)
        : null;
      setModel(conv.current_model || assistant?.default_model || "anthropic/claude-sonnet-4");
      if (conv.assistant_id) setPendingAssistantId(conv.assistant_id);
    }
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

  // ── Memory System ──
  const [globalMemories, setGlobalMemories] = useState<{ id: string; content: string }[]>([]);
  const [assistantMemories, setAssistantMemories] = useState<{ id: string; content: string }[]>([]);
  const [historySummaries, setHistorySummaries] = useState<{ summary: string; created_at: string }[]>([]);

  // Check if global memory is enabled (stored in localStorage)
  const isGlobalMemoryEnabled = useCallback(() => {
    try {
      return localStorage.getItem("global-memory-enabled") !== "false";
    } catch {
      return true;
    }
  }, []);

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
    // Fetch history summaries if enabled
    if (assistant?.history_reference_enabled && assistant?.id) {
      fetchHistorySummaries(assistant.id, assistant.history_reference_count || 5);
    } else {
      setHistorySummaries([]);
    }
  }, [currentConvId, conversations, assistants, pendingAssistantId]);

  const fetchAssistantMemories = async (assistantId: string) => {
    try {
      const res = await fetch(`/api/memories?assistant_id=${assistantId}`);
      const data = await res.json();
      if (Array.isArray(data)) setAssistantMemories(data);
    } catch (e) { console.error("Failed to fetch assistant memories:", e); }
  };

  const fetchHistorySummaries = async (assistantId: string, count: number) => {
    try {
      const res = await fetch(`/api/summaries?assistant_id=${assistantId}&limit=${count}`);
      const data = await res.json();
      if (Array.isArray(data)) setHistorySummaries(data);
    } catch (e) { console.error("Failed to fetch history summaries:", e); }
  };

  // Generate summary for previous conversation when switching
  useEffect(() => {
    const prevId = prevConvIdRef.current;
    prevConvIdRef.current = currentConvId;

    if (prevId && prevId !== currentConvId) {
      const prevConv = conversations.find((c) => c.id === prevId);
      if (prevConv?.assistant_id) {
        const assistant = assistants.find((a) => a.id === prevConv.assistant_id);
        if (assistant?.history_reference_enabled) {
          // Fire and forget - generate summary in background
          fetch("/api/summaries", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversation_id: prevId,
              assistant_id: prevConv.assistant_id,
            }),
          }).catch((e) => console.error("Summary generation failed:", e));
        }
      }
    }
  }, [currentConvId]);

  // Raw helper (no dependency on state setters)
  const getCurrentAssistantRaw = (): Assistant | null => {
    if (!currentConvId) {
      // No conversation - use pending assistant or first
      if (pendingAssistantId) {
        return assistants.find((a) => a.id === pendingAssistantId) || assistants[0] || null;
      }
      return assistants[0] || null;
    }
    const conv = conversations.find((c) => c.id === currentConvId);
    if (!conv?.assistant_id) return null;
    return assistants.find((a) => a.id === conv.assistant_id) || null;
  };

  // Build system prompt following spec injection order:
  // 1. Assistant system_prompt
  // 2. Global memories (if enabled + has content)
  // 3. Assistant memories (if enabled + has content)
  // 4. Memory extraction instruction (if assistant memory enabled)
  // 5. History summaries (if enabled + has content)
  const getCurrentSystemPrompt = (overrideAssistantId?: string | null) => {
    let assistant: Assistant | null = null;

    if (overrideAssistantId) {
      assistant = assistants.find((a) => a.id === overrideAssistantId) || null;
    } else {
      const conv = conversations.find((c) => c.id === currentConvId);
      assistant = conv?.assistant_id ? (assistants.find((a) => a.id === conv.assistant_id) || null) : null;
    }

    // Fallback: use pending assistant or first assistant
    if (!assistant) {
      if (pendingAssistantId) {
        assistant = assistants.find((a) => a.id === pendingAssistantId) || null;
      }
      if (!assistant) assistant = assistants[0] || null;
    }

    const parts: string[] = [];

    // Layer 1: Assistant system prompt
    if (assistant?.system_prompt) {
      parts.push(assistant.system_prompt);
    }

    // Layer 2: Global memories
    if (isGlobalMemoryEnabled() && globalMemories.length > 0) {
      parts.push("\n\n[全局记忆]");
      globalMemories.forEach((m) => parts.push(`- ${m.content}`));
      parts.push("[全局记忆结束]");
    }

    // Layer 3: Assistant memories
    if (assistant?.memory_enabled && assistantMemories.length > 0) {
      parts.push("\n\n[助手记忆]");
      assistantMemories.forEach((m) => parts.push(`- ${m.content}`));
      parts.push("[助手记忆结束]");
    }

    // Layer 4: (removed - no auto memory extraction)

    // Layer 5: History summaries
    if (assistant?.history_reference_enabled && historySummaries.length > 0) {
      parts.push("\n\n[近期对话参考]");
      historySummaries.forEach((s) => {
        const dateStr = new Date(s.created_at).toLocaleDateString("zh-CN");
        parts.push(`对话（${dateStr}）：${s.summary}`);
      });
      parts.push("[近期对话参考结束]");
    }

    return parts.join("\n");
  };

  // Extract cache info from usage data
  const extractCacheInfo = (usage: Record<string, unknown>): { cacheStatus: string; cachedTokens: number } => {
    // Check multiple possible paths for cache data
    const details = (usage?.prompt_tokens_details || {}) as Record<string, number>;
    const nativeUsage = (usage?.native_tokens_usage || {}) as Record<string, unknown>;
    const nativeInput = (nativeUsage?.input || {}) as Record<string, number>;

    // Try standard path first, then native Anthropic path
    const cachedTokens = details.cached_tokens || nativeInput.cached_tokens || 
      (usage?.cached_tokens as number) || (usage?.prompt_cache_hit_tokens as number) || 0;
    const cacheWriteTokens = details.cache_write_tokens || nativeInput.cache_creation_tokens ||
      (usage?.cache_write_tokens as number) || (usage?.prompt_cache_miss_tokens as number) || 0;
    const totalInputTokens = (usage?.prompt_tokens as number) || (usage?.input_tokens as number) || 0;

    let cacheStatus = "";
    if (cachedTokens > 0) {
      const hitRate = totalInputTokens > 0 ? ((cachedTokens / totalInputTokens) * 100).toFixed(1) : "0";
      cacheStatus = `缓存命中：${cachedTokens} tokens（命中率 ${hitRate}%）`;
    } else if (cacheWriteTokens > 0) {
      cacheStatus = `缓存写入：${cacheWriteTokens} tokens`;
    } else if (totalInputTokens > 0) {
      // Debug: show raw usage keys to identify where cache data lives
      const keys = Object.keys(usage).join(", ");
      const detailKeys = Object.keys(details).join(", ") || "empty";
      const nativeKeys = Object.keys(nativeUsage).join(", ") || "empty";
      cacheStatus = `[debug] usage: {${keys}} details: {${detailKeys}} native: {${nativeKeys}}`;
    }

    return { cacheStatus, cachedTokens };
  };

  const getCurrentAssistant = (): Assistant | null => {
    return getCurrentAssistantRaw();
  };

  // Create new conversation - just reset state, DB record created on first message
  const handleNewConversation = async () => {
    setCurrentConvId(null);
    setMessages([]);
    // Use current assistant's model or first assistant's
    const assistant = getCurrentAssistantRaw() || assistants[0];
    if (assistant) {
      setPendingAssistantId(assistant.id);
      setModel(assistant.default_model);
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

  // Switch assistant for current or next conversation
  const handleAssistantSwitch = async (assistant: Assistant) => {
    setShowAssistantPicker(false);
    setModel(assistant.default_model);
    setPendingAssistantId(assistant.id);

    if (currentConvId) {
      // Update existing conversation's assistant
      await fetch("/api/conversations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: currentConvId,
          assistant_id: assistant.id,
          current_model: assistant.default_model,
        }),
      });
      await fetchConversations();
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
    cache_status?: string | null;
    cached_tokens?: number | null;
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
        const assistantId = pendingAssistantId || assistants[0]?.id || null;
        const res = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assistant_id: assistantId,
            current_model: model,
          }),
        });
        const conv = await res.json();
        convId = conv.id;
        setCurrentConvId(conv.id);
        // Don't fetchConversations here - it causes re-render during streaming
        // Will fetch after streaming completes
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

    // Build API messages - pass assistantId explicitly since state may not be updated yet
    const usedAssistantId = pendingAssistantId || assistants[0]?.id || null;
    const systemPrompt = getCurrentSystemPrompt(usedAssistantId);
    const apiMessages: { role: string; content: string }[] = [];

    if (systemPrompt) {
      apiMessages.push({ role: "system", content: systemPrompt });
    }

    // Search mode: fetch search results and inject as context
    let searchContext = "";
    if (searchMode) {
      setSearching(true);
      try {
        const maxResults = parseInt(localStorage.getItem("search-max-results") || "5");
        const searchRes = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: content, maxResults }),
        });
        const searchData = await searchRes.json();
        if (searchData.results && searchData.results.length > 0) {
          searchContext = "\n\n[搜索结果]\n" +
            searchData.results.map((r: { title: string; snippet: string; url: string }, i: number) =>
              `${i + 1}. ${r.title}\n${r.snippet}\n来源: ${r.url}`
            ).join("\n\n") +
            "\n[搜索结果结束]\n\n请根据以上搜索结果回答用户的问题，在回答中标注信息来源。如果搜索结果不足以回答问题，请说明并提供你已知的信息。";
        } else {
          searchContext = "\n\n[搜索未返回结果，请根据你的已有知识回答。]";
        }
      } catch (e) {
        console.error("Search failed:", e);
      } finally {
        setSearching(false);
      }
    }

    updatedMessages.forEach((m) => {
      if (m === userMsg && searchContext) {
        // Inject search results with the user's message
        apiMessages.push({ role: m.role, content: m.content + searchContext });
      } else {
        apiMessages.push({ role: m.role, content: m.content });
      }
    });

    try {
      abortRef.current = new AbortController();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, model, stream: true, caching: true, thinking: thinkingMode ? { enabled: true, budget: thinkingBudget } : undefined }),
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
      let usageData: Record<string, unknown> = {};

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

            // Capture usage data - keep full object to preserve cache details
            if (parsed.usage) {
              usageData = { ...usageData, ...parsed.usage };
            }

            const delta = parsed.choices?.[0]?.delta;

            // Extended thinking: reasoning field from OpenRouter/Anthropic
            if (delta?.reasoning || delta?.reasoning_content) {
              const reasonChunk = delta.reasoning || delta.reasoning_content;
              thinkingContent += reasonChunk;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = { ...last, thinking_content: thinkingContent };
                }
                return updated;
              });
            }

            if (delta?.content) {
              let chunk = delta.content;

              // Fallback: parse <thinking> tags from content
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

      // Extract cache status
      const { cacheStatus, cachedTokens } = extractCacheInfo(usageData as Record<string, unknown>);

      // Save assistant message to DB with token stats
      saveMessage({
        conversation_id: convId!,
        role: "assistant",
        content: fullContent,
        thinking_content: thinkingContent || undefined,
        model_used: model,
        input_tokens: (usageData.prompt_tokens || usageData.input_tokens) as number | undefined || null,
        output_tokens: (usageData.completion_tokens || usageData.output_tokens) as number | undefined || null,
        cache_status: cacheStatus || null,
        cached_tokens: cachedTokens || null,
      });

      // Update local message with token stats and cache info
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: fullContent,
            input_tokens: (usageData.prompt_tokens || usageData.input_tokens) as number | undefined || last.input_tokens,
            output_tokens: (usageData.completion_tokens || usageData.output_tokens) as number | undefined || last.output_tokens,
            cache_status: cacheStatus || undefined,
            cached_tokens: cachedTokens || undefined,
          };
        }
        return updated;
      });
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
      fetchConversations();
    }
  };

  // Edit and resend: remove messages after index, send new content
  const handleEditResend = async (index: number, newContent: string) => {
    if (!currentConvId || isStreaming) return;

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
        body: JSON.stringify({ messages: apiMessages, model, stream: true, caching: true, thinking: thinkingMode ? { enabled: true, budget: thinkingBudget } : undefined }),
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
      let usageData: Record<string, unknown> = {};

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
            if (parsed.usage) {
              usageData = { ...usageData, ...parsed.usage };
            }
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.reasoning || delta?.reasoning_content) {
              const reasonChunk = delta.reasoning || delta.reasoning_content;
              thinkingContent += reasonChunk;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = { ...last, thinking_content: thinkingContent };
                }
                return updated;
              });
            }
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

      const { cacheStatus: editCS, cachedTokens: editCT } = extractCacheInfo(usageData as Record<string, unknown>);

      saveMessage({
        conversation_id: currentConvId,
        role: "assistant",
        content: fullContent,
        thinking_content: thinkingContent || undefined,
        model_used: model,
        input_tokens: (usageData.prompt_tokens || usageData.input_tokens) as number | undefined || null,
        output_tokens: (usageData.completion_tokens || usageData.output_tokens) as number | undefined || null,
        cache_status: editCS || null,
        cached_tokens: editCT || null,
      });

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: fullContent,
            input_tokens: (usageData.prompt_tokens || usageData.input_tokens) as number | undefined || undefined,
            output_tokens: (usageData.completion_tokens || usageData.output_tokens) as number | undefined || undefined,
            cache_status: editCS || undefined,
            cached_tokens: editCT || undefined,
          };
        }
        return updated;
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
  const handleRegenerate = async (atIndex?: number) => {
    if (!currentConvId || messages.length < 2) return;

    // If no index specified, regenerate last assistant message
    const targetIdx = atIndex ?? messages.length - 1;
    const targetMsg = messages[targetIdx];
    if (targetMsg.role !== "assistant") return;

    // Delete all messages from targetIdx onwards from DB
    for (let i = targetIdx; i < messages.length; i++) {
      await fetch("/api/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: messages[i].id }),
      });
    }

    // Keep messages before the target
    const kept = messages.slice(0, targetIdx);

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
        body: JSON.stringify({ messages: apiMessages, model, stream: true, caching: true, thinking: thinkingMode ? { enabled: true, budget: thinkingBudget } : undefined }),
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
      let usageData: Record<string, unknown> = {};

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
            if (parsed.usage) {
              usageData = { ...usageData, ...parsed.usage };
            }
            const delta = parsed.choices?.[0]?.delta;
            if (delta?.reasoning || delta?.reasoning_content) {
              const reasonChunk = delta.reasoning || delta.reasoning_content;
              thinkingContent += reasonChunk;
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === "assistant") {
                  updated[updated.length - 1] = { ...last, thinking_content: thinkingContent };
                }
                return updated;
              });
            }
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

      const { cacheStatus: regenCS, cachedTokens: regenCT } = extractCacheInfo(usageData as Record<string, unknown>);

      saveMessage({
        conversation_id: currentConvId,
        role: "assistant",
        content: fullContent,
        thinking_content: thinkingContent || undefined,
        model_used: model,
        input_tokens: (usageData.prompt_tokens || usageData.input_tokens) as number | undefined || null,
        output_tokens: (usageData.completion_tokens || usageData.output_tokens) as number | undefined || null,
        cache_status: regenCS || null,
        cached_tokens: regenCT || null,
      });

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content: fullContent,
            input_tokens: (usageData.prompt_tokens || usageData.input_tokens) as number | undefined || undefined,
            output_tokens: (usageData.completion_tokens || usageData.output_tokens) as number | undefined || undefined,
            cache_status: regenCS || undefined,
            cached_tokens: regenCT || undefined,
          };
        }
        return updated;
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

  // ── Export conversation ──
  const getConvTitle = () => {
    const conv = conversations.find((c) => c.id === currentConvId);
    return conv?.title || "对话";
  };

  const triggerDownload = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const exportAs = (format: "md" | "json" | "txt") => {
    if (messages.length === 0) return;
    setShowExportPicker(false);

    const title = getConvTitle();
    const assistant = getCurrentAssistant();
    const safeTitle = title.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 50);

    if (format === "json") {
      const data = {
        title,
        assistant: assistant?.name || null,
        model,
        exported_at: new Date().toISOString(),
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
          thinking_content: m.thinking_content || undefined,
          model_used: m.model_used || undefined,
          input_tokens: m.input_tokens || undefined,
          output_tokens: m.output_tokens || undefined,
          created_at: m.created_at,
        })),
      };
      triggerDownload(JSON.stringify(data, null, 2), `${safeTitle}.json`, "application/json");
      return;
    }

    if (format === "md") {
      let md = `# ${title}\n\n`;
      if (assistant) md += `**助手**：${assistant.name}　**模型**：${model}\n\n---\n\n`;
      messages.forEach((m) => {
        const time = formatTimestamp(m.created_at);
        if (m.role === "user") {
          md += `### 🧑 用户　${time}\n\n${m.content}\n\n`;
        } else if (m.role === "assistant") {
          md += `### 🤖 助手　${time}\n\n`;
          if (m.thinking_content) {
            md += `<details><summary>思维过程</summary>\n\n${m.thinking_content}\n\n</details>\n\n`;
          }
          md += `${m.content}\n\n`;
          if (m.input_tokens || m.output_tokens) {
            md += `> 输入: ${m.input_tokens?.toLocaleString() || "-"} · 输出: ${m.output_tokens?.toLocaleString() || "-"}\n\n`;
          }
        }
        md += "---\n\n";
      });
      triggerDownload(md, `${safeTitle}.md`, "text/markdown");
      return;
    }

    // txt
    let txt = `${title}\n${"=".repeat(title.length)}\n\n`;
    if (assistant) txt += `助手：${assistant.name}　模型：${model}\n\n`;
    messages.forEach((m) => {
      const time = formatTimestamp(m.created_at);
      const role = m.role === "user" ? "用户" : "助手";
      txt += `[${role}] ${time}\n${m.content}\n\n`;
    });
    triggerDownload(txt, `${safeTitle}.txt`, "text/plain");
  };

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "var(--bg-primary)" }}>
      {/* Sidebar */}
      {displaySettings.showSidebar && (
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
      )}

      {/* Header */}
      <header
        style={{
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          paddingTop: "max(10px, env(safe-area-inset-top))",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        {displaySettings.showSidebar ? (
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
        ) : (
          <div style={{ width: "30px" }} />
        )}

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
          {/* Assistant name */}
          <button
            onClick={() => setShowAssistantPicker(true)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "12px",
              cursor: "pointer",
              padding: "2px 8px",
              touchAction: "manipulation",
            }}
          >
            {getCurrentAssistant()?.name || "未选择助手"} ▾
          </button>
          {/* Model selector */}
          <ModelSelector currentModel={model} onChange={handleModelChange} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {/* Export button - only show when there are messages */}
          {messages.length > 0 && (
            <button
              onClick={() => setShowExportPicker(true)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: "6px",
                fontSize: "15px",
                touchAction: "manipulation",
              }}
            >
              ↓
            </button>
          )}
          <button
            onClick={() => router.push("/settings")}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: "6px",
              fontSize: "16px",
              touchAction: "manipulation",
            }}
          >
            ⚙
          </button>
        </div>
      </header>

      {/* Assistant Picker */}
      {showAssistantPicker && (
        <>
          <div
            onClick={() => setShowAssistantPicker(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 200,
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "var(--bg-secondary)",
              borderRadius: "16px 16px 0 0",
              padding: "24px 20px",
              paddingBottom: "max(24px, env(safe-area-inset-bottom))",
              zIndex: 210,
              animation: "sheet-up 250ms ease",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "16px" }}>
              选择助手
            </h3>
            {assistants.map((a) => {
              const isCurrent = getCurrentAssistant()?.id === a.id;
              return (
                <button
                  key={a.id}
                  onClick={() => handleAssistantSwitch(a)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    borderRadius: "10px",
                    marginBottom: "6px",
                    background: isCurrent ? "var(--bg-tertiary)" : "transparent",
                    border: isCurrent ? "1px solid var(--accent)" : "1px solid transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    touchAction: "manipulation",
                  }}
                >
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "8px",
                      background: "var(--bg-tertiary)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      color: "var(--accent)",
                      flexShrink: 0,
                    }}
                  >
                    {a.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)" }}>
                      {a.name}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
                      {a.default_model.split("/").pop()}
                      {a.tags ? ` · ${a.tags}` : ""}
                    </div>
                  </div>
                  {isCurrent && (
                    <span style={{ color: "var(--accent)", fontSize: "14px" }}>✓</span>
                  )}
                </button>
              );
            })}
            <button
              onClick={() => setShowAssistantPicker(false)}
              style={{
                width: "100%",
                padding: "14px",
                marginTop: "10px",
                borderRadius: "12px",
                border: "none",
                background: "var(--bg-tertiary)",
                color: "var(--text-primary)",
                fontSize: "15px",
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              取消
            </button>
          </div>
          <style>{`
            @keyframes sheet-up {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>
        </>
      )}

      {/* Export Picker */}
      {showExportPicker && (
        <>
          <div
            onClick={() => setShowExportPicker(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 200,
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "var(--bg-secondary)",
              borderRadius: "16px 16px 0 0",
              padding: "24px 20px",
              paddingBottom: "max(24px, env(safe-area-inset-bottom))",
              zIndex: 210,
              animation: "sheet-up 250ms ease",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
              导出对话
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "16px" }}>
              {getConvTitle()} · {messages.length} 条消息
            </p>
            {([
              { format: "md" as const, label: "Markdown", desc: "保留格式和思维链，适合阅读和存档", icon: "📝" },
              { format: "json" as const, label: "JSON", desc: "完整结构化数据，含 token 统计，适合备份", icon: "🔧" },
              { format: "txt" as const, label: "纯文本", desc: "最简格式，兼容性最好", icon: "📄" },
            ]).map((opt) => (
              <button
                key={opt.format}
                onClick={() => exportAs(opt.format)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  padding: "14px 12px",
                  borderRadius: "10px",
                  marginBottom: "6px",
                  background: "var(--bg-tertiary)",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  touchAction: "manipulation",
                }}
              >
                <span style={{ fontSize: "20px" }}>{opt.icon}</span>
                <div>
                  <div style={{ fontSize: "15px", fontWeight: 500, color: "var(--text-primary)" }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                    {opt.desc}
                  </div>
                </div>
              </button>
            ))}
            <button
              onClick={() => setShowExportPicker(false)}
              style={{
                width: "100%",
                padding: "14px",
                marginTop: "10px",
                borderRadius: "12px",
                border: "none",
                background: "var(--bg-hover)",
                color: "var(--text-primary)",
                fontSize: "15px",
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              取消
            </button>
          </div>
        </>
      )}

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
              displaySettings={displaySettings}
              onEdit={msg.role === "user" ? (newContent) => handleEditResend(i, newContent) : undefined}
              onRegenerate={msg.role === "assistant" ? () => handleRegenerate(i) : undefined}
              onDelete={() => handleDeleteMessage(msg.id, i)}
            />
          ))}
          <div ref={messagesEndRef} style={{ height: "16px" }} />
        </div>
      </main>

      {/* Input */}
      <footer style={{ flexShrink: 0, padding: "8px 16px", paddingBottom: "max(20px, env(safe-area-inset-bottom))" }}>
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
          <ChatInput onSend={handleSend} disabled={isStreaming || searching} enterToNewline={displaySettings.enterToNewline} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              {searchEnabled && (
                <button
                  onClick={() => setSearchMode(!searchMode)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    background: searchMode ? "var(--accent-muted)" : "transparent",
                    border: `1px solid ${searchMode ? "var(--accent)" : "var(--border-color)"}`,
                    borderRadius: "16px",
                    padding: "4px 12px",
                    fontSize: "12px",
                    color: searchMode ? "var(--accent)" : "var(--text-tertiary)",
                    cursor: "pointer",
                    touchAction: "manipulation",
                    transition: "all 0.15s",
                  }}
                >
                  🔍 {searching ? "搜索中..." : searchMode ? "搜索已开启" : "搜索"}
                </button>
              )}
              <button
                onClick={() => setThinkingMode(!thinkingMode)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  background: thinkingMode ? "var(--accent-muted)" : "transparent",
                  border: `1px solid ${thinkingMode ? "var(--accent)" : "var(--border-color)"}`,
                  borderRadius: "16px",
                  padding: "4px 12px",
                  fontSize: "12px",
                  color: thinkingMode ? "var(--accent)" : "var(--text-tertiary)",
                  cursor: "pointer",
                  touchAction: "manipulation",
                  transition: "all 0.15s",
                }}
              >
                💭 {thinkingMode ? "深度思考" : "思考"}
              </button>
            </div>
            <p style={{ fontSize: "12px", color: "var(--text-tertiary)", margin: 0 }}>
              AI 可能会犯错，请核实重要信息
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
