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

    // Try the requested model, then fallback variants
    const modelsToTry = [model];
    // Add variant without date suffix
    if (model.match(/-\d{4}-\d{2}-\d{2}$/)) {
      modelsToTry.push(model.replace(/-\d{4}-\d{2}-\d{2}$/, ""));
    }
    // Add variant with date suffix if not present
    if (!model.match(/-\d{4}-\d{2}-\d{2}$/)) {
      modelsToTry.push(model + "-2025-12-15");
    }

    let lastError = "";
    for (const tryModel of modelsToTry) {
      console.log(`[TTS] Trying model: ${tryModel}, voice: ${voice}`);
      const response = await fetch("https://openrouter.ai/api/v1/audio/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          "X-Title": "Aethera",
        },
        body: JSON.stringify({
          model: tryModel,
          voice,
          input: text,
          response_format: "mp3",
        }),
      });

      if (response.ok) {
        const audioBuffer = await response.arrayBuffer();
        console.log(`[TTS] Success with model: ${tryModel}, size: ${audioBuffer.byteLength}`);
        return new Response(audioBuffer, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Content-Length": String(audioBuffer.byteLength),
          },
        });
      }

      lastError = await response.text();
      console.log(`[TTS] Failed model ${tryModel}: ${response.status} ${lastError}`);
      
      // Only retry on "model not found" errors
      if (!lastError.includes("does not exist")) {
        return NextResponse.json(
          { error: `TTS error: ${response.status} ${lastError}` },
          { status: response.status }
        );
      }
    }

    return NextResponse.json(
      { error: `TTS: No working model found. Last error: ${lastError}. Tried: ${modelsToTry.join(", ")}` },
      { status: 400 }
    );
  } catch (e) {
    console.error("TTS error:", e);
    return NextResponse.json(
      { error: `TTS request failed: ${e}` },
      { status: 500 }
    );
  }
}
