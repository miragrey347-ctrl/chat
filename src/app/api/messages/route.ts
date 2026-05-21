import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET - list messages for a conversation
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversation_id");

  if (!conversationId) {
    return NextResponse.json({ error: "conversation_id required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - save a message
export async function POST(request: Request) {
  const supabase = createServiceClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: body.conversation_id,
      role: body.role,
      content: body.content,
      thinking_content: body.thinking_content || null,
      model_used: body.model_used || null,
      input_tokens: body.input_tokens || null,
      output_tokens: body.output_tokens || null,
      cache_status: body.cache_status || null,
      cached_tokens: body.cached_tokens || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update conversation's updated_at
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", body.conversation_id);

  return NextResponse.json(data);
}

// DELETE - delete a message
export async function DELETE(request: Request) {
  const supabase = createServiceClient();
  const { id } = await request.json();

  const { error } = await supabase.from("messages").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
