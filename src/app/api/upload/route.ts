import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

const BUCKET = "chat-images";

async function ensureBucket(supabase: ReturnType<typeof createServiceClient>) {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (!data) {
    await supabase.storage.createBucket(BUCKET, { public: true });
  }
}

export async function POST(request: Request) {
  try {
    const { filename, base64, mimeType } = await request.json();
    if (!filename || !base64) {
      return NextResponse.json({ error: "filename and base64 required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    await ensureBucket(supabase);

    // Strip data URL prefix if present
    const raw = base64.includes(",") ? base64.split(",")[1] : base64;
    const buffer = Buffer.from(raw, "base64");

    // Generate unique path
    const ext = filename.split(".").pop() || "jpg";
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: mimeType || "image/jpeg",
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({ url: urlData.publicUrl, path });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
