import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:hello@versetogether.app";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const userId = body?.userId;
    const title = body?.title || "VerseTogether";
    const message = body?.message || body?.body || "You have a new update.";
    const url = body?.url || "/dashboard";

    console.log("Push send received userId", userId);

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ ok: false, error: "Push delivery is not configured" }, { status: 500 });
    }

    if (!vapidPublicKey || !vapidPrivateKey) {
      return NextResponse.json({ ok: false, error: "VAPID keys are not configured" }, { status: 500 });
    }

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Missing userId" }, { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
    });

    const { data: subscriptions, error } = await adminClient
      .from("push_subscriptions")
      .select("id, subscription")
      .eq("user_id", userId);

    if (error) {
      console.error("Push send query failed", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    console.log("Push send subscriptions found", subscriptions?.length || 0);

    const results = await Promise.all(
      (subscriptions || []).map(async (row) => {
        const subscription = row.subscription;
        if (!subscription?.endpoint) {
          return { ok: false, reason: "Missing endpoint", id: row.id };
        }

        try {
          const result = await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title,
              body: message,
              icon: "/icon-192.svg",
              badge: "/icon-192.svg",
              data: { url }
            })
          );
          console.log("Push send success", { endpoint: subscription.endpoint, result });
          return { ok: true, id: row.id, endpoint: subscription.endpoint };
        } catch (pushError: any) {
          const status = pushError?.statusCode;
          console.error("Push send failure", { endpoint: subscription.endpoint, status, message: pushError?.message });

          if (status === 404 || status === 410) {
            await adminClient.from("push_subscriptions").delete().eq("id", row.id);
          }

          return { ok: false, id: row.id, endpoint: subscription.endpoint, status };
        }
      })
    );

    const sentCount = results.filter((item) => item.ok).length;
    const failedCount = results.length - sentCount;

    return NextResponse.json({ ok: true, sent: sentCount, failed: failedCount, results });
  } catch (error) {
    console.error("Push send route failed", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown push send error" }, { status: 500 });
  }
}
