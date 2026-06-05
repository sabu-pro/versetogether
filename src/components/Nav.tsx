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
      <div className="rounded-[28px] border border-rose-100 bg-[#fff7fa] p-2 shadow-[0_14px_24px_-14px_rgba(80,48,63,0.35)]">
        <div className="grid grid-cols-6 gap-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[52px] flex-col items-center rounded-[18px] border px-1 py-2 text-[11px] font-semibold text-[#111111] transition duration-200 ease-out ${
                  active
                    ? "border-[#e3b8c9] bg-[#f5d7e4] shadow-[0_10px_18px_-14px_rgba(80,48,63,0.35)]"
                    : "border-transparent hover:border-[#ead3de] hover:bg-[#fff1f6]"
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
