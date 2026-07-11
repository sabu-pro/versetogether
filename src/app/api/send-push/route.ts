import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { initWebPush, sendPushToUser } from "@/lib/push-server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(request: Request) {
  let targetUserId: string | null = null;

  try {
    // Auth check: require a valid session
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, errors: ["Unauthorized"] }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { ok: false, targetUserId: null, subscriptionsFound: 0, sent: 0, failed: 0, errors: ["Invalid JSON body"] },
        { status: 400 }
      );
    }

    const userId = body?.userId as string | undefined;
    targetUserId = userId || null;
    const title = body?.title || "VerseTogether";
    const message = body?.message || body?.body || "You have a new update.";
    const url = body?.url || "/dashboard";

    console.log("[send-push] request received", { targetUserId: userId, title, url });

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        {
          ok: false,
          targetUserId,
          subscriptionsFound: 0,
          sent: 0,
          failed: 0,
          errors: ["Push delivery is not configured"],
        },
        { status: 500 }
      );
    }

    const { vapidPublicKey, vapidPrivateKey } = initWebPush();
    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json(
        {
          ok: false,
          targetUserId,
          subscriptionsFound: 0,
          sent: 0,
          failed: 0,
          errors: ["VAPID keys are not configured"],
        },
        { status: 500 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        {
          ok: false,
          targetUserId: null,
          subscriptionsFound: 0,
          sent: 0,
          failed: 0,
          errors: ["Missing userId"],
        },
        { status: 400 }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // BOLA guard: requester and target must share the same couple_id
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, couple_id")
      .in("id", [user.id, userId]);

    const requesterProfile = profiles?.find((p) => p.id === user.id);
    const targetProfile = profiles?.find((p) => p.id === userId);

    if (
      !requesterProfile?.couple_id ||
      !targetProfile?.couple_id ||
      requesterProfile.couple_id !== targetProfile.couple_id
    ) {
      return NextResponse.json({ ok: false, errors: ["Forbidden"] }, { status: 403 });
    }

    const result = await sendPushToUser(adminClient, userId, title, message, url);

    console.log("[send-push] subscriptions found", {
      targetUserId: userId,
      subscriptionsFound: result.subscriptionsFound,
    });

    for (const entry of result.results) {
      if (entry.ok) {
        console.log("[send-push] success", { targetUserId: userId, id: entry.id, endpoint: entry.endpoint });
      } else {
        console.error("[send-push] failure", {
          targetUserId: userId,
          id: entry.id,
          endpoint: entry.endpoint,
          status: entry.status,
          reason: entry.reason,
        });
      }
    }

    const ok = result.sent > 0 || result.subscriptionsFound === 0;

    return NextResponse.json({
      ok,
      targetUserId: userId,
      subscriptionsFound: result.subscriptionsFound,
      sent: result.sent,
      failed: result.failed,
      errors: result.errors,
      results: result.results,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown push send error";
    console.error("[send-push] route failed", { targetUserId, error: errorMessage });
    return NextResponse.json(
      {
        ok: false,
        targetUserId,
        subscriptionsFound: 0,
        sent: 0,
        failed: 0,
        errors: [errorMessage],
      },
      { status: 500 }
    );
  }
}
