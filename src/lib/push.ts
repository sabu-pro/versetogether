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
