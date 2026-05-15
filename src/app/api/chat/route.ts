import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, model, stream, caching } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    // Transform messages for prompt caching (Anthropic models)
    const isAnthropic = model?.startsWith("anthropic/");
    let processedMessages = messages;

    if (caching && isAnthropic && messages.length > 0) {
      processedMessages = messages.map((msg: { role: string; content: string }, i: number) => {
        if (msg.role === "system") {
          return {
            role: "system",
            content: [
              {
                type: "text",
                text: msg.content,
                cache_control: { type: "ephemeral" },
              },
            ],
          };
        }
        // Also cache the last user message before the new one for better hit rates
        if (msg.role === "user" && i === messages.length - 2 && messages.length > 3) {
          return {
            role: "user",
            content: [
              {
                type: "text",
                text: msg.content,
                cache_control: { type: "ephemeral" },
              },
            ],
          };
        }
        return msg;
      });
    }

    const openRouterBody: Record<string, unknown> = {
      model: model || "anthropic/claude-sonnet-4",
      messages: processedMessages,
      stream: stream ?? true,
    };

    // Include usage stats in streaming
    if (stream) {
      openRouterBody.stream_options = { include_usage: true };
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "Personal Chat",
      },
      body: JSON.stringify(openRouterBody),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        { error: `OpenRouter error: ${response.status}`, details: err },
        { status: response.status }
      );
    }

    // Streaming response
    if (stream) {
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let buffer = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data: ")) continue;

                const data = trimmed.slice(6);
                if (data === "[DONE]") {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                  continue;
                }

                try {
                  JSON.parse(data); // validate
                  controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                } catch {
                  // skip invalid JSON
                }
              }
            }
          } catch (e) {
            console.error("Stream error:", e);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    // Non-streaming
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
