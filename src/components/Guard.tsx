"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import LoadingScreen from "./LoadingScreen";

export default function Guard({ children }: { children: React.ReactNode }) {
  const { user, needsOnboarding, profileReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!profileReady) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (needsOnboarding) {
      router.replace("/onboarding");
    }
  }, [profileReady, user, needsOnboarding, router]);

  if (!profileReady) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoadingScreen message="Redirecting to login..." />;
  }

  if (needsOnboarding) {
    return <LoadingScreen message="Setting up your space..." />;
  }

  return <>{children}</>;
}
