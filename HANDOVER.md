# Aethera 主交接文档（2026-06-12 窗口收尾版）

> 给下个窗口的我：读完本文档即可接手。专题历史见 HANDOVER_VOICE.md / HANDOVER_VOICE_ORB.md（已被本文档吸收，不必读）。

## 0. 环境与工作方式（不变项）

- 仓库 `miragrey347-ctrl/chat`（public）→ Vercel 自动部署 `chat-pi-nine-39.vercel.app`
- 沙箱 `/home/claude/chat-app`；沙箱会被重置，丢了就 `git clone --depth 30`
- OpenRouter key 在 Vercel 服务端 env `OPENROUTER_API_KEY`，前端永不传 key
- Mira 只有 iPhone/iPad。Git 全由 Claude 操作；token 嵌 remote URL，**不清理**（本窗口的 token 已在 remote 里，可能仍有效，先试 push 再要新的）
- 验证流程：`npx tsc --noEmit` 0 错；行为性改动追加完整 build：`next.config.ts` 临时加 `turbopack: { root: "." }` → `npx next build` → 看到 `✓ Compiled successfully` **和** `Finished TypeScript` 两个标志 → 恢复 config（末尾 `supabaseUrl is required` 是沙箱无 env，忽略）
- 中文字符串改动用 python3 全文替换（sed 会坏）；大文件重写用 `cat > file << 'ENDOFFILE'`
- 改动画/几何参数前先 PIL 离线渲染自检；对照 GPT 动画用 ffmpeg 逐帧 tile
- Mira 反馈风格：截图/录屏 + 短句；"可以了/没问题了"=通过，"还是有/还是不行"=继续修。一次推进一个事项

## 1. 应用速览

Next.js 16 App Router + TypeScript PWA；Supabase（表：assistants / conversations / messages / user_models / assistant_memories / global_memories / conversation_summaries）；OpenRouter（chat + STT + TTS）；Serper 搜索。
关键文件：`src/app/chat/page.tsx`（主聊天，流式、搜索注入、导出）、`src/components/VoiceMode.tsx`（全屏语音，核心文件）、`src/lib/voice.ts`（语音工具）、`src/lib/i18n.ts`（"use client" 词典 + useLocale，扁平 key → {zh,en}）、`src/app/globals.css`（语音球全部布局）。
iPad/iOS Safari 上 Tailwind 不可靠：关键尺寸一律 inline style + WebkitAppearance:none。

## 2. 语音系统现状（全部已上线）

### 链路
- STT `/api/stt`：OpenRouter transcriptions，base64 JSON（m4a/webm），默认 `openai/gpt-4o-mini-transcribe`，网络错误重试一次
- TTS `/api/tts`：openrouter 分支必须显式 `response_format:"mp3"`，默认 `openai/gpt-4o-mini-tts-2025-12-15`
- 听写：ChatInput 麦克风 = MediaRecorder → /api/stt → 填输入框

### VoiceMode 状态机
idle / listening / transcribing / thinking / speaking（stateRef 同步镜像）。VAD：RMS 阈值 0.022、静音 1400ms 断句、MIN_SPEECH 400ms、MIN_BLOB 2000B。播放走共享 AudioContext 的 BufferSource（**绝不能用 `<audio>`**）。句子级流式 TTS：liveText → streamSafeClean →harvest 切句（首句 ≥14 字符逗号软切）→ enqueueSegment 并行合成（**并发闸门 ≤3 + 失败重试一次**，2026-06-12 加；**<12 字符短句不单独成段**，攒入 pendingSegRef 与下句合并——生成式 TTS 短输入音色失锚会变性别，cc24019）→ pump 按 slot 保序播放 → drain 且 llmDone → 回 listening。turnIdRef 世代计数器作废在途异步；sendMessageRef 桥接防陈旧闭包；pendingSendRef 防并发发送。字幕跟语音（每段开播才上屏）。

### barge-in 插话打断（2026-06-12，commit 2953d62）
speaking 期间半开麦：新检测循环读 VAD 同一个 analyser，RMS > 0.045（普通阈值 2 倍）持续 250ms → abortSpeech + startListening。回声防线 = iOS AEC（echoCancellation 一直开）+ 双倍阈值 + 持续时间门，参数保守（宁可要用户大声，绝不自我打断）。配套：liveText effect 有状态守卫（thinking/speaking 之外不 harvest——否则打断后旧 LLM 流借实时 turnId 把旧文偷渡进新队列）；startListening 有 listening 态防重入（barge 与 drain 竞态）。第一版限制：句首 ~250ms 损耗；thinking 期间不可打断。打断后旧 LLM 流自然跑完（pendingSendRef 等待），超长旧流会让下一轮稍等。

### 音频自愈（2026-06-12 修复包，commit 888b7ce）
iOS 随时可能 interrupt 共享 context（通知/Siri/来电），原代码无自愈 → VAD 死（症状：必须点球手动断句；MediaRecorder 不经此 context 所以转写仍正常）。四层防御：
1. vadLoop 每帧查 `ctx.state !== "running"` → resume
2. startListening 复用分支：800ms 超时 await resume → 仍不行**重建整个 audio graph**（mic stream 挺得过打断；pump 里有 `analyser.context !== ctx` 换代检查）
3. pump 每段播放配 `buf.duration+1.5s` 看门狗（冻结 context 下 onended 失踪会卡死管线）
4. TTS 并发闸门 + 重试（治长回复尾段限流静音）

### 语音球三态动画（GPT 逐帧逆向）
DOM：`stage > .voice-cloud-spin[spinRef]{ blob-1..6（wrapper 管 morph 布局 CSS transition / core 管持续动画）} + .voice-think-bubble`。颜色纯 `var(--accent)`。
- **listening**：六 blob 叠成单球呼吸；bubble 藏球内 `translate(-18,16) scale(.45)`（进 thinking 从球缘"钻出"，回来被吸回）
- **thinking**：不对称五瓣菜花云；JS rAF 旋转 -45°/s（spin 容器 CSS animation 在 iOS 静默失效）；同循环驱动**花瓣径向浮动**（视觉 ±3px、每瓣独立周期 0.92~1.31s、scale 0.96±0.04，按 5x 慢速 GPT 录屏逐帧校准）+ **小圆**径向 ±5px、scale 1±0.10、方位锁定不公转（GPT 实测 ±1.5°）。退出清 core inline transform
- **thinking→speaking**：**squash 中间态 220ms**（commit b617140）——云压成带鼓包的水平条再 0.32s 回弹分裂四豆；进 squash 瞬间旋转角就近跳 72° 倍数（五瓣近似对称，跳变藏在塌缩里）剩 ≤36° 随压扁转平；EQ 经 squashRef 同步 ref 延迟启动避免抢跑
- **speaking**：四颗**定宽变高真胶囊**（commit dd236db）——EQ 写 `height`%（非 scaleY！scaleY 把圆拉成椭圆），core `border-radius:9999px`，H=W 时退化正圆所以静止/morph 零变化；wrapper flex 居中 + core flex:none；四豆 scale 0.44 间距 3.6px；播放 analyser 4 频段驱动

## 3. i18n（2026-06-12 两轮清理）

- 组件层硬编码中文已清零（51afde2）：VoiceService、AssistantManager 全组件接入（**注意它有两个组件**：AssistantManager 和 AssistantForm，各自要 `const { t } = useLocale()`）、零散按钮
- 深水区（524bcb2）：对话默认标题由客户端传 `t("untitledConversation")`；`/api/summaries` 接 `locale` 生成对应语言摘要；导出 md/txt 标签走词典；setup 页文案双语
- **白名单（刻意保留的中文，别"修"它们）**：语言自名（中文/日本語/简体中文）；记忆存储格式 `[文件:...]`（改了坏已存数据解析）；LLM 上下文标记（[搜索结果]/[全局记忆]/对话（日期）：/来源:/搜索指令）；SQL 注释与 DB 默认值（'新对话'/'默认助手'）；parse-file route（**死接口**，无人调用）；search route 错误（无用户可见路径）；summaries 双语分支内的中文字面量

## 4. 踩坑记录（必读）

1. iOS `<audio>` 播放 interrupt 共享 AudioContext → VAD 死。播放必须同 context BufferSource
2. absolute+inset:0 容器上的 CSS transform animation 在 iOS Safari 静默不执行 → 这类一律 JS rAF
3. 对称图形旋转不可见；不对称性是旋转可见的前提
4. recorder.onstop 等长生命周期回调闭包会陈旧 → ref 桥接
5. 改动画/几何参数前先 PIL 离线自检多个相位
6. 逐帧分析：`ffmpeg -ss <t> -t <dur> -i video -vf "fps=N,crop=WxH:x:y,scale=200:-1,tile=CxR" -frames:v 1 out.png`；慢速视频用云转速（真实 45°/s）自校准倍率
7. liveText：流式期间 page.tsx 实时更新最后一条 assistant content
8. **scaleY 拉圆 = 椭圆**；真胶囊 = 定宽 + JS 驱 height + radius 9999px（H=W 退化为圆）
9. CSS animation 覆盖 inline transform：JS 接管的元素必须删掉同属性 CSS 动画（voicePetalPulse/voiceCloudDrift 血案）
10. iOS context interrupted 无自愈是系统性风险：任何长期 Web Audio 链路都要带 state 看门狗
11. effect 顺序依赖：squash 编排 effect 必须声明在 spin effect 之后（覆盖其 cleanup 的回正）、EQ 之前（squashRef 先置位）
12. 多个 `}, [vstate]);` 同文歧义 → 按行号 python 精准改

## 5. 待 Mira 真机验证（按推送顺序，均未收到"可以了"）

- 2a6f90e 花瓣浮动 + b617140 squash + dd236db 胶囊：已验证通过（2026-06-12 "其它地方也没啥问题了"）
- 51afde2/524bcb2 i18n → English 界面 Voice 设置页、助手弹窗、导出文件（已验证通过 2026-06-12）
- 888b7ce 音频自愈（已验证通过：铃声打断后自愈、VAD 不误触）
- 2953d62 barge-in：已验证通过（2026-06-12）
- cc24019 短句合并防变声：已验证通过（2026-06-12）——若日后长段**中途**仍偶发变声，那是 Eleven v3 段内漂移，建议切 Multilingual v2

## 6. 待办池

- barge-in 调参：真机若"喊不停"降 BARGE_RMS_THRESHOLD，若自我打断升之；thinking 期间打断未做
- 打断后中止旧 LLM 流（page 层 abort 能力，治超长旧流卡新轮）
- VAD 阈值 0.022 / SILENCE 1400ms 按真机反馈调
- 服务端 search/parse-file 文案（目前无可见路径，若 parse-file 复活再翻）
- 摘要若做展示 UI，locale 链路已就绪

## 7. 本窗口 commit 链（main，全部已部署）

13d18dd→2a6f90e 花瓣径向浮动（GPT 慢速录屏逐帧校准）→ b617140 液滴出生/吸回 + squash 压扁分裂 morph → dd236db 真胶囊（height 驱动）+ 间距收紧 → 888b7ce 音频自愈四层防御 + TTS 闸门 → 51afde2 组件层 i18n 清零 → 524bcb2 i18n 深水区（标题/摘要/导出/setup）→ 0cb9e13 本文档 → 2953d62 barge-in 插话打断 → cc24019 短句合并防 TTS 变声。**本窗口全部改动均经 Mira 真机验证通过。**

— 2026-06-12 的我，交棒 🍵
