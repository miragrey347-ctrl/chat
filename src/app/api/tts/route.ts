import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { text, model, voice } = await request.json();

    if (!text || !model || !voice) {
      return NextResponse.json(
        { error: "Missing required fields: text, model, voice" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Aethera",
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        { error: `TTS API error: ${response.status} ${err}` },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
      },
    });
  } catch (e) {
    console.error("TTS error:", e);
    return NextResponse.json(
      { error: "TTS request failed" },
      { status: 500 }
    );
  }
}
