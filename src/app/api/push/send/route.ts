import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails("mailto:hello@versetogether.app", vapidPublicKey, vapidPrivateKey);
}

export async function POST(request: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Push delivery is not configured" }, { status: 500 });
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "VAPID keys are not configured" }, { status: 500 });
  }

  const body = await request.json();
  const userId = body?.userId;
  const title = body?.title || "VerseTogether";
  const message = body?.message || body?.body || "You have a new update.";
  const url = body?.url || "/dashboard";

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const { data: subscriptions, error } = await adminClient
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!subscriptions?.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const results = await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          },
          JSON.stringify({
            title,
            body: message,
            icon: "/icon-192.svg",
            badge: "/icon-192.svg",
            data: { url }
          })
        );
        return { ok: true, endpoint: subscription.endpoint };
      } catch (pushError) {
        const status = (pushError as any)?.statusCode;
        if (status === 410 || status === 404) {
          await adminClient.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        }
        return { ok: false, endpoint: subscription.endpoint, status };
      }
    })
  );

  return NextResponse.json({ ok: true, sent: results.filter((item) => item.ok).length });
}
