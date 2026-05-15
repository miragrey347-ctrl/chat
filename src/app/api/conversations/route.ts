import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET - list all conversations
export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("conversations")
    .select("*, assistants(name)")
    .order("is_starred", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - create new conversation
export async function POST(request: Request) {
  const supabase = createServiceClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      title: body.title || "新对话",
      assistant_id: body.assistant_id || null,
      current_model: body.current_model || "anthropic/claude-sonnet-4",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE - delete conversation
export async function DELETE(request: Request) {
  const supabase = createServiceClient();
  const { id } = await request.json();

  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH - update conversation (rename, star, model switch)
export async function PATCH(request: Request) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { id, ...updates } = body;

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("conversations")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
