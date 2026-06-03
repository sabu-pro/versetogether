import Guard from "./Guard";
import Nav from "./Nav";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Guard>
      <main className="mx-auto min-h-screen max-w-xl px-5 pb-28 pt-8">{children}</main>
      <Nav />
    </Guard>
  );
}
