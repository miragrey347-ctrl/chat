import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET - list memories (assistant-specific or global)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assistantId = searchParams.get("assistant_id");
  const type = searchParams.get("type") || "assistant"; // "assistant" or "global"

  const supabase = createServiceClient();

  if (type === "global") {
    const { data, error } = await supabase
      .from("global_memories")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  if (!assistantId) {
    return NextResponse.json({ error: "assistant_id required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("assistant_memories")
    .select("*")
    .eq("assistant_id", assistantId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - create memory
export async function POST(request: Request) {
  const supabase = createServiceClient();
  const body = await request.json();

  if (body.type === "global") {
    const { data, error } = await supabase
      .from("global_memories")
      .insert({ content: body.content, source: body.source || "manual" })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from("assistant_memories")
    .insert({
      assistant_id: body.assistant_id,
      content: body.content,
      source: body.source || "manual",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE - delete memory
export async function DELETE(request: Request) {
  const supabase = createServiceClient();
  const { id, type } = await request.json();
  const table = type === "global" ? "global_memories" : "assistant_memories";

  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH - update memory
export async function PATCH(request: Request) {
  const supabase = createServiceClient();
  const { id, content, type } = await request.json();
  const table = type === "global" ? "global_memories" : "assistant_memories";

  const { data, error } = await supabase
    .from(table)
    .update({ content, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
