"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import LoadingScreen from "./LoadingScreen";

export default function Guard({ children }: { children: React.ReactNode }) {
  const { user, needsOnboarding, profileReady } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!profileReady) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (needsOnboarding && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [profileReady, user, needsOnboarding, pathname, router]);

  if (!profileReady) return <LoadingScreen />;
  if (!user) return <LoadingScreen message="Redirecting to login..." />;
  if (needsOnboarding) return <LoadingScreen message="Setting up your space..." />;

  return <>{children}</>;
}
