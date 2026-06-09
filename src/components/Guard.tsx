"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function Guard({ children }: { children: React.ReactNode }) {
  const { user, needsOnboarding, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (needsOnboarding && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [loading, user, needsOnboarding, pathname, router]);

  if (loading) return <main className="flex min-h-screen items-center justify-center">Loading...</main>;
  if (!user) return null;
  if (needsOnboarding) return null;
  return <>{children}</>;
}
