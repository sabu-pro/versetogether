import { supabase } from "./supabase";

export async function savePushSubscription(subscription: PushSubscription, userAgent = "") {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      throw new Error(`Unable to save push subscription: session check failed (${sessionError.message}).`);
    }

    const userId = sessionData.session?.user?.id;
    if (!userId) {
      throw new Error("Unable to save push subscription: you must be logged in before enabling Web Push.");
    }

    const subscriptionPayload = subscription.toJSON ? subscription.toJSON() : subscription;
    const endpoint = subscriptionPayload.endpoint;

    if (!endpoint) {
      throw new Error("Unable to save push subscription: missing endpoint.");
    }

    const { error: deleteError } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", userId)
      .eq("endpoint", endpoint);

    if (deleteError) {
      throw new Error(`Unable to save push subscription: could not clear an existing subscription (${deleteError.message}).`);
    }

    const { error: insertError } = await supabase.from("push_subscriptions").insert({
      user_id: userId,
      endpoint,
      subscription: subscriptionPayload,
      user_agent: userAgent || "",
      updated_at: new Date().toISOString()
    });

    if (insertError) {
      throw new Error(`Unable to save push subscription: ${insertError.message || "RLS insert failed."}`);
    }

    return { ok: true };
  } catch (error) {
    console.error("Push subscription save failed", error);
    throw error;
  }
}

export async function sendPushNotification(userId: string, title: string, message: string, url = "/dashboard") {
  try {
    await fetch("/api/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, title, message, url })
    });
  } catch (error) {
    console.error("Push notification failed", error);
  }
}
