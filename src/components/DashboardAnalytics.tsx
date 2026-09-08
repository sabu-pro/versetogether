"use client";

import Link from "next/link";
import { ArrowRight, Heart } from "lucide-react";

export default function DashboardAnalytics() {
  return (
    <section className="soft-card overflow-hidden border border-rose-100/70 bg-[linear-gradient(135deg,_rgba(255,245,247,0.95),_rgba(255,255,255,0.95))]">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-white/90 text-rose-600 shadow-sm">
          <Heart size={16} />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600">Our Journey</p>
          <p className="mt-1 text-sm text-sage-700">See your full history and insights together</p>
        </div>
      </div>

      <Link
        href="/analytics"
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50"
      >
        See Your Journey
        <ArrowRight size={16} />
      </Link>
    </section>
  );
}