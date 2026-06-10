import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { service, apiKey, text, model, voice } = await request.json();

    if (!service || !text) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if ((service === "openai" || service === "elevenlabs") && (!apiKey || !voice)) {
      return NextResponse.json({ error: "Missing apiKey or voice" }, { status: 400 });
    }

    let audioRes: Response;

    if (service === "openrouter") {
      const orKey = process.env.OPENROUTER_API_KEY;
      if (!orKey) {
        return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
      }
      audioRes = await fetch("https://openrouter.ai/api/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${orKey}`,
        },
        body: JSON.stringify({
          model: model || "openai/gpt-4o-mini-tts-2025-12-15",
          input: text,
          voice: voice || "nova",
          response_format: "mp3",
        }),
      });
    } else if (service === "openai") {
      audioRes = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || "tts-1",
          voice,
          input: text,
          response_format: "mp3",
        }),
      });
    } else if (service === "elevenlabs") {
      audioRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text,
          model_id: model || "eleven_multilingual_v2",
        }),
      });
    } else {
      return NextResponse.json({ error: `Unknown service: ${service}` }, { status: 400 });
    }

    if (!audioRes.ok) {
      const err = await audioRes.text();
      return NextResponse.json(
        { error: `${service} error: ${audioRes.status} ${err}` },
        { status: audioRes.status }
      );
    }

    const audioBuffer = await audioRes.arrayBuffer();
    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.byteLength),
      },
    });
  } catch (e) {
    console.error("TTS error:", e);
    return NextResponse.json({ error: `TTS failed: ${e}` }, { status: 500 });
  }
}
