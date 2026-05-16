import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Extract text based on file type
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let rawText = "";

    switch (ext) {
      case "txt":
      case "md":
        rawText = await file.text();
        break;
      case "json":
        try {
          const json = JSON.parse(await file.text());
          rawText = JSON.stringify(json, null, 2);
        } catch {
          rawText = await file.text();
        }
        break;
      default:
        return NextResponse.json(
          { error: `不支持的文件格式: .${ext}。支持 txt/md/json` },
          { status: 400 }
        );
    }

    if (!rawText.trim()) {
      return NextResponse.json({ error: "文件内容为空" }, { status: 400 });
    }

    // Truncate if too long (keep under ~4000 tokens for Haiku)
    const maxChars = 8000;
    if (rawText.length > maxChars) {
      rawText = rawText.slice(0, maxChars) + "\n...(内容已截断)";
    }

    // Call Haiku to split into memory entries
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      },
      body: JSON.stringify({
        model: "anthropic/claude-haiku-4-5-20251001",
        messages: [
          {
            role: "user",
            content: `将以下文本内容拆分为独立的记忆条目。每条记忆应该是一个完整的、自包含的信息点，1-3句话。
只返回 JSON 数组格式，不要任何其他文字：["记忆1", "记忆2", ...]

文本内容：
${rawText}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      console.error("File parse AI error:", err);
      return NextResponse.json({ error: "AI 解析失败" }, { status: 500 });
    }

    const aiData = await aiResponse.json();
    const text = aiData.choices?.[0]?.message?.content || "";

    // Parse the JSON array
    let memories: string[] = [];
    try {
      const cleaned = text.replace(/```json|```/g, "").trim();
      memories = JSON.parse(cleaned);
      if (!Array.isArray(memories)) {
        memories = [String(memories)];
      }
    } catch {
      // If JSON parse fails, split by newlines
      memories = text
        .split("\n")
        .map((l: string) => l.replace(/^[-\d.)\]]+\s*/, "").trim())
        .filter((l: string) => l.length > 0);
    }

    return NextResponse.json({
      filename: file.name,
      memories: memories.filter((m) => m && m.length > 0),
    });
  } catch (error) {
    console.error("File parse error:", error);
    return NextResponse.json({ error: "文件解析失败" }, { status: 500 });
  }
}
