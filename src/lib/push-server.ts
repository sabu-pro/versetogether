import { SupabaseClient } from "@supabase/supabase-js";
import webpush from "web-push";

type SubscriptionJson = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: { p256dh?: string; auth?: string };
};

type PushRow = {
  id: string;
  subscription?: SubscriptionJson | string | null;
  endpoint?: string | null;
};

export type PushSendResult = {
  subscriptionsFound: number;
  sent: number;
  failed: number;
  results: Array<{
    id: string;
    ok: boolean;
    endpoint?: string;
    status?: number;
    reason?: string;
  }>;
  errors: string[];
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

function parseSubscriptionValue(value: SubscriptionJson | string | null | undefined): SubscriptionJson | null {
  if (!value) return null;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as SubscriptionJson;
    } catch {
      return null;
    }
  }
  return value;
}

function toPushSubscription(row: PushRow): webpush.PushSubscription | null {
  const parsed = parseSubscriptionValue(row.subscription);
  const endpoint = parsed?.endpoint || row.endpoint || null;
  const p256dh = parsed?.keys?.p256dh || null;
  const auth = parsed?.keys?.auth || null;

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    endpoint,
    keys: { p256dh, auth },
  };
}

export async function sendPushToUser(
  adminClient: SupabaseClient,
  userId: string,
  title: string,
  message: string,
  url = "/dashboard"
): Promise<PushSendResult> {
  const { data: subscriptions, error } = await adminClient
    .from("push_subscriptions")
    .select("id, subscription, endpoint")
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  const rows = (subscriptions || []) as PushRow[];

  if (!rows.length) {
    return { subscriptionsFound: 0, sent: 0, failed: 0, results: [], errors: [] };
  }

  const payload = JSON.stringify({
    title,
    body: message,
    icon: "/icon-192.svg",
    badge: "/icon-192.svg",
    data: { url },
  });

  const results: PushSendResult["results"] = [];
  const errors: string[] = [];

  for (const row of rows) {
    const subscription = toPushSubscription(row);
    const endpoint = subscription?.endpoint || row.endpoint || "unknown";

    if (!subscription) {
      const reason = "Missing endpoint or push keys in subscription row";
      errors.push(`${row.id}: ${reason}`);
      results.push({ id: row.id, ok: false, endpoint, reason });
      continue;
    }

    try {
      await webpush.sendNotification(subscription, payload);
      results.push({ id: row.id, ok: true, endpoint });
    } catch (pushError: unknown) {
      const status = (pushError as { statusCode?: number })?.statusCode;
      const reason =
        pushError instanceof Error ? pushError.message : "Unknown push delivery error";
      errors.push(`${row.id}: ${reason}`);
      results.push({ id: row.id, ok: false, endpoint, status, reason });

      if (status === 404 || status === 410) {
        await adminClient.from("push_subscriptions").delete().eq("id", row.id);
      }
    }
  }

  return {
    subscriptionsFound: rows.length,
    sent: results.filter((item) => item.ok).length,
    failed: results.filter((item) => !item.ok).length,
    results,
    errors,
  };
}

export function isAuthorizedCronRequest(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return request.headers.get("x-vercel-cron") === "1" || process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${cronSecret}`;
}