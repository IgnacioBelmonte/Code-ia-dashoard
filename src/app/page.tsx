import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Code IA Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-300">
          LAN dashboard for the local AI board state and OpenClaw runtime status.
        </p>
        <div className="mt-8">
          <Dashboard />
        </div>
      </div>
    </main>
  );
}
