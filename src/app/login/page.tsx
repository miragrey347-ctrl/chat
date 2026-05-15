"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        router.push("/chat");
      } else {
        setError("密码错误");
      }
    } catch {
      setError("连接失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "var(--bg-primary)" }}
    >
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "380px" }}>
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <svg
            className="mb-4"
            width="32" height="32" viewBox="0 0 24 24" fill="none"
            stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ opacity: 0.7 }}
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Chat
          </h1>
        </div>

        {/* Input card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <label
            className="block text-xs font-medium mb-2 ml-1"
            style={{ color: "var(--text-tertiary)" }}
          >
            密码
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入访问密码"
            autoFocus
            className="w-full px-5 py-4 rounded-2xl text-[15px] outline-none transition-all duration-200"
            style={{
              background: "var(--bg-tertiary)",
              color: "var(--text-primary)",
              border: `1.5px solid ${focused ? "var(--accent)" : "transparent"}`,
            }}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />

          {error && (
            <p className="mt-3 text-sm text-center" style={{ color: "#e5737f" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full mt-4 py-4 rounded-2xl text-[15px] font-medium transition-all duration-200"
            style={{
              background: password ? "var(--accent)" : "var(--bg-tertiary)",
              color: password ? "#1a1410" : "var(--text-tertiary)",
              cursor: password && !loading ? "pointer" : "not-allowed",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "验证中..." : "进入"}
          </button>
        </div>
      </form>
    </div>
  );
}
