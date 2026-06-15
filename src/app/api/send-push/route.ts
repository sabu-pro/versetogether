import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { initWebPush, sendPushToUser } from "@/lib/push-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = body?.userId;
    const title = body?.title || "VerseTogether";
    const message = body?.message || body?.body || "You have a new update.";
    const url = body?.url || "/dashboard";

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ ok: false, error: "Push delivery is not configured" }, { status: 500 });
    }

    const { vapidPublicKey, vapidPrivateKey } = initWebPush();
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ ok: false, error: "VAPID keys are not configured" }, { status: 500 });
    }

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const result = await sendPushToUser(adminClient, userId, title, message, url);

    return NextResponse.json({
      ok: true,
      sent: result.sent,
      failed: result.failed,
      results: result.results,
    });
  } catch (error) {
    console.error("Push send route failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown push send error" },
      { status: 500 }
    );
  }
}
