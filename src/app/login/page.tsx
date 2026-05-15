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
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--bg-primary)" }}>
      <form
        onSubmit={handleSubmit}
        className="w-full p-8 rounded-2xl"
        style={{ background: "var(--bg-secondary)", maxWidth: "360px", border: "1px solid var(--border-subtle)" }}
      >
        <h1
          className="text-2xl font-semibold mb-6 text-center"
          style={{ color: "var(--text-primary)" }}
        >
          Chat
        </h1>

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="密码"
          autoFocus
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
          style={{
            background: "var(--bg-input)",
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
          className="w-full mt-4 py-3 rounded-xl text-sm font-medium transition-all"
          style={{
            background: password ? "var(--accent)" : "var(--bg-tertiary)",
            color: password ? "#1a1410" : "var(--text-tertiary)",
            cursor: password ? "pointer" : "not-allowed",
          }}
        >
          {loading ? "..." : "进入"}
        </button>
      </form>
    </div>
  );
}
