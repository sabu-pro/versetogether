"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, BookOpen, Heart, History, Home, Settings, Target } from "lucide-react";

const items = [
  { href: "/dashboard", label: "Today", icon: Home },
  { href: "/history", label: "History", icon: History },
  { href: "/prayers", label: "Prayers", icon: Heart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/notifications", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings }
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-3 left-1/2 z-20 w-[calc(100%-1rem)] max-w-xl -translate-x-1/2">
      <div className="rounded-[28px] border border-sage-100 bg-white/90 p-2 shadow-[0_18px_35px_-22px_rgba(47,58,38,0.45)] backdrop-blur-xl">
        <div className="grid grid-cols-6 gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center rounded-2xl px-1 py-2 text-[11px] font-semibold transition ${
                  active
                    ? "bg-sage-700 text-white shadow-sm"
                    : "text-sage-600 hover:bg-sage-50 hover:text-sage-800"
                }`}
              >
                <Icon size={18} className={active ? "mb-0.5" : "mb-0.5 opacity-90"} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
