"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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
      className="min-h-screen flex flex-col items-center justify-center px-8"
      style={{ background: "var(--bg-primary)" }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full"
        style={{ maxWidth: "340px" }}
      >
        <div className="text-center mb-10">
          <svg className="mx-auto mb-5" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <h1
            className="text-xl font-semibold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Chat
          </h1>
          <p className="text-sm mt-2" style={{ color: "var(--text-tertiary)" }}>
            输入密码继续
          </p>
        </div>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          autoFocus
          className="w-full px-4 py-3.5 rounded-2xl text-[15px] outline-none transition-all"
          style={{
            background: "var(--bg-secondary)",
            color: "var(--text-primary)",
            border: "1px solid var(--border-color)",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
          onBlur={(e) => (e.target.style.borderColor = "var(--border-color)")}
        />

        {error && (
          <p className="mt-3 text-sm text-center" style={{ color: "#e5737f" }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !password}
          className="w-full mt-3 py-3.5 rounded-2xl text-[15px] font-medium transition-all"
          style={{
            background: password ? "var(--accent)" : "var(--bg-tertiary)",
            color: password ? "#1a1410" : "var(--text-tertiary)",
            cursor: password ? "pointer" : "not-allowed",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "验证中..." : "进入"}
        </button>
      </form>
    </div>
  );
}
