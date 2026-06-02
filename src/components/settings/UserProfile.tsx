"use client";
import { useLocale } from "@/lib/i18n";

import { useState, useEffect, useRef } from "react";
import type { NavContext } from "@/app/settings/page";
import SettingsPageLayout, { SettingsCard, SectionLabel } from "./SettingsPageLayout";
import { compressImage } from "@/lib/imageUtils";

export default function UserProfile({ nav }: { nav: NavContext }) {
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(localStorage.getItem("user-name") || "");
    setAvatarUrl(localStorage.getItem("user-avatar") || null);
  }, []);

  const saveName = (val: string) => {
    setName(val);
    localStorage.setItem("user-name", val);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const { base64, mimeType } = await compressImage(file);
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: "avatar.jpg", base64, mimeType }),
      });
      const data = await res.json();
      if (data.url) {
        setAvatarUrl(data.url);
        localStorage.setItem("user-avatar", data.url);
      } else {
        alert(data.error || "Upload failed");
      }
    } catch (e) {
      alert("Upload failed: " + (e instanceof Error ? e.message : "unknown error"));
    }
    setUploading(false);
  };

  const resetAvatar = () => {
    setAvatarUrl(null);
    localStorage.removeItem("user-avatar");
  };

  return (
    <SettingsPageLayout nav={nav} title={t("userProfile")}>
      <SectionLabel>{t("userAvatar")}</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "16px", display: "flex", alignItems: "center", gap: "16px" }}>
          {/* Avatar preview */}
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: "64px", height: "64px", borderRadius: "50%",
              background: avatarUrl ? `url(${avatarUrl}) center/cover` : "var(--accent-muted)",
              color: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: avatarUrl ? 0 : "24px", fontWeight: 600, cursor: "pointer",
              border: "2px dashed var(--border-color)", flexShrink: 0,
            }}
          >
            {!avatarUrl && (name?.[0]?.toUpperCase() || "U")}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                style={{
                  padding: "6px 14px", borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-tertiary)", color: "var(--text-primary)",
                  fontSize: "13px", cursor: "pointer",
                }}
              >
                {uploading ? "..." : t("uploadAvatar")}
              </button>
              {avatarUrl && (
                <button
                  onClick={resetAvatar}
                  style={{
                    padding: "6px 14px", borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    background: "transparent", color: "var(--text-tertiary)",
                    fontSize: "13px", cursor: "pointer",
                  }}
                >
                  {t("resetAvatar")}
                </button>
              )}
            </div>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files?.[0]) handleUpload(e.target.files[0]); e.target.value = ""; }}
        />
      </SettingsCard>

      <SectionLabel>{t("userName")}</SectionLabel>
      <SettingsCard>
        <div style={{ padding: "12px 16px" }}>
          <input
            value={name}
            onChange={(e) => saveName(e.target.value)}
            placeholder="Mira"
            style={{
              width: "100%", border: "1px solid var(--border-color)",
              borderRadius: "8px", padding: "10px 12px",
              fontSize: "15px", background: "var(--bg-input)",
              color: "var(--text-primary)", outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
      </SettingsCard>
    </SettingsPageLayout>
  );
}
