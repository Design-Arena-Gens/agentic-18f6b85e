import { SnakeGame } from "@/components/SnakeGame";

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),_transparent_50%),radial-gradient(circle_at_bottom,_rgba(249,115,22,0.1),_transparent_45%)]" />
      <main className="relative z-10 flex w-full max-w-4xl flex-col items-center gap-10 px-6 py-16 sm:px-12">
        <SnakeGame />
        <footer className="text-xs text-slate-400">
          Built for fast reflexes — deploys seamlessly to Vercel.
        </footer>
      </main>
    </div>
  );
}
