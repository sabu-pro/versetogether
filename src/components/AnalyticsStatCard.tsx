import { ReactNode } from "react";

type AnalyticsStatCardProps = {
  title: string;
  value: string | number;
  subtitle: string;
  icon: ReactNode;
  accent?: string;
};

export default function AnalyticsStatCard({ title, value, subtitle, icon, accent = "rose" }: AnalyticsStatCardProps) {
  const accentClasses: Record<string, string> = {
    rose: "border-rose-100 bg-rose-50/70 text-rose-700",
    sage: "border-sage-100 bg-sage-50/70 text-sage-700",
    amber: "border-amber-100 bg-amber-50/70 text-amber-700",
    blue: "border-sky-100 bg-sky-50/70 text-sky-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
      <div className={`inline-flex rounded-2xl border p-2.5 ${accentClasses[accent] || accentClasses.rose}`}>
        {icon}
      </div>
      <p className="mt-4 text-sm font-semibold text-sage-700">{title}</p>
      <p className="mt-2 text-2xl font-bold text-sage-900">{value}</p>
      <p className="mt-1 text-sm text-sage-600">{subtitle}</p>
    </div>
  );
}
