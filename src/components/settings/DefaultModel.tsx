"use client";

import { useState, useEffect } from "react";
import type { NavContext } from "@/app/settings/page";
import SettingsPageLayout, { SettingsCard } from "./SettingsPageLayout";

export default function DefaultModel({ nav }: { nav: NavContext }) {
  const [models, setModels] = useState<{ model_id: string; display_name: string }[]>([]);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    fetchModels();
    const saved = localStorage.getItem("default-model") || "anthropic/claude-sonnet-4";
    setSelected(saved);
  }, []);

  const fetchModels = async () => {
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      if (Array.isArray(data)) setModels(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleChange = (modelId: string) => {
    setSelected(modelId);
    localStorage.setItem("default-model", modelId);
  };

  return (
    <SettingsPageLayout nav={nav} title="默认模型">
      <SettingsCard>
        <div style={{ padding: "14px 16px" }}>
          <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "12px" }}>
            新建对话时的默认模型。此设置为全局默认，每个助手可在助手设置中单独覆盖。
          </p>
          <select
            value={selected}
            onChange={(e) => handleChange(e.target.value)}
            style={{
              width: "100%",
              background: "var(--bg-tertiary)",
              border: "1px solid var(--border-color)",
              borderRadius: "10px",
              padding: "12px 36px 12px 14px",
              fontSize: "15px",
              color: "var(--text-primary)",
              WebkitAppearance: "none",
              appearance: "none",
              outline: "none",
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%237a7068'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 14px center",
            }}
          >
            {models.length > 0 ? (
              models.map((m) => (
                <option key={m.model_id} value={m.model_id}>
                  {m.display_name || m.model_id}
                </option>
              ))
            ) : (
              <option value={selected}>{selected}</option>
            )}
          </select>
        </div>
      </SettingsCard>
    </SettingsPageLayout>
  );
}
