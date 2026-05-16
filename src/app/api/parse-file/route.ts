import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

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
          // If array of strings, use directly
          if (Array.isArray(json)) {
            const memories = json
              .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
              .filter((s: string) => s.trim().length > 0);
            return NextResponse.json({ filename: file.name, memories });
          }
          // If object, convert key-value pairs to entries
          if (typeof json === "object" && json !== null) {
            const memories = Object.entries(json).map(
              ([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`
            );
            return NextResponse.json({ filename: file.name, memories });
          }
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

    // Split text into memory entries by paragraphs (double newline) or single lines
    const memories = splitIntoMemories(rawText);

    if (memories.length === 0) {
      return NextResponse.json({ error: "未能从文件中提取有效内容" }, { status: 400 });
    }

    return NextResponse.json({ filename: file.name, memories });
  } catch (error) {
    console.error("File parse error:", error);
    return NextResponse.json({ error: "文件解析失败" }, { status: 500 });
  }
}

function splitIntoMemories(text: string): string[] {
  // First try splitting by double newlines (paragraphs)
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // If we got reasonable paragraphs (2+), use those
  if (paragraphs.length >= 2) {
    // Split any remaining very long paragraphs (>500 chars) by single newlines
    const result: string[] = [];
    for (const p of paragraphs) {
      if (p.length > 500) {
        const lines = p
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        result.push(...lines);
      } else {
        result.push(p);
      }
    }
    return result;
  }

  // Otherwise split by single newlines
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  // Filter out very short lines (likely headers or artifacts)
  // and merge consecutive short lines
  if (lines.length > 0) {
    return lines.filter((l) => l.length >= 2);
  }

  // Last resort: return the whole text as one entry
  return [text.trim()];
}
