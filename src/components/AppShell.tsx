import Guard from "./Guard";
import Nav from "./Nav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Guard>
      <div className="relative min-h-screen overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_top,rgba(210,220,196,0.35),transparent_55%)]" />
        <main className="relative mx-auto min-h-screen max-w-xl px-4 pb-28 pt-6 sm:px-5 sm:pt-8">{children}</main>
      </div>
      <Nav />
    </Guard>
  );
}
