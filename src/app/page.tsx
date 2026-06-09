import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-6 rounded-full bg-sage-100 p-6 text-5xl">📖</div>
      <h1 className="text-4xl font-bold text-sage-900">VerseTogether</h1>
      <p className="mt-4 text-sage-700">
        A private Bible verse, reflection, prayer, and spiritual habit app for couples.
      </p>
      <div className="mt-8 flex w-full flex-col gap-3">
        <Link href="/signup" className="btn btn-primary text-center">Get started</Link>
        <Link href="/login" className="btn btn-secondary text-center">Login</Link>
      </div>
    </main>
  );
}
