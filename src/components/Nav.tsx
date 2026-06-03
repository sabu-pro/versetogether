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
    <nav className="fixed bottom-0 left-0 right-0 border-t border-sage-100 bg-white/95 backdrop-blur">
      <div className="mx-auto grid max-w-xl grid-cols-6 gap-1 px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center rounded-2xl px-2 py-2 text-xs ${
                active ? "bg-sage-100 text-sage-800" : "text-sage-500"
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
