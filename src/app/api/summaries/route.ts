import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET - fetch summaries for an assistant
export async function GET(request: Request) {
  try {
    const supabase = createServiceClient();
    const { searchParams } = new URL(request.url);
    const assistantId = searchParams.get("assistant_id");
    const limit = parseInt(searchParams.get("limit") || "5");

    if (!assistantId) {
      return NextResponse.json({ error: "assistant_id required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("conversation_summaries")
      .select("id, conversation_id, summary, message_count, summary_tokens, created_at")
      .eq("assistant_id", assistantId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Summaries GET error:", error);
    return NextResponse.json({ error: "Failed to fetch summaries" }, { status: 500 });
  }
}

// POST - generate summary for a conversation
export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const { conversation_id, assistant_id } = await request.json();

    if (!conversation_id || !assistant_id) {
      return NextResponse.json({ error: "conversation_id and assistant_id required" }, { status: 400 });
    }

    // Get conversation messages
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true });

    if (msgError) throw msgError;
    if (!messages || messages.length < 4) {
      return NextResponse.json({ skipped: true, reason: "too_few_messages" });
    }

    // Check if summary already exists
    const { data: existing } = await supabase
      .from("conversation_summaries")
      .select("id, message_count")
      .eq("conversation_id", conversation_id)
      .maybeSingle();

    // Skip if summary exists and message count hasn't changed much
    if (existing && existing.message_count >= messages.length - 2) {
      return NextResponse.json({ skipped: true, reason: "up_to_date" });
    }

    // Build chat log (truncate each message to 500 chars)
    const chatLog = messages
      .map((m: { role: string; content: string }) =>
        `${m.role === "user" ? "用户" : "助手"}：${m.content.slice(0, 500)}`
      )
      .join("\n");

    // Call low-cost model to generate summary
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
            content: `用200-300字总结以下对话的要点，包括讨论了什么话题、做了什么决定、有什么重要信息。只返回摘要文本，不要其他内容。\n\n${chatLog}`,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const err = await aiResponse.text();
      console.error("Summary AI error:", err);
      return NextResponse.json({ error: "AI summary generation failed" }, { status: 500 });
    }

    const aiData = await aiResponse.json();
    const summary = aiData.choices?.[0]?.message?.content || "";

    if (!summary) {
      return NextResponse.json({ error: "Empty summary" }, { status: 500 });
    }

    // Estimate tokens
    const chineseChars = (summary.match(/[\u4e00-\u9fff]/g) || []).length;
    const otherChars = summary.length - chineseChars;
    const summaryTokens = Math.ceil(chineseChars * 1.5 + otherChars * 0.3);

    if (existing) {
      const { error: updateError } = await supabase
        .from("conversation_summaries")
        .update({
          summary,
          message_count: messages.length,
          summary_tokens: summaryTokens,
        })
        .eq("id", existing.id);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from("conversation_summaries")
        .insert({
          conversation_id,
          assistant_id,
          summary,
          message_count: messages.length,
          summary_tokens: summaryTokens,
        });

      if (insertError) throw insertError;
    }

    return NextResponse.json({ success: true, summary_tokens: summaryTokens });
  } catch (error) {
    console.error("Summaries POST error:", error);
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
