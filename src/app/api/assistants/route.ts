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
  const { id, ...updates } = body;

  updates.updated_at = new Date().toISOString();

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
