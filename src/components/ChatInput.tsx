"use client";
import { useLocale } from "@/lib/i18n";
import { useState, useRef, useEffect, useCallback } from "react";
import { pickRecordingFormat, transcribe } from "@/lib/voice";

export interface Attachment {
  type: "image" | "file";
  name: string;
  data: string;
  mimeType: string;
}

interface ChatInputProps {
  onSend: (content: string, attachments?: Attachment[]) => void;
  onOpenVoice?: () => void;
  disabled?: boolean;
  enterToNewline?: boolean;
}

type DictationState = "idle" | "recording" | "transcribing";

export default function ChatInput({ onSend, onOpenVoice, disabled, enterToNewline = true }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [dictation, setDictation] = useState<DictationState>("idle");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { t } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 200) + "px";
  }, [value]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmed = value.trim();
    if ((!trimmed && attachments.length === 0) || disabled) return;
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setValue("");
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter") return;
    if (enterToNewline) return;
    if (e.shiftKey) return;
    e.preventDefault();
    handleSend();
  };

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  };

  // Whisper-based dictation: record → /api/stt → append text to input
  const handleDictate = useCallback(async () => {
    if (dictation === "transcribing") return;

    if (dictation === "recording") {
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") rec.stop();
      return;
    }

    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      alert(t("voiceMicUnsupported"));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const { mimeType, format } = pickRecordingFormat();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        chunksRef.current = [];
        releaseStream();

        if (blob.size < 1500) {
          setDictation("idle");
          return;
        }

        setDictation("transcribing");
        try {
          const text = await transcribe(blob, format);
          if (text) {
            setValue((prev) => (prev.trim() ? prev.trimEnd() + " " + text : text));
            textareaRef.current?.focus();
          }
        } catch (err) {
          alert(`${t("sttFailed")}\n${err instanceof Error ? err.message : err}`);
        } finally {
          setDictation("idle");
        }
      };

      recorder.start();
      recorderRef.current = recorder;
      setDictation("recording");
    } catch {
      releaseStream();
      setDictation("idle");
      alert(t("voiceMicDenied"));
    }
  }, [dictation, t]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        rec.onstop = null;
        try { rec.stop(); } catch { /* noop */ }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleFiles = async (files: FileList) => {
    const newAttachments: Attachment[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      const isImage = file.type.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
      const isText = ["txt", "md", "json", "csv", "js", "ts", "py", "html", "css", "xml", "yaml", "yml", "log"].includes(ext);
      if (isImage) {
        const base64 = await fileToBase64(file);
        newAttachments.push({ type: "image", name: file.name, data: base64, mimeType: file.type || "image/jpeg" });
      } else if (isText) {
        const text = await file.text();
        newAttachments.push({ type: "file", name: file.name, data: text, mimeType: file.type || "text/plain" });
      } else {
        alert(t("unsupportedFormat"));
      }
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const canSend = (value.trim() || attachments.length > 0) && !disabled;

  const placeholder =
    dictation === "recording" ? t("dictating")
    : dictation === "transcribing" ? t("transcribingHint")
    : t("sendMessage");

  return (
    <div
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border-color)",
        borderRadius: "24px",
        overflow: "hidden",
      }}
    >
      {attachments.length > 0 && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", padding: "12px 16px 0" }}>
          {attachments.map((att, i) => (
            <div key={i} style={{ position: "relative", borderRadius: "10px", border: "1px solid var(--border-color)", overflow: "hidden", background: "var(--bg-tertiary)" }}>
              {att.type === "image" ? (
                <img src={att.data} alt={att.name} style={{ width: "80px", height: "80px", objectFit: "cover", display: "block" }} />
              ) : (
                <div style={{ padding: "8px 12px", fontSize: "12px", color: "var(--text-secondary)", maxWidth: "120px" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:"4px"}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{att.name}</div>
                </div>
              )}
              <button onClick={() => removeAttachment(i)} style={{ position: "absolute", top: "2px", right: "2px", width: "20px", height: "20px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", touchAction: "manipulation" }}>✕</button>
            </div>
          ))}
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        disabled={disabled}
        style={{
          width: "100%",
          background: "transparent",
          color: "var(--text-primary)",
          border: "none",
          outline: "none",
          resize: "none",
          fontSize: "15px",
          lineHeight: "1.5",
          padding: "14px 16px 6px 16px",
          minHeight: "40px",
          maxHeight: "200px",
          boxSizing: "border-box",
          WebkitAppearance: "none",
          fontFamily: "inherit",
        }}
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.txt,.md,.json,.csv,.js,.ts,.py,.html,.css,.xml,.yaml,.yml,.log"
        multiple
        style={{ display: "none" }}
        onChange={(e) => { if (e.target.files) handleFiles(e.target.files); e.target.value = ""; }}
      />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 10px 10px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={disabled}
            style={{
              background: "none", border: "1.5px solid var(--text-tertiary)", borderRadius: "50%",
              width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--text-tertiary)", cursor: disabled ? "default" : "pointer", padding: 0,
              touchAction: "manipulation", opacity: disabled ? 0.4 : 1, flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {/* Dictation button (Whisper STT) */}
          <button
            onClick={handleDictate}
            disabled={disabled || dictation === "transcribing"}
            style={{
              background: dictation === "recording" ? "#e74c3c" : "none",
              border: dictation === "recording" ? "1.5px solid #e74c3c" : "1.5px solid var(--text-tertiary)",
              borderRadius: "50%",
              width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center",
              color: dictation === "recording" ? "#fff" : "var(--text-tertiary)",
              cursor: disabled ? "default" : "pointer", padding: 0,
              touchAction: "manipulation", opacity: disabled ? 0.4 : 1, flexShrink: 0,
              animation: dictation === "recording" ? "pulse 1.5s ease infinite" : "none",
            }}
          >
            {dictation === "recording" ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <rect x="5" y="5" width="14" height="14" rx="2" />
              </svg>
            ) : dictation === "transcribing" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: "spin 1s linear infinite" }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            )}
          </button>

          {/* Voice mode button (realtime voice chat) */}
          {onOpenVoice && (
            <button
              onClick={onOpenVoice}
              disabled={disabled}
              style={{
                background: "none", border: "1.5px solid var(--text-tertiary)", borderRadius: "50%",
                width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-tertiary)", cursor: disabled ? "default" : "pointer", padding: 0,
                touchAction: "manipulation", opacity: disabled ? 0.4 : 1, flexShrink: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="10" x2="4" y2="14"/>
                <line x1="9" y1="6" x2="9" y2="18"/>
                <line x1="14" y1="3" x2="14" y2="21"/>
                <line x1="19" y1="8" x2="19" y2="16"/>
              </svg>
            </button>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{
            width: "34px", height: "34px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--accent)", color: "#1a1410", border: "none",
            opacity: canSend ? 1 : 0.35, cursor: canSend ? "pointer" : "default", transition: "opacity 0.2s",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
