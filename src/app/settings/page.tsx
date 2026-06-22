"use client";

import { Copy } from "lucide-react";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import ProfilePhotoSection from "@/components/ProfilePhotoSection";
import { useAuth } from "@/lib/auth";
import { savePushSubscription } from "@/lib/push";

export default function SettingsPage() {
  const { profile, partner, inviteCode, signOut } = useAuth();
  const [copied, setCopied] = useState(false);
  const [permission, setPermission] = useState(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );
  const [pushBusy, setPushBusy] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Ready to enable Web Push on your deployed app.");

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from(Array.from(rawData, (char) => char.charCodeAt(0)));
  }

  function isLocalDevelopment() {
    if (typeof window === "undefined") return false;
    return process.env.NODE_ENV === "development" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
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
    setPushBusy(true);
    setStatusMessage("");

    try {
      if (typeof window === "undefined") {
        throw new Error("This page must be opened in a browser to enable Web Push.");
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        const message = "This browser does not support Web Push APIs. Try a supported iPhone/Safari or Chrome/Edge installation.";
        console.error("Web Push setup failed: unsupported browser APIs", { hasServiceWorker: "serviceWorker" in navigator, hasPushManager: "PushManager" in window, hasNotification: "Notification" in window });
        setPermission("unsupported");
        setStatusMessage(message);
        return;
      }

      if (isLocalDevelopment()) {
        const message = "Push notifications must be tested on the deployed Vercel app.";
        console.error("Web Push setup blocked on local development", { hostname: window.location.hostname, nodeEnv: process.env.NODE_ENV });
        setPermission("unsupported");
        setStatusMessage(message);
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey || !vapidPublicKey.trim()) {
        const message = "VAPID public key is missing. Add NEXT_PUBLIC_VAPID_PUBLIC_KEY to your Vercel environment.";
        console.error("Web Push setup failed: missing VAPID public key", { vapidPublicKey });
        setPermission("failed");
        setStatusMessage(message);
        return;
      }

      const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      await navigator.serviceWorker.ready;

      const granted = await Notification.requestPermission();
      setPermission(granted);

      if (granted !== "granted") {
        const message = "Notification permission was not granted. Allow notifications in your browser settings to enable Web Push.";
        console.error("Web Push setup failed: notification permission denied", { permission: granted });
        setStatusMessage(message);
        return;
      }

      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      await savePushSubscription(subscription, navigator.userAgent);

      setPermission("granted");
      setStatusMessage("Web Push is enabled. Your browser subscription was saved to Supabase.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Web Push error.";
      console.error("Web Push setup failed", error);
      setPermission("failed");
      setStatusMessage(message);
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
        if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
          setPermission("unsupported");
          setStatusMessage("This browser does not support Web Push APIs.");
          return;
        }

        if (isLocalDevelopment()) {
          setPermission("unsupported");
          setStatusMessage("Push notifications must be tested on the deployed Vercel app.");
          return;
        }

        const registration = await navigator.serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        setPermission(existing ? "granted" : Notification.permission);
        setStatusMessage(existing ? "Web Push is already enabled for this browser." : "Push is available but not yet subscribed.");
      } catch (error) {
        console.error("Web Push support check failed", error);
        setPermission("unsupported");
        setStatusMessage("Web Push support check failed. Register the app on Vercel and try again.");
      }
    }

    checkPushSupport();
  }, []);

  return (
    <AppShell>
      <Header title="Settings" subtitle="Manage profile, partner, and mobile setup." />

      <ProfilePhotoSection />

      <section className="soft-card mb-5">
        <p className="badge-pill">Your profile</p>
        <h2 className="mt-3 text-xl font-bold text-sage-900">{profile?.name}</h2>
        <p className="mt-1 text-sage-600">{profile?.email}</p>
      </section>

      <section className="card mb-5">
        <p className="badge-pill">Partner</p>
        {partner ? (
          <>
            <h2 className="mt-3 text-xl font-bold text-sage-900">{partner.name}</h2>
            <p className="mt-1 text-sage-600">{partner.email}</p>
          </>
        ) : inviteCode ? (
          <>
            <h2 className="mt-3 text-xl font-bold text-sage-900">Waiting for your partner</h2>
            <p className="mt-1 text-sage-600">Share this invite code so they can join your couple space.</p>
            <div className="mt-4 rounded-2xl bg-sage-50 px-4 py-4 text-center">
              <p className="text-2xl font-bold tracking-[0.18em] text-sage-900">{inviteCode}</p>
            </div>
            <button
              type="button"
              className="btn btn-secondary mt-4 w-full"
              onClick={async () => {
                await navigator.clipboard.writeText(inviteCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              <Copy size={16} />
              {copied ? "Copied!" : "Copy invite code"}
            </button>
          </>
        ) : (
          <>
            <h2 className="mt-3 text-xl font-bold text-sage-900">Not connected</h2>
            <p className="mt-1 text-sage-600">Your partner profile could not be loaded.</p>
          </>
        )}
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
        <p className="mt-2 text-sm text-sage-500">Status: {statusMessage || permission}</p>
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
