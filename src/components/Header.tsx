export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6 rounded-[28px] border border-sage-100 bg-white/80 p-4 shadow-[0_16px_28px_-24px_rgba(47,58,38,0.45)] backdrop-blur sm:p-5">
      <p className="badge-pill">VerseTogether</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight text-sage-900 sm:text-[2rem]">{title}</h1>
      {subtitle && <p className="mt-2 text-sm text-sage-600 sm:text-base">{subtitle}</p>}
    </header>
  );
}
