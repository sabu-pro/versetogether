export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-6">
      <h1 className="text-3xl font-bold text-sage-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sage-600">{subtitle}</p>}
    </header>
  );
}
