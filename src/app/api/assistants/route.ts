import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

// GET - list all assistants
export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("assistants")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST - create assistant
export async function POST(request: Request) {
  const supabase = createServiceClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("assistants")
    .insert({
      name: body.name,
      system_prompt: body.system_prompt || "",
      default_model: body.default_model || "anthropic/claude-sonnet-4",
      tags: body.tags || "",
      quick_messages: body.quick_messages || [],
      memory_enabled: body.memory_enabled || false,
      memory_system_instruction: body.memory_system_instruction || null,
      history_reference_enabled: body.history_reference_enabled || false,
      history_reference_count: body.history_reference_count || 5,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// PATCH - update assistant
export async function PATCH(request: Request) {
  const supabase = createServiceClient();
  const body = await request.json();
  const { id } = body;

  // Whitelist only valid DB columns
  const allowedFields = [
    "name", "tags", "system_prompt", "default_model",
    "quick_messages", "memory_enabled",
    "memory_system_instruction",
    "history_reference_enabled", "history_reference_count",
  ];
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  const { data, error } = await supabase
    .from("assistants")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE - delete assistant
export async function DELETE(request: Request) {
  const supabase = createServiceClient();
  const { id } = await request.json();

  const { error } = await supabase.from("assistants").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
