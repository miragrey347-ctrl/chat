"use client";

import { useState } from "react";
import { useLocale } from "@/lib/i18n";

const SQL = `-- 助手表
CREATE TABLE IF NOT EXISTS assistants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tags TEXT DEFAULT '',
  avatar_url TEXT,
  default_model TEXT DEFAULT 'anthropic/claude-sonnet-4',
  stream_enabled BOOLEAN DEFAULT true,
  system_prompt TEXT DEFAULT '',
  quick_messages JSONB DEFAULT '[]',
  memory_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 对话表
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assistant_id UUID REFERENCES assistants(id) ON DELETE SET NULL,
  title TEXT DEFAULT '新对话',
  is_starred BOOLEAN DEFAULT false,
  current_model TEXT DEFAULT 'anthropic/claude-sonnet-4',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL DEFAULT '',
  thinking_content TEXT,
  model_used TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cached_tokens INTEGER,
  cache_write_tokens INTEGER,
  cost_estimate NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);

-- 插入默认助手
INSERT INTO assistants (name, system_prompt, default_model)
SELECT '默认助手', '', 'anthropic/claude-sonnet-4'
WHERE NOT EXISTS (SELECT 1 FROM assistants LIMIT 1);

-- 行级安全策略（单用户模式，允许所有操作）
ALTER TABLE assistants ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all on assistants" ON assistants;
CREATE POLICY "Allow all on assistants" ON assistants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on conversations" ON conversations;
CREATE POLICY "Allow all on conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all on messages" ON messages;
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true) WITH CHECK (true);`;

export default function SetupPage() {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-primary)",
        padding: "40px 20px",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <h1
        style={{
          color: "var(--text-primary)",
          fontSize: "20px",
          fontWeight: 600,
          marginBottom: "8px",
        }}
      >
        {t("setupTitle")}
      </h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "24px", lineHeight: 1.6 }}>
        {t("setupHint")}
      </p>

      <button
        onClick={handleCopy}
        style={{
          width: "100%",
          padding: "16px",
          borderRadius: "16px",
          border: "none",
          background: copied ? "#4a8" : "var(--accent)",
          color: "#1a1410",
          fontSize: "15px",
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: "16px",
          transition: "background 0.2s",
        }}
      >
        {copied ? t("setupCopied") : t("setupCopySql")}
      </button>

      <a
        href="https://supabase.com/dashboard/project/nemkndvvpjvcvahszvcx/sql/new"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          width: "100%",
          padding: "16px",
          borderRadius: "16px",
          border: "1px solid var(--border-color)",
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
          fontSize: "15px",
          fontWeight: 500,
          textAlign: "center",
          textDecoration: "none",
          boxSizing: "border-box",
          marginBottom: "32px",
        }}
      >
        {t("setupOpenEditor")}
      </a>

      <pre
        style={{
          background: "var(--code-bg)",
          color: "var(--text-secondary)",
          padding: "16px",
          borderRadius: "12px",
          fontSize: "11px",
          lineHeight: 1.5,
          overflow: "auto",
          maxHeight: "300px",
        }}
      >
        {SQL}
      </pre>
    </div>
  );
}
