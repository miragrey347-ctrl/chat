import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("user_models")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createServiceClient();
  const { model_id, display_name } = await request.json();

  if (!model_id || !display_name) {
    return NextResponse.json({ error: "model_id and display_name required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("user_models")
    .insert({ model_id, display_name })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: Request) {
  const supabase = createServiceClient();
  const { id } = await request.json();

  const { error } = await supabase.from("user_models").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
