"use client";
import { useLocale } from "@/lib/i18n";

import { useState, useRef } from "react";

interface FileUploadMemoryProps {
  onFileAdd: (filename: string, content: string) => void;
}

export default function FileUploadMemory({ onFileAdd }: FileUploadMemoryProps) {
  const { t } = useLocale();
  const fileRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setReading(true);
    setError(null);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (!["txt", "md", "json"].includes(ext)) {
        setError(t("unsupportedFileOnly"));
        setReading(false);
        return;
      }

      const text = await file.text();
      if (!text.trim()) {
        setError(t("fileEmpty"));
        setReading(false);
        return;
      }

      onFileAdd(file.name, text.trim());
    } catch (e) {
      setError(t("fileReadFailed"));
      console.error(e);
    } finally {
      setReading(false);
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,.json"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          const files = e.target.files;
          if (files) {
            Array.from(files).forEach((f) => handleFile(f));
          }
          e.target.value = "";
        }}
      />
      <div
        onClick={() => !reading && fileRef.current?.click()}
        style={{
          padding: "12px 16px",
          borderRadius: "10px",
          border: "1px dashed var(--border-color)",
          textAlign: "center",
          color: reading ? "var(--accent)" : "var(--text-tertiary)",
          fontSize: "14px",
          cursor: reading ? "default" : "pointer",
        }}
      >
        {reading ? t("reading") : (
          <>
            {t("uploadFile")}
            <div style={{ fontSize: "12px", marginTop: "4px" }}>
              {t("uploadFileDesc")}
            </div>
          </>
        )}
      </div>

      {error && (
        <div style={{ fontSize: "13px", color: "#e5737f", marginTop: "8px" }}>
          ⚠️ {error}
        </div>
      )}
    </>
  );
}
