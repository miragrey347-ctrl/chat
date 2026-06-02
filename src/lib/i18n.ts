"use client";

import { useState, useEffect, useCallback } from "react";

export type Locale = "zh" | "en";

const translations: Record<string, Record<Locale, string>> = {
  // ── Settings Home ──
  "settings": { zh: "设置", en: "Settings" },
  "general": { zh: "通用设置", en: "General" },
  "colorMode": { zh: "颜色模式", en: "Color Mode" },
  "displaySettings": { zh: "显示设置", en: "Display" },
  "assistants": { zh: "助手", en: "Assistants" },
  "modelsAndServices": { zh: "模型与服务", en: "Models & Services" },
  "defaultModel": { zh: "默认模型", en: "Default Model" },
  "apiConfig": { zh: "API 配置", en: "API Config" },
  "searchService": { zh: "搜索服务", en: "Search" },
  "voiceService": { zh: "语音服务", en: "Voice" },
  "globalMemory": { zh: "全局记忆", en: "Global Memory" },
  "dataSettings": { zh: "数据设置", en: "Data" },
  "appLanguage": { zh: "应用语言", en: "Language" },
  "dataBackup": { zh: "数据备份与同步", en: "Backup & Sync" },
  "followSystem": { zh: "跟随系统", en: "System" },
  "dark": { zh: "深色", en: "Dark" },
  "light": { zh: "浅色", en: "Light" },
  "cancel": { zh: "取消", en: "Cancel" },
  "save": { zh: "保存", en: "Save" },
  "delete": { zh: "删除", en: "Delete" },
  "add": { zh: "添加", en: "Add" },
  "edit": { zh: "编辑", en: "Edit" },
  "back": { zh: "返回", en: "Back" },

  // ── Theme picker ──
  "colorModeTitle": { zh: "颜色模式", en: "Color Mode" },

  // ── Display Settings ──
  "showTimestamp": { zh: "显示消息时间", en: "Show Timestamps" },
  "showTokenStats": { zh: "显示 Token 统计", en: "Show Token Stats" },
  "showCacheStatus": { zh: "显示缓存状态", en: "Show Cache Status" },
  "showSidebar": { zh: "显示侧边栏按钮", en: "Show Sidebar" },
  "useMarkdown": { zh: "Markdown 渲染", en: "Markdown Rendering" },
  "thinkingMarkdown": { zh: "思维链 Markdown 渲染", en: "Thinking Markdown" },
  "autoCollapseThinking": { zh: "自动折叠思维链", en: "Auto-collapse Thinking" },
  "showModelInMessage": { zh: "消息中显示模型名", en: "Show Model in Messages" },
  "compactMode": { zh: "紧凑模式", en: "Compact Mode" },
  "showAssistantName": { zh: "显示助手名称", en: "Show Assistant Name" },
  "showQuickMessages": { zh: "显示快捷消息", en: "Show Quick Messages" },
  "showCostEstimate": { zh: "显示费用估算", en: "Show Cost Estimate" },
  "showInputTokenDetail": { zh: "显示输入 Token 明细", en: "Show Input Token Details" },
  "showAvatar": { zh: "显示用户和助手头像", en: "Show Avatars" },
  "showNames": { zh: "显示用户和模型名称", en: "Show Names" },
  "showTimestamps": { zh: "显示时间戳", en: "Show Timestamps" },
  "userMarkdown": { zh: "用户消息 Markdown 渲染", en: "User Markdown" },
  "assistantMarkdown": { zh: "助手消息 Markdown 渲染", en: "Assistant Markdown" },
  "latexRendering": { zh: "LaTeX 渲染", en: "LaTeX Rendering" },
  "showSidebarLabel": { zh: "显示侧边栏", en: "Show Sidebar" },
  "enterNewline": { zh: "回车键换行", en: "Enter for Newline" },

  // ── Assistant List ──
  "newAssistant": { zh: "新建助手", en: "New Assistant" },
  "noAssistants": { zh: "暂无助手，点击上方创建", en: "No assistants. Create one above." },

  // ── Assistant Edit ──
  "editAssistant": { zh: "编辑助手", en: "Edit Assistant" },
  "createAssistant": { zh: "新建助手", en: "New Assistant" },
  "assistantName": { zh: "名称", en: "Name" },
  "assistantNamePlaceholder": { zh: "助手名称", en: "Assistant name" },
  "tags": { zh: "标签", en: "Tags" },
  "tagsPlaceholder": { zh: "标签（逗号分隔）", en: "Tags (comma separated)" },
  "systemPrompt": { zh: "系统提示词", en: "System Prompt" },
  "systemPromptPlaceholder": { zh: "设定助手的角色和行为...", en: "Define the assistant's role and behavior..." },
  "charCount": { zh: "字符数", en: "Characters" },
  "tokenEstimate": { zh: "Token 估算", en: "Token estimate" },
  "assignedModel": { zh: "专属模型", en: "Assigned Model" },
  "useDefault": { zh: "使用默认", en: "Use Default" },
  "quickMessages": { zh: "快捷消息", en: "Quick Messages" },
  "addQuickMessage": { zh: "添加快捷消息", en: "Add Quick Message" },
  "assistantMemory": { zh: "助手记忆", en: "Assistant Memory" },
  "enableAssistantMemory": { zh: "启用助手记忆", en: "Enable Assistant Memory" },
  "assistantMemoryDesc": { zh: "开启后，模型会在对话中自动识别并记录你的重要信息，也可以主动要求模型记住某些内容。记录的信息将在该助手的所有对话中使用。", en: "When enabled, the model will automatically identify and record important information from conversations. Recorded info will be used across all conversations with this assistant." },
  "manageMemory": { zh: "管理记忆", en: "Manage Memory" },
  "manageMemoryDesc": { zh: "手动添加或上传文件添加记忆", en: "Manually add or upload file to add memories" },
  "referenceHistory": { zh: "参考历史聊天记录", en: "Reference Chat History" },
  "referenceHistoryDesc": { zh: "开启后，新建对话时自动携带该助手最近几条对话的摘要作为上下文参考。", en: "When enabled, new conversations will automatically include summaries of recent chats as context." },
  "deleteAssistant": { zh: "删除此助手", en: "Delete Assistant" },

  // ── Memory Management ──
  "memoryManage": { zh: "管理记忆", en: "Manage Memory" },
  "addMemory": { zh: "添加记忆", en: "Add Memory" },
  "addMemoryPlaceholder": { zh: "输入一条记忆...", en: "Enter a memory..." },
  "existingMemories": { zh: "已有记忆", en: "Existing Memories" },
  "memoryCount": { zh: "条记忆", en: "memories" },
  "approx": { zh: "约", en: "~" },
  "noMemories": { zh: "暂无记忆", en: "No memories yet" },

  // ── Global Memory ──
  "enableGlobalMemory": { zh: "启用全局记忆", en: "Enable Global Memory" },
  "globalMemoryDesc": { zh: "全局记忆中的内容会注入到所有助手的系统提示词中。适合存放通用的个人信息。", en: "Global memory is injected into all assistants' system prompts. Suitable for general personal info." },
  "addGlobalMemory": { zh: "添加记忆", en: "Add Memory" },
  "addGlobalMemoryPlaceholder": { zh: "添加一条全局记忆...", en: "Add a global memory..." },
  "existingGlobalMemories": { zh: "已有全局记忆", en: "Existing Global Memories" },
  "globalMemoryCount": { zh: "条全局记忆", en: "global memories" },
  "noGlobalMemories": { zh: "暂无全局记忆", en: "No global memories yet" },

  // ── File Upload ──
  "uploadFile": { zh: "点击上传文件", en: "Click to upload file" },
  "uploadFileDesc": { zh: "支持 txt/md/json，可多选", en: "Supports txt/md/json, multi-select" },

  // ── API Config ──
  "apiKey": { zh: "API Key", en: "API Key" },
  "testConnection": { zh: "测试连接", en: "Test Connection" },
  "connectionSuccess": { zh: "连接成功", en: "Connection successful" },
  "promptCaching": { zh: "Prompt Caching", en: "Prompt Caching" },
  "enablePromptCaching": { zh: "启用 Prompt Caching", en: "Enable Prompt Caching" },
  "promptCachingDesc": { zh: "对 Anthropic 模型自动启用缓存，减少重复 token 消耗", en: "Auto-enable caching for Anthropic models to reduce token usage" },

  // ── Search Service ──
  "searchServiceTitle": { zh: "搜索服务", en: "Search Service" },
  "enableSearch": { zh: "启用搜索", en: "Enable Search" },
  "searchDesc": { zh: "开启后，可在聊天页面使用搜索功能，AI 将能搜索互联网信息来回答问题。", en: "When enabled, search is available in chat. AI can search the internet to answer questions." },
  "searchProvider": { zh: "搜索服务商", en: "Search Provider" },
  "maxResults": { zh: "最大结果数", en: "Max Results" },

  // ── Voice Service ──
  "voiceServiceTitle": { zh: "语音服务", en: "Voice Service" },
  "ttsEngine": { zh: "TTS 引擎", en: "TTS Engine" },
  "webSpeechApi": { zh: "Web Speech API（免费，系统自带）", en: "Web Speech API (Free, built-in)" },
  "comingSoon": { zh: "更多 TTS 服务即将支持", en: "More TTS services coming soon" },

  // ── Default Model ──
  "defaultModelTitle": { zh: "默认模型", en: "Default Model" },
  "selectDefaultModel": { zh: "选择新建对话时使用的默认模型", en: "Select the default model for new conversations" },
  "currentDefault": { zh: "当前默认", en: "Current default" },

  // ── Data Backup ──
  "autoSync": { zh: "自动同步", en: "Auto Sync" },
  "autoSyncDesc": { zh: "所有数据存储在云端，多设备自动同步。", en: "All data stored in cloud, auto-syncs across devices." },
  "syncStatus": { zh: "同步状态", en: "Sync Status" },
  "synced": { zh: "已同步", en: "Synced" },
  "syncNow": { zh: "立即同步", en: "Sync Now" },
  "syncing": { zh: "同步中...", en: "Syncing..." },
  "exportData": { zh: "导出数据", en: "Export Data" },
  "exportDataDesc": { zh: "导出所有对话记录、助手配置和记忆数据。", en: "Export all conversations, assistant configs, and memory data." },
  "exportAll": { zh: "导出全部数据", en: "Export All Data" },
  "exportFormat": { zh: "导出格式：JSON（完整备份，可用于恢复）", en: "Format: JSON (full backup, restorable)" },

  // ── Chat Page ──
  "sendMessage": { zh: "发送消息...", en: "Write a message..." },
  "emptyChat": { zh: "发送一条消息开始对话", en: "Send a message to start a conversation" },
  "search": { zh: "搜索", en: "Search" },
  "searching": { zh: "搜索中...", en: "Searching..." },
  "searchOn": { zh: "搜索已开启", en: "Search on" },
  "think": { zh: "思考", en: "Think" },
  "deepThink": { zh: "深度思考", en: "Deep Think" },
  "aiDisclaimer": { zh: "AI 可能会犯错，请核实重要信息", en: "AI can make mistakes. Please verify important info." },
  "noAssistant": { zh: "未选择助手", en: "No Assistant" },
  "exportChat": { zh: "导出对话", en: "Export Chat" },
  "markdown": { zh: "Markdown", en: "Markdown" },
  "markdownDesc": { zh: "保留格式和思维链，适合阅读和存档", en: "Preserves formatting and thinking chain" },
  "json": { zh: "JSON", en: "JSON" },
  "jsonDesc": { zh: "完整结构化数据，含 token 统计，适合备份", en: "Full structured data with token stats" },
  "plainText": { zh: "纯文本", en: "Plain Text" },
  "plainTextDesc": { zh: "最简格式，兼容性最好", en: "Simplest format, best compatibility" },
  "selectAssistant": { zh: "选择助手", en: "Select Assistant" },
  "shortcuts": { zh: "快捷键", en: "Shortcuts" },
  "newConversation": { zh: "新建对话", en: "New Chat" },
  "toggleSidebar": { zh: "切换侧边栏", en: "Toggle Sidebar" },
  "exportConversation": { zh: "导出对话", en: "Export Chat" },
  "openSettings": { zh: "打开设置", en: "Open Settings" },
  "showHelp": { zh: "显示帮助", en: "Show Help" },
  "stopTTS": { zh: "停止所有朗读", en: "Stop All TTS" },
  "close": { zh: "关闭", en: "Close" },

  // ── Sidebar ──
  "conversations": { zh: "对话", en: "Chats" },
  "newChat": { zh: "+ 新对话", en: "+ New Chat" },
  "rename": { zh: "重命名", en: "Rename" },
  "addStar": { zh: "加星标", en: "Star" },
  "removeStar": { zh: "取消星标", en: "Unstar" },
  "noConversations": { zh: "暂无对话", en: "No conversations" },
  "justNow": { zh: "刚刚", en: "Just now" },
  "minutesAgo": { zh: "分钟前", en: "min ago" },
  "hoursAgo": { zh: "小时前", en: "hr ago" },
  "daysAgo": { zh: "天前", en: "d ago" },

  // ── Chat Message ──
  "thinkingLabel": { zh: "深度思考", en: "Deep Thinking" },
  "inputTokens": { zh: "输入", en: "Input" },
  "outputTokens": { zh: "输出", en: "Output" },
  "cacheHit": { zh: "缓存命中", en: "Cache hit" },
  "cacheWrite": { zh: "缓存写入", en: "Cache write" },
  "hitRate": { zh: "命中率", en: "Hit rate" },
  "copied": { zh: "已复制", en: "Copied" },
  "copy": { zh: "复制", en: "Copy" },

  // ── Model Selector ──
  "addModel": { zh: "+ 添加模型", en: "+ Add Model" },
  "modelIdPlaceholder": { zh: "模型 ID，如 anthropic/claude-sonnet-4", en: "Model ID, e.g. anthropic/claude-sonnet-4" },
  "displayNamePlaceholder": { zh: "显示名称，如 Claude Sonnet 4", en: "Display name, e.g. Claude Sonnet 4" },

  // ── Login ──
  "loginTitle": { zh: "登录", en: "Login" },
  "passwordPlaceholder": { zh: "输入密码", en: "Enter password" },
  "loginButton": { zh: "进入", en: "Enter" },
  "loginError": { zh: "密码错误", en: "Wrong password" },

  // ── Error ──
  "error": { zh: "错误", en: "Error" },

  // ── Display Settings (sections/descriptions) ──
  "chatDisplay": { zh: "聊天项显示", en: "Chat Display" },
  "renderSettings": { zh: "渲染设置", en: "Rendering" },
  "behaviorSettings": { zh: "行为与启动", en: "Behavior" },
  "timestampFormat": { zh: "格式：2026-05-14 18:12", en: "Format: 2026-05-14 18:12" },
  "cacheStatusDesc": { zh: "显示缓存命中/写入及命中率", en: "Show cache hit/write and hit rate" },
  "latexDesc": { zh: "识别 $...$ 和 $$...$$ 公式", en: "Recognize $...$ and $$...$$ formulas" },
  "autoCollapseDesc": { zh: "开启后思维链默认折叠，点击可展开", en: "Collapsed by default, click to expand" },
  "enterNewlineDesc": { zh: "开启后回车=换行，使用发送按钮发送消息", en: "Enter = newline, use send button to send" },

  // ── Assistant Edit ──
  "basicSettings": { zh: "基础设定", en: "Basic Settings" },
  "assistantNameInput": { zh: "输入助手名称", en: "Enter assistant name" },
  "tagsOptional": { zh: "标签（可选）", en: "Tags (optional)" },
  "tagsExample": { zh: "如：聊天、翻译、工作", en: "e.g. chat, translate, work" },
  "defaultModelId": { zh: "默认模型 ID", en: "Default Model ID" },
  "streamOutput": { zh: "流式输出", en: "Stream Output" },
  "systemPromptLabel": { zh: "系统提示词", en: "System Prompt" },
  "systemPromptInput": { zh: "输入系统提示词...", en: "Enter system prompt..." },
  "quickMessagesLabel": { zh: "快捷消息", en: "Quick Messages" },
  "addQuickMsg": { zh: "+ 添加快捷消息", en: "+ Add Quick Message" },
  "buttonName": { zh: "按钮名", en: "Button name" },
  "sendContent": { zh: "发送内容", en: "Send content" },
  "assistantMemoryLabel": { zh: "助手记忆", en: "Assistant Memory" },
  "enableAssistantMemoryLabel": { zh: "启用助手记忆", en: "Enable Memory" },
  "manageMemoryLabel": { zh: "管理记忆", en: "Manage Memory" },
  "manageMemoryAvailable": { zh: "手动添加或上传文件添加记忆", en: "Add manually or upload files" },
  "manageMemorySaveFirst": { zh: "保存助手后可管理记忆", en: "Save assistant first" },
  "refHistory": { zh: "参考历史聊天记录", en: "Reference Chat History" },
  "refHistoryDesc": { zh: "开启后，新建对话时自动携带该助手最近几条对话的摘要作为上下文参考。", en: "Auto-include recent chat summaries as context for new conversations." },
  "refRecent": { zh: "参考最近", en: "Recent" },
  "chatsUnit": { zh: "条对话", en: "chats" },
  "saving": { zh: "保存中...", en: "Saving..." },
  "loading": { zh: "加载中...", en: "Loading..." },
  "saveFailed": { zh: "保存失败，请重试", en: "Save failed" },
  "confirmDeleteAssistant": { zh: "确定要删除这个助手吗？", en: "Delete this assistant?" },
  "editAssistantTitle": { zh: "编辑助手", en: "Edit Assistant" },

  // ── Default Model ──
  "defaultModelDesc": { zh: "新建对话时的默认模型。此设置为全局默认，每个助手可在助手设置中单独覆盖。", en: "Default model for new conversations. Each assistant can override in its own settings." },

  // ── Search Service ──
  "searchFeature": { zh: "搜索功能", en: "Search Feature" },
  "searchFeatureDesc": { zh: "开启后聊天界面底部会出现搜索开关，发消息时可自动搜索网络获取最新信息。", en: "When enabled, a search toggle appears in chat for web search." },
  "maxSearchResults": { zh: "最大搜索结果数", en: "Max Search Results" },
  "searchRange": { zh: "范围 1-10，默认 5", en: "Range 1-10, default 5" },
  "searchNote": { zh: "说明", en: "Note" },
  "searchApiNote": { zh: "需要在 Vercel 环境变量中配置搜索 API Key（二选一）：", en: "Configure a search API key in Vercel env vars (pick one):" },

  // ── Voice Service ──
  "defaultTts": { zh: "默认 TTS 服务", en: "Default TTS Service" },
  "modelLabel": { zh: "模型", en: "Model" },
  "voiceLabel": { zh: "声音", en: "Voice" },

  // ── ChatMessage (cache/token stats) ──
  "cacheWriteLabel": { zh: "缓存写入", en: "Cache write" },
  "cacheHitLabel": { zh: "缓存命中", en: "Cache hit" },
  "hitRateLabel": { zh: "命中率", en: "Hit rate" },
  "sources": { zh: "个来源", en: "sources" },
  "focusInput": { zh: "聚焦输入框", en: "Focus Input" },
  "showShortcuts": { zh: "显示快捷键", en: "Show Shortcuts" },
  "closePopup": { zh: "关闭弹窗 / 停止生成", en: "Close / Stop generation" },
  "msgCount": { zh: "条消息", en: "messages" },
  "conversation": { zh: "对话", en: "Chat" },
  "unsupportedFormat": { zh: "不支持的文件格式", en: "Unsupported format" },
  "resend": { zh: "重新发送", en: "Resend" },
  "starred": { zh: "星标", en: "Starred" },
  "memoriesCount": { zh: "条记忆，约", en: "memories, ~" },
  "manualSource": { zh: "手动", en: "Manual" },
  "fileSource": { zh: "文件", en: "File" },
  "autoSource": { zh: "自动", en: "Auto" },
  "addMemorySection": { zh: "添加记忆", en: "Add Memory" },
  "existingMemorySection": { zh: "已有记忆", en: "Existing Memories" },
  "reading": { zh: "读取中...", en: "Reading..." },
  "unsupportedFileOnly": { zh: "不支持的文件格式，仅支持 txt/md/json", en: "Only txt/md/json supported" },
  "fileEmpty": { zh: "文件内容为空", en: "File is empty" },
  "fileReadFailed": { zh: "文件读取失败", en: "File read failed" },
  "noAssistantsYet": { zh: "暂无助手", en: "No assistants yet" },
  "verifying": { zh: "验证中...", en: "Verifying..." },
  "connectionFailed": { zh: "连接失败", en: "Connection failed" },
  "passwordLabel": { zh: "密码", en: "Password" },
  "enterAccessPassword": { zh: "输入访问密码", en: "Enter access password" },
  "manageMemoryFor": { zh: "管理记忆", en: "Manage Memory" },
  "serperNote": { zh: "（推荐，serper.dev 免费 2500 次/月）", en: "(recommended, serper.dev free 2500/mo)" },
  "braveNote": { zh: "（api.search.brave.com 免费 2000 次/月）", en: "(api.search.brave.com free 2000/mo)" },
  "pullVoiceList": { zh: "从 ElevenLabs 声音库拉取列表", en: "Pull list from ElevenLabs" },
  "enterElevenLabsKey": { zh: "输入 ElevenLabs API Key", en: "Enter ElevenLabs API Key" },

};

// Get locale from localStorage
function getLocale(): Locale {
  if (typeof window === "undefined") return "zh";
  const stored = localStorage.getItem("app-language");
  if (stored === "en" || stored === "English") return "en";
  return "zh";
}

// Set locale
function setLocale(locale: Locale) {
  localStorage.setItem("app-language", locale);
  window.dispatchEvent(new Event("locale-changed"));
}

// Translation function
function t(key: string, locale?: Locale): string {
  const l = locale || getLocale();
  return translations[key]?.[l] || translations[key]?.zh || key;
}

// React hook
export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("zh");

  useEffect(() => {
    setLocaleState(getLocale());

    const handler = () => setLocaleState(getLocale());
    window.addEventListener("locale-changed", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("locale-changed", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const changeLocale = useCallback((l: Locale) => {
    setLocale(l);
    setLocaleState(l);
  }, []);

  const translate = useCallback((key: string) => t(key, locale), [locale]);

  return { locale, setLocale: changeLocale, t: translate };
}
