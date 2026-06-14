# Aethera 交接文档（2026-06-14 窗口收尾版）

> 给下个窗口的我：读完本文档即可接手。

## 0. 环境与工作方式（不变项）

- 仓库 `miragrey347-ctrl/chat`（public）→ Vercel 自动部署 `chat-pi-nine-39.vercel.app`
- 沙箱 `/home/claude/chat-app`；会被重置，丢了就 `git clone --depth 30`
- OpenRouter key 在 Vercel 服务端 env `OPENROUTER_API_KEY`，前端永不传 key
- Mira 只有 iPhone/iPad。Git 全由 Claude 操作；token 嵌 remote URL，**不清理**
- 验证流程：`npx tsc --noEmit` 0 错；行为改动追加完整 build：`next.config.ts` 临时加 `turbopack: { root: "." }` → `npx next build` → 看到 `✓ Compiled successfully` **和** `Finished TypeScript` → 恢复 config（`supabaseUrl is required` 是沙箱无 env，忽略）
- 中文字符串改动用 python3 全文替换（sed 坏中文）；大文件重写用 `cat > file << 'ENDOFFILE'`
- 改动画/几何参数前先 PIL 离线渲染自检；对照 GPT 动画用 ffmpeg 逐帧 tile

## 1. 应用速览

Next.js 16 App Router + TypeScript PWA；Supabase（表：assistants / conversations / messages / user_models / assistant_memories / global_memories / conversation_summaries）；OpenRouter（chat + STT + TTS）；Serper 搜索。

关键文件：
- `src/app/chat/page.tsx` — 主聊天（流式、搜索注入、导出、barge-in 截断）
- `src/components/VoiceMode.tsx` — 全屏语音（核心文件，~900 行）
- `src/lib/voice.ts` — 语音工具（STT/TTS/格式检测）
- `src/lib/i18n.ts` — "use client" 词典，扁平 key → {zh,en}
- `src/lib/themeColors.ts` — 主题色表（THEME_BAR/SWATCH/SCHEME + applyChrome）
- `src/components/ThemeGuard.tsx` — 挂载后重申主题（防运行时属性丢失）
- `src/app/globals.css` — 语音球布局 + 全部主题 CSS 变量块
- `public/sw.js` — Service Worker v3（stale-while-revalidate）
- `public/manifest.json` — PWA 清单

## 2. 语音系统

### 链路
- STT `/api/stt`：OpenRouter transcriptions，base64 JSON（m4a/webm），默认 `openai/gpt-4o-mini-transcribe`，网络错误重试一次
- TTS `/api/tts`：openrouter 分支必须显式 `response_format:"mp3"`，默认 `openai/gpt-4o-mini-tts-2025-12-15`
- 听写：ChatInput 麦克风 = MediaRecorder → /api/stt → 填输入框

### VoiceMode 状态机
idle / listening / transcribing / thinking / speaking（stateRef 同步镜像）。

**VAD**：RMS 阈值 0.022、静音 1400ms 断句、MIN_SPEECH 400ms、MIN_BLOB 2000B。

**播放**：共享 AudioContext 的 BufferSource（**绝不能用 `<audio>`**——会 interrupt context 杀死 VAD）。

**句子级流式 TTS**：liveText → streamSafeClean → harvest 切句（首句 ≥14 字符逗号软切）→ enqueueSegment 并行合成（并发闸门 ≤3 + 失败重试一次）→ pump 按 slot 保序播放 → drain 且 llmDone → 回 listening。**短句合并**：<12 字符的句子不单独成段，攒入 pendingSegRef 与下句合并（生成式 TTS 短输入音色失锚会变性别，cc24019）。turnIdRef 世代计数器作废在途异步；sendMessageRef 桥接防陈旧闭包。字幕跟语音（每段开播才上屏）。

### 音频自愈（888b7ce）
iOS 随时可能 interrupt 共享 context（通知/Siri/来电），四层防御：
1. vadLoop 每帧查 `ctx.state !== "running"` → resume
2. startListening 复用分支：800ms 超时 await resume → 仍不行重建整个 audio graph
3. pump 每段播放配 `buf.duration+1.5s` 看门狗（冻结 context 下 onended 失踪）
4. TTS 并发闸门 + 重试

### Barge-in 插话打断（2953d62 + 3140798）
speaking 期间半开麦：RMS > 0.045（普通阈值 2 倍）持续 250ms → abortSpeech + onBargeIn(spokenSoFar) + startListening。

**打断时做三件事**：
1. abort 仍在跑的 LLM 流（文本流通常比 TTS 播放早结束几十秒，abort 几乎总摸空）
2. 聊天记录截断为用户实际听到的文本（spokenTextRef 镜像、内存 setMessages）
3. PATCH /api/messages upsert 截断版到 DB（最后一条是 assistant 则 update，否则 insert）

竞态守卫：bargedRef 让 finalize 跳过（防截断版被完整版覆盖），handleSend 开头复位。**挂断刻意不触发**——离开语音模式让回复跑完。

### 语音球三态动画
DOM：`stage > .voice-cloud-spin[spinRef]{ blob-1..6 } + .voice-think-bubble`。颜色纯 `var(--accent)`。

- **listening**：六 blob 叠成单球呼吸；bubble 藏球内 `translate(-18,16) scale(.45)`
- **thinking**：不对称五瓣菜花云；JS rAF 旋转 -45°/s；花瓣径向浮动（±3px、每瓣独立周期 0.92~1.31s）+ 小圆径向 ±5px、scale 1±0.10
- **thinking→speaking**：squash 中间态 220ms——云压成水平条再 0.32s 分裂四豆；旋转角就近跳 72° 倍数
- **speaking**：四颗定宽变高真胶囊——EQ 写 `height`%（非 scaleY），core `border-radius:9999px`

## 3. 主题系统

七个主题：system / dark / light / sage / lavender / ocean / plum。

**四处必须同步**（新增主题照抄）：
1. `globals.css` 主题块（选择器用 `html[data-theme=x]` 压过 `:root` 兜底）
2. `layout.tsx` 内联脚本的 `bars` / `schemes` 查表
3. `src/lib/themeColors.ts`（THEME_BAR/SWATCH/SCHEME + applyChrome）
4. `SettingsHome.tsx` 选项数组与 themeLabels（i18n key）

**ThemeGuard** 组件在 React 树挂载后重申主题（防运行时抹属性）。`applyChrome()` 跨帧双写 meta theme-color/color-scheme + html inline 背景。

### PWA 状态栏已知限制（本窗口踩完的坑）
- iOS PWA 安装时**固化** manifest 的 theme_color/background_color 和 apple-mobile-web-app-status-bar-style，改代码后必须删图标重装
- PWA 状态栏**不跟随动态 meta theme-color**，只认安装时的固化值
- 尝试过 black-translucent 透明方案（页面背景透出，动态跟随），效果好但 safe-area 适配 + SW 缓存阻止新代码到达设备，已**回退到 statusBarStyle "default"**
- 当前 manifest: theme_color/background_color 均为 `#f5f0eb`（浅色），这是之前一直正常使用的配置
- **Mira 的 iPhone PWA 状态栏目前仍显示深色**——可能是旧的固化值残留。建议她在 iPhone 设置 → Safari → 高级 → 网站数据 里删除 `chat-pi-nine-39` 的全部数据，然后删图标重装。如果仍不行，这是 iOS 平台限制，接受它

### 网页版切换主题时的 Safari tint 残留
Safari 的安全区延伸色（状态栏/底部工具栏后面）对动态 CSS 变量变化更新**懒且不可靠**——切主题时偶尔上边或下边停留在旧色，刷新即正常。applyChrome 已做跨帧重申（rAF×2 + setTimeout 250ms）尽力而为，剩余是 WebKit 渲染层的平台怪癖。

## 4. i18n

- 组件层硬编码中文已清零（51afde2）：VoiceService、AssistantManager 全组件接入（**注意 AssistantManager 有两个组件**：AssistantManager 和 AssistantForm，各自要 `const { t } = useLocale()`）
- 深水区（524bcb2）：对话默认标题由客户端传 `t("untitledConversation")`；`/api/summaries` 接 `locale` 参数生成对应语言摘要；导出 md/txt 标签走词典；setup 页双语
- **白名单**（刻意保留，别"修"）：语言自名（中文/日本語）；记忆存储格式 `[文件:...]`；LLM 上下文标记（[搜索结果]/[全局记忆] 等）；SQL 默认值；summaries 双语分支内字面量

## 5. Service Worker（public/sw.js）

**重大教训**：Turbopack chunk 文件名**不含内容哈希**（同 URL 跨部署内容会变）。v1 的 cache-first 把用户设备钉死在历史版本——本窗口多轮修复因此未完整到达 Mira 的设备。

当前 v3：navigation network-first；静态资源 stale-while-revalidate + `fetch(req, { cache: "no-cache" })` 穿透 HTTP 缓存；install 时 skipWaiting + activate 时 clients.claim + 清旧缓存。注册加了 `updateViaCache: 'none'`。

**任何"用户侧行为与代码不符 / 时好时坏"先怀疑 SW 缓存层。**

## 6. 踩坑记录

1. iOS `<audio>` 播放 interrupt 共享 AudioContext → VAD 死。播放必须同 context BufferSource
2. absolute+inset:0 容器上的 CSS transform animation 在 iOS Safari 静默不执行 → 一律 JS rAF
3. 对称图形旋转不可见；不对称性是旋转可见的前提
4. recorder.onstop 等长生命周期回调闭包会陈旧 → ref 桥接
5. 改动画参数前先 PIL 离线自检多个相位
6. scaleY 拉圆 = 椭圆；真胶囊 = 定宽 + JS 驱 height + radius 9999px
7. CSS animation 覆盖 inline transform：JS 接管的元素必须删掉同属性 CSS 动画
8. iOS context interrupted 无自愈是系统性风险：任何长期 Web Audio 链路都要带 state 看门狗
9. 多个 `}, [vstate]);` 同文歧义 → 按行号 python 精准改
10. **SW 缓存陷阱**：Turbopack chunk 不含内容哈希 + cache-first = 新旧混搭。"停留在上上一个颜色"事件的真凶
11. WebKit chrome tint 懒更新 → applyChrome 跨帧双写；iOS 浅色系统下 Safari 可能拒绝深色 theme-color
12. iOS PWA 固化 manifest 和 status-bar-style → 改了必须删数据+删图标+重装
13. 生成式 TTS 短输入音色失锚（变性别）→ <12 字符合并下一句

## 7. 待办池

- **Mira iPhone PWA 状态栏深色残留**：建议清 Safari 网站数据 + 删图标重装。若仍不行就是平台限制
- barge-in 调参：真机若"喊不停"降 BARGE_RMS_THRESHOLD（0.045），若自我打断升之
- thinking 期间打断：Mira 明确说不做
- 打断后半截内容落库（目前与 Esc 停止生成行为一致，不落库刷新即丢）
- 摘要若做展示 UI，locale 链路已就绪

## 8. 本窗口 commit 链（main，全部已部署）

```
2a6f90e 花瓣径向浮动（GPT 慢速录屏逐帧校准）
b617140 液滴出生/吸回 + squash 压扁分裂 morph
dd236db 真胶囊（height 驱动）
888b7ce 音频自愈四层防御 + TTS 闸门
51afde2 组件层 i18n 清零
524bcb2 i18n 深水区（标题/摘要/导出/setup）
2953d62 barge-in 插话打断
cc24019 短句合并防 TTS 变声
3140798 barge-in 截断聊天记录 + PATCH /api/messages
2e72e2f barge-in abort 旧 LLM 流
70908cb 四个自定义颜色主题
b404946~d9862c9 主题稳定性三层防御
ca0a07d SW v2 缓存修复
3c64410 color-scheme meta 同步
27b94af 透明状态栏 + safe-area（已回退）
2ee5eda 回退透明状态栏 + SW v3
7460c25 meta 初始值清空 + SW updateViaCache
9456f16 manifest 恢复浅色
```

**已验证通过**：花瓣浮动、squash morph、胶囊、音频自愈、i18n、barge-in 全链路（含截断）、短句合并、四个主题色（内容区）。
**未完全解决**：iPhone PWA 状态栏深色残留（疑 iOS 固化值 + SW 阻断）。

— 2026-06-14 的我，交棒 🍵
