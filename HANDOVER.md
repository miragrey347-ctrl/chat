# Chat App 交接文档 (2026-06-04)

## 项目概况

个人 AI 聊天界面，代理多个模型，通过 Supabase 持久化，部署在 Vercel。

- **GitHub**: `miragrey347-ctrl/chat` (public)
- **Vercel**: `chat-pi-nine-39.vercel.app`
- **Supabase**: `nemkndvvpjvcvahszvcx.supabase.co`
- **沙箱路径**: `/home/claude/chat-app`
- **技术栈**: Next.js 16 (App Router, TypeScript, Tailwind), Supabase, Vercel, OpenRouter
- **开发方式**: Mira 用 iPhone/iPad 测试，Claude 在沙箱中做所有 Git 操作。Mira 提供临时 GitHub token 推送

---

## 已完成功能

### 基础 (Phase 1-3)
- 密码登录、流式聊天、Markdown/LaTeX 渲染
- Supabase 持久化、对话侧边栏（星标/重命名/删除）
- 自定义模型管理、消息操作（复制/编辑重发/重新生成/删除）
- 代码块复制按钮、时间戳

### i18n 双语系统
- `src/lib/i18n.ts`: 300+ 条翻译（zh/en），`useLocale()` hook + localStorage 持久化
- 所有组件已接入。语言切换在 设置 → 通用 → 语言
- 缓存状态文本在渲染层用正则解析（处理旧数据库中的中文条目）

### UI 美化
- 全站 emoji 替换为 1.5px SVG 线条图标
- 头部布局左移（助手名 + 模型选择器）
- 输入框紧凑化（单行，展开到 200px）
- 思维链重做为圆角卡片样式（灯泡图标 + 预估时长 + 折叠切换）
- Light 模式 accent：`#d4b896` (Champagne)；Dark 模式：`#c4956a`
- 助手消息无 maxWidth 限制，内容区域 960px 居中

### 代码重构
- 抽取共享 `processStream`、`finalizeAssistantMessage`、`handleStreamError`
- 三段重复流式代码合并，净减 190 行

### 图片持久化
- API: `/api/upload/route.ts` — 上传到 Supabase Storage `chat-images` 桶
- handleSend 发图时先上传拿 URL，消息内容用 `![name](url)` markdown 格式
- ChatMessage 解析 `![name](url)` 渲染图片，自动剥除文本中的图片标记
- 老格式 `[图片: name]` 也会被清理不显示（但无图可显）

### Artifact 渲染
- CodeBlock 组件：HTML/SVG 代码块自动渲染为沙箱 iframe 实时预览
- Code/Preview 切换按钮 + 下载按钮
- 自动检测语言

### 交互工具 (Tool Use)
- **present_choices**: 药丸按钮，accent 描边，hover 填充，点击发送选择值
- **render_visual**: 内联 HTML/SVG 可视化，VisualIframe 组件 + postMessage + ResizeObserver 自动高度
- 工具定义在 `interactiveTools` 数组，传给 OpenRouter API
- 流式处理器 `processStream` 解析 tool_calls 增量参数
- tool_calls 编码为 `<!-- TOOL_CALLS:base64 -->` 存入消息内容持久化
- render_visual 工具描述要求响应式 CSS（320-900px），透明背景

### 搜索来源显示
- 搜索结果（title, snippet, URL）编码为 `<!-- SEARCH_SOURCES:base64 -->` 存入内容
- 可折叠 "N sources" 标签 + favicon 图标（Google favicon API）+ 域名 + 可点击链接
- handleSend、handleEditResend、handleRegenerate 三个入口都支持搜索并传 searchSources

### 用户资料 & 头像系统
- 设置 → 用户资料页：用户名输入 + 头像上传（Supabase Storage）
- 助手编辑页：头像上传区域（基础设定上方）
- 客户端图片压缩：`src/lib/imageUtils.ts`（200px max, JPEG 85%）
- 头像存 localStorage（`user-avatar`, `user-name`, `assistant-avatar-{id}`）
- ChatMessage：显示上传头像或名字首字母回退
- 重置按钮清除头像

### 发送优化
- `requestAnimationFrame` 刷新确保消息先显示
- 新对话创建并行化（fire-and-forget，后续 await）

### 语音设置
- Voice 和 Model 改为自由文本输入（不再是固定下拉）

---

## 文件结构

### API 路由
- `api/chat/route.ts` — OpenRouter 代理（支持 tools, thinking, caching）
- `api/upload/route.ts` — Supabase Storage 上传
- `api/search/route.ts` — Serper/Brave 搜索
- `api/conversations/route.ts`, `api/messages/route.ts`, `api/assistants/route.ts` — CRUD
- `api/memories/route.ts`, `api/summaries/route.ts` — 记忆和摘要
- `api/models/route.ts` — 自定义模型管理
- `api/auth/route.ts` — 密码验证
- `api/parse-file/route.ts` — 文件解析

### 核心组件
- `chat/page.tsx` — 主聊天页面（~1700 行），包含 handleSend/handleEditResend/handleRegenerate、processStream、interactiveTools 定义
- `ChatMessage.tsx` — 消息渲染（~760 行），包含 CodeBlock（Artifact 预览）、VisualIframe、选择按钮、搜索来源卡片、头像/名称
- `ChatInput.tsx` — 输入框 + 附件
- `ModelSelector.tsx` — 模型切换 + 添加/重命名
- `Sidebar.tsx` — 对话列表 + 上下文菜单

### 设置组件
- `SettingsHome.tsx` — 设置首页 + BottomSheet
- `UserProfile.tsx` — 用户资料（名称 + 头像）
- `AssistantEdit.tsx` — 助手编辑（含头像上传）
- `AssistantList.tsx`, `DisplaySettings.tsx`, `DefaultModel.tsx`
- `ApiConfig.tsx`, `SearchService.tsx`, `VoiceService.tsx`
- `GlobalMemory.tsx`, `MemoryManage.tsx`, `FileUploadMemory.tsx`
- `DataBackup.tsx`, `SettingsPageLayout.tsx`

### 工具库
- `i18n.ts` — 翻译系统（300+ 条目）
- `imageUtils.ts` — 客户端图片压缩
- `supabase.ts` — Supabase 客户端
- `types.ts` — 类型定义（Message 含 tool_calls）
- `useDisplaySettings.ts` — 显示设置 hook

---

## 数据持久化方式

### Supabase 数据库
- `conversations`, `messages`, `assistants`, `user_models`
- `global_memories`, `assistant_memories`

### Supabase Storage
- `chat-images` 桶：聊天图片 + 用户/助手头像

### localStorage
- `user-name`, `user-avatar` — 用户资料
- `assistant-avatar-{id}` — 助手头像
- `locale` — 语言设置
- `display-settings` — 显示设置
- 各种搜索/语音/TTS 配置

### 消息内容内嵌数据（HTML 注释）
- `<!-- TOOL_CALLS:base64json -->` — 工具调用持久化
- `<!-- SEARCH_SOURCES:base64json -->` — 搜索来源持久化
- ChatMessage 渲染时解析并剥除

---

## 已知问题 / 待优化

1. **AssistantManager.tsx** — 已废弃但还在代码库中，可以删除
2. **VoiceService / DataBackup** — UI 外壳，功能未完全对接
3. **API Config 页面** — 显示/隐藏 API key 是 UI 假象（key 存在 Vercel 环境变量中）
4. **搜索来源** — 之前的老消息不会有来源数据（功能上线前发的）
5. **图片附件** — 老消息的 `[图片: name]` 没有上传过，不会显示图片
6. **Visual iframe 高度** — 改用 getBoundingClientRect 测量子元素，比 scrollHeight 更准，但极端情况可能仍有偏差

---

## 关键技术要点

### Tailwind CSS 在 iPad/iPhone Safari 的问题
- padding, border-radius, sizing 等关键样式必须用 inline `style` + `WebkitAppearance: none`
- Tailwind class 不可靠

### Git 操作
- 所有 Git 操作在沙箱中完成
- Mira 提供临时 GitHub token，推送后删除
- Token 放在 remote URL 中：`git remote set-url origin https://TOKEN@github.com/miragrey347-ctrl/chat.git`
- 当前 remote URL 中可能还有上次的 token（Mira 要求不清除）

### 构建验证
- 沙箱中缺 Supabase 环境变量，`next build` 最后会报 "Build error occurred" 但不影响
- 只要 "Compiled successfully" + "Finished TypeScript" 通过即可
- 需要临时改 next.config.ts 加 turbopack 配置才能构建：
  ```
  sed -i 's|/* config options here */|turbopack: { root: "." },|' next.config.ts
  # 构建后改回
  sed -i 's|turbopack: { root: "." },|/* config options here */|' next.config.ts
  ```

### 缓存状态翻译
- 旧消息的 cache_status 存的是中文（"缓存命中：..."）
- ChatMessage 渲染层用正则匹配中英文两种格式，提取数字后用当前语言重新拼接

### Tool Use + Thinking
- Anthropic API 支持 extended thinking 和 tool use 同时使用
- OpenRouter 透传没问题
- 之前误判为不兼容，已撤回限制
