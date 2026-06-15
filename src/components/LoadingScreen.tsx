export default function LoadingScreen({ message = "Loading VerseTogether..." }: { message?: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="card w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 text-3xl">
          📖
        </div>
        <p className="text-lg font-semibold text-sage-900">{message}</p>
        <div className="mx-auto mt-4 h-1.5 w-24 overflow-hidden rounded-full bg-rose-100">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-rose-300" />
        </div>
      </div>
    </main>
  );
}
