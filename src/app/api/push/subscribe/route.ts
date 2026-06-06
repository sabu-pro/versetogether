import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const subscription = body?.subscription || body;
  const endpoint = subscription?.endpoint;

  if (!endpoint || !subscription) {
    return NextResponse.json({ error: "Missing subscription details" }, { status: 400 });
  }

  const { error: upsertError } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: user.id,
        endpoint,
        subscription,
        user_agent: body?.user_agent || "",
        updated_at: new Date().toISOString()
      },
      { onConflict: "endpoint" }
    );

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
