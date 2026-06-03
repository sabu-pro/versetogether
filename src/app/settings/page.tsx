"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import Header from "@/components/Header";
import { useAuth } from "@/lib/auth";

export default function SettingsPage() {
  const { profile, partner, signOut } = useAuth();
  const [permission, setPermission] = useState(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );

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

  return (
    <AppShell>
      <Header title="Settings" subtitle="Manage profile, partner, and mobile setup." />

      <section className="card mb-5">
        <h2 className="text-xl font-bold">Your profile</h2>
        <p className="mt-2">{profile?.name}</p>
        <p className="text-sage-600">{profile?.email}</p>
      </section>

      <section className="card mb-5">
        <h2 className="text-xl font-bold">Partner</h2>
        <p className="mt-2">{partner?.name || "Not found"}</p>
        <p className="text-sage-600">{partner?.email}</p>
      </section>

      <section className="card mb-5">
        <h2 className="text-xl font-bold">Notifications</h2>
        <p className="mt-2 text-sage-700">
          This app includes in-app notifications. Browser push notifications on iPhone depend on iOS support and user permission.
        </p>
        <button onClick={enableNotifications} className="btn-secondary mt-4">
          Enable Browser Notification
        </button>
        <p className="mt-2 text-sm text-sage-500">Status: {permission}</p>
      </section>

      <section className="card mb-5">
        <h2 className="text-xl font-bold">Add to iPhone Home Screen</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sage-700">
          <li>Open your Vercel website in Safari.</li>
          <li>Tap the Share button.</li>
          <li>Tap Add to Home Screen.</li>
          <li>Name it VerseTogether and tap Add.</li>
        </ol>
      </section>

      <button onClick={signOut} className="btn-primary w-full">Logout</button>
    </AppShell>
  );
}
