import { NextResponse } from "next/server";

// Speech-to-text proxy → OpenRouter /api/v1/audio/transcriptions
// Body: { audio: base64 string (raw, no data URI prefix), format: "m4a"|"webm"|..., model?, language? }
// Returns: { text }
export async function POST(request: Request) {
  try {
    const { audio, format, model, language } = await request.json();

    if (!audio || !format) {
      return NextResponse.json({ error: "Missing audio or format" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
    }

    const body: Record<string, unknown> = {
      model: model || "openai/gpt-4o-mini-transcribe",
      input_audio: { data: audio, format },
    };
    if (language) body.language = language;

    const res = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json(
        { error: `STT error ${res.status}: ${err}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json({ text: data.text || "" });
  } catch (e) {
    console.error("STT error:", e);
    return NextResponse.json({ error: `STT failed: ${e}` }, { status: 500 });
  }
}
