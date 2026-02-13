"use client";

import { useEffect, useMemo, useState } from "react";

type ApiState<T> =
  | { status: "idle" | "loading"; data?: undefined; error?: undefined }
  | { status: "ok"; data: T; error?: undefined }
  | { status: "error"; data?: undefined; error: string };

type BoardItem = {
  ticketId?: string;
  role?: "techlead" | "backend" | "frontend" | "qa" | string;
  title?: string;
  status?: string;
  prUrl?: string;
  updatedAt?: string;
  [k: string]: unknown;
};

type Board = {
  queue?: {
    backlog?: BoardItem[];
    inProgress?: BoardItem[];
    done?: BoardItem[];
  };
  meta?: {
    updatedAt?: string;
  };
};

export default function Dashboard() {
  const [board, setBoard] = useState<ApiState<Board>>({ status: "idle" });
  const [agents, setAgents] = useState<ApiState<{ raw: string }>>({ status: "idle" });

  async function load() {
    setBoard({ status: "loading" });
    setAgents({ status: "loading" });

    try {
      const r = await fetch("/api/board", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j?.error?.message || "Board fetch failed");
      setBoard({ status: "ok", data: j.data });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setBoard({ status: "error", error: message });
    }

    try {
      const r = await fetch("/api/agents", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j?.error?.message || "Agents fetch failed");
      setAgents({ status: "ok", data: j.data });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setAgents({ status: "error", error: message });
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, []);

  const counts = useMemo(() => {
    if (board.status !== "ok") return null;
    const q = board.data.queue || {};
    return {
      backlog: q.backlog?.length ?? 0,
      inProgress: q.inProgress?.length ?? 0,
      done: q.done?.length ?? 0,
      updatedAt: board.data.meta?.updatedAt,
    };
  }, [board]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Board</h2>
          <button
            onClick={load}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm hover:bg-zinc-800"
          >
            Refresh
          </button>
        </div>

        {board.status === "loading" && <p className="mt-4 text-sm text-zinc-300">Loading…</p>}
        {board.status === "error" && (
          <p className="mt-4 text-sm text-red-300">Error: {board.error}</p>
        )}
        {board.status === "ok" && counts && (
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Stat label="Backlog" value={counts.backlog} />
            <Stat label="In progress" value={counts.inProgress} />
            <Stat label="Done" value={counts.done} />
            <div className="col-span-3 mt-2 text-xs text-zinc-400">
              Updated: {counts.updatedAt || "(unknown)"}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-5">
        <h2 className="text-lg font-semibold">Agents</h2>
        <p className="mt-1 text-xs text-zinc-400">From local `openclaw status`.</p>

        {agents.status === "loading" && <p className="mt-4 text-sm text-zinc-300">Loading…</p>}
        {agents.status === "error" && (
          <p className="mt-4 text-sm text-red-300">Error: {agents.error}</p>
        )}
        {agents.status === "ok" && (
          <pre className="mt-4 max-h-[420px] overflow-auto rounded-lg bg-zinc-950/60 p-3 text-xs text-zinc-200">
{agents.data.raw}
          </pre>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
