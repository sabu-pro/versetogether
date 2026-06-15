import { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

type PushRow = {
  id: string;
  subscription?: { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | null;
  endpoint?: string | null;
  p256dh?: string | null;
  auth?: string | null;
};

export function initWebPush() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:hello@versetogether.app";

  if (vapidPublicKey && vapidPrivateKey) {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  }

  return { vapidPublicKey, vapidPrivateKey };
}

function toPushSubscription(row: PushRow): webpush.PushSubscription | null {
  if (row.subscription?.endpoint) {
    return row.subscription as webpush.PushSubscription;
  }

  if (row.endpoint && row.p256dh && row.auth) {
    return {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    };
  }

  return null;
}

export async function sendPushToUser(
  adminClient: SupabaseClient,
  userId: string,
  title: string,
  message: string,
  url = "/dashboard"
) {
  const { data: subscriptions, error } = await adminClient
    .from("push_subscriptions")
    .select("id, subscription, endpoint, p256dh, auth")
    .eq("user_id", userId);

  if (error) throw error;
  if (!subscriptions?.length) return { sent: 0, failed: 0, results: [] as { ok: boolean; id: string }[] };

  const payload = JSON.stringify({
    title,
    body: message,
    icon: "/icon-192.svg",
    badge: "/icon-192.svg",
    data: { url },
  });

  const results = await Promise.all(
    (subscriptions as PushRow[]).map(async (row) => {
      const subscription = toPushSubscription(row);
      if (!subscription?.endpoint) {
        return { ok: false, id: row.id };
      }

      try {
        await webpush.sendNotification(subscription, payload);
        return { ok: true, id: row.id };
      } catch (pushError: unknown) {
        const status = (pushError as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) {
          await adminClient.from("push_subscriptions").delete().eq("id", row.id);
        }
        return { ok: false, id: row.id };
      }
    })
  );

  return {
    sent: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
  };
}

export function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${cronSecret}`) return true;
  }

  return request.headers.get("x-vercel-cron") === "1";
}
