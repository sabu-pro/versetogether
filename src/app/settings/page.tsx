"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { profile, partner, signOut } = useAuth();
  const [permission, setPermission] = useState(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  const [pushBusy, setPushBusy] = useState(false);

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from(Array.from(rawData, (char) => char.charCodeAt(0)));
  }

  async function enableNotifications() {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      new Notification("VerseTogether", {
        body: "Notifications enabled. You will still use in-app alerts for shared verses."
      });
    }
  }

  async function enablePushSubscription() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPermission("unsupported");
      return;
    }

    setPushBusy(true);

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const granted = await Notification.requestPermission();
      setPermission(granted);

      if (granted !== "granted") {
        setPushBusy(false);
        return;
      }

      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "")
      });

      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON())
      });

      if (!response.ok) {
        throw new Error("Unable to save push subscription.");
      }

      setPermission("granted");
    } catch (error) {
      console.error(error);
      setPermission("failed");
    } finally {
      setPushBusy(false);
    }
  }

  useEffect(() => {
    async function checkPushSupport() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPermission("unsupported");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        setPermission(existing ? "granted" : Notification.permission);
      } catch (error) {
        setPermission("unsupported");
      }
    }

    checkPushSupport();
  }, []);

  return (
    <AppShell>
      <Header title="Settings" subtitle="Manage profile, partner, and mobile setup." />

      <section className="soft-card mb-5">
        <p className="badge-pill">Your profile</p>
        <h2 className="mt-3 text-xl font-bold text-sage-900">{profile?.name}</h2>
        <p className="mt-1 text-sage-600">{profile?.email}</p>
      </section>

      <section className="card mb-5">
        <p className="badge-pill">Partner</p>
        <h2 className="mt-3 text-xl font-bold text-sage-900">{partner?.name || "Not found"}</h2>
        <p className="mt-1 text-sage-600">{partner?.email || "Add your prayer partner in Supabase to connect this section."}</p>
      </section>

      <section className="card mb-5">
        <p className="badge-pill">Notifications</p>
        <h2 className="mt-3 text-xl font-bold text-sage-900">Stay gently reminded</h2>
        <p className="mt-2 text-sage-700">
          This app includes in-app notifications. Browser push notifications on iPhone depend on iOS support and user permission.
        </p>
        <button onClick={enableNotifications} className="btn btn-secondary mt-4">
          Enable Browser Notification
        </button>
        <button onClick={enablePushSubscription} className="btn btn-primary mt-3" disabled={pushBusy}>
          {pushBusy ? "Subscribing..." : "Enable Web Push"}
        </button>
        <p className="mt-2 text-sm text-sage-500">Status: {permission}</p>
      </section>

      <section className="card mb-5">
        <p className="badge-pill">Mobile setup</p>
        <h2 className="mt-3 text-xl font-bold text-sage-900">Add to iPhone Home Screen</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sage-700">
          <li>Open your Vercel website in Safari.</li>
          <li>Tap the Share button.</li>
          <li>Tap Add to Home Screen.</li>
          <li>Name it VerseTogether and tap Add.</li>
        </ol>
      </section>

      <button onClick={signOut} className="btn btn-primary w-full">Logout</button>
    </AppShell>
  );
}
