"use client";

import { useState, useRef } from "react";

interface FileUploadMemoryProps {
  onConfirm: (memories: string[]) => void;
}

export default function FileUploadMemory({ onConfirm }: FileUploadMemoryProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<{ filename: string; items: { text: string; checked: boolean }[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setParsing(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/parse-file", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "解析失败");
        setParsing(false);
        return;
      }

      setPreview({
        filename: data.filename,
        items: (data.memories as string[]).map((m) => ({ text: m, checked: true })),
      });
    } catch (e) {
      setError("文件上传失败");
      console.error(e);
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = () => {
    if (!preview) return;
    const selected = preview.items.filter((i) => i.checked).map((i) => i.text);
    if (selected.length > 0) {
      onConfirm(selected);
    }
    setPreview(null);
  };

  const toggleItem = (index: number) => {
    if (!preview) return;
    const updated = [...preview.items];
    updated[index] = { ...updated[index], checked: !updated[index].checked };
    setPreview({ ...preview, items: updated });
  };

  return (
    <>
      {/* Upload trigger */}
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,.json"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <div
        onClick={() => !parsing && fileRef.current?.click()}
        style={{
          padding: "12px 16px",
          borderRadius: "10px",
          border: "1px dashed var(--border-color)",
          textAlign: "center",
          color: parsing ? "var(--accent)" : "var(--text-tertiary)",
          fontSize: "14px",
          cursor: parsing ? "default" : "pointer",
          opacity: parsing ? 0.7 : 1,
        }}
      >
        {parsing ? (
          "🔄 正在解析文件..."
        ) : (
          <>
            📄 点击上传文件
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              支持 txt/md/json
            </div>
          </>
        )}
      </div>

      {error && (
        <div style={{ fontSize: "13px", color: "#e5737f", marginTop: "8px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <>
          <div
            onClick={() => setPreview(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 400,
              animation: "fade-in 200ms ease",
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              maxHeight: "75vh",
              background: "var(--bg-secondary)",
              borderRadius: "16px 16px 0 0",
              padding: "24px 20px",
              paddingBottom: "max(24px, env(safe-area-inset-bottom))",
              zIndex: 410,
              display: "flex",
              flexDirection: "column",
              animation: "sheet-up 280ms cubic-bezier(0.25, 0.1, 0.25, 1)",
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>
              文件解析结果预览
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "16px" }}>
              从 &quot;{preview.filename}&quot; 中提取了 {preview.items.length} 条记忆：
            </p>

            <div style={{ flex: 1, overflowY: "auto", marginBottom: "16px" }}>
              {preview.items.map((item, i) => (
                <button
                  key={i}
                  onClick={() => toggleItem(i)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    marginBottom: "6px",
                    background: item.checked ? "var(--bg-tertiary)" : "transparent",
                    border: "1px solid var(--border-subtle)",
                    cursor: "pointer",
                    textAlign: "left",
                    WebkitTapHighlightColor: "transparent",
                    opacity: item.checked ? 1 : 0.5,
                  }}
                >
                  {/* Checkbox */}
                  <div
                    style={{
                      width: "20px",
                      height: "20px",
                      borderRadius: "4px",
                      border: `2px solid ${item.checked ? "var(--accent)" : "var(--border-color)"}`,
                      background: item.checked ? "var(--accent)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: "1px",
                    }}
                  >
                    {item.checked && (
                      <span style={{ color: "#1a1410", fontSize: "12px", fontWeight: 700 }}>✓</span>
                    )}
                  </div>
                  <span style={{ fontSize: "14px", color: "var(--text-primary)", lineHeight: 1.5 }}>
                    {item.text}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setPreview(null)}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-color)",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  fontSize: "15px",
                  cursor: "pointer",
                }}
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={!preview.items.some((i) => i.checked)}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "12px",
                  border: "none",
                  background: preview.items.some((i) => i.checked) ? "var(--accent)" : "var(--bg-tertiary)",
                  color: preview.items.some((i) => i.checked) ? "#1a1410" : "var(--text-tertiary)",
                  fontSize: "15px",
                  fontWeight: 500,
                  cursor: preview.items.some((i) => i.checked) ? "pointer" : "default",
                }}
              >
                确认添加 ({preview.items.filter((i) => i.checked).length})
              </button>
            </div>
          </div>

          <style>{`
            @keyframes fade-in {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes sheet-up {
              from { transform: translateY(100%); }
              to { transform: translateY(0); }
            }
          `}</style>
        </>
      )}
    </>
  );
}
