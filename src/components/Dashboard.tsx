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

type BoardRuntime = {
  main?: {
    lanUrl?: string;
    dbHostPort?: number;
  };
  dev?: {
    lanUrl?: string;
    tunnelUrl?: string;
    spotifyRedirectUri?: string;
    dbHostPort?: number;
  };
};

type Board = {
  runtime?: BoardRuntime;
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

  async function load() {
    setBoard({ status: "loading" });

    try {
      const r = await fetch("/api/board", { cache: "no-store" });
      const j = await r.json();
      if (!j.ok) throw new Error(j?.error?.message || "Board fetch failed");
      setBoard({ status: "ok", data: j.data });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setBoard({ status: "error", error: message });
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
    <div className="grid gap-6">
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
        {board.status === "error" && <p className="mt-4 text-sm text-red-300">Error: {board.error}</p>}

        {board.status === "ok" && counts && (
          <div className="mt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Backlog" value={counts.backlog} />
              <Stat label="In progress" value={counts.inProgress} />
              <Stat label="Done" value={counts.done} />
            </div>

            <div className="mt-2 text-xs text-zinc-400">Updated: {counts.updatedAt || "(unknown)"}</div>

            <div className="mt-5 grid gap-4">
              <RuntimeSection runtime={board.data.runtime} />
              <BoardSection title="In progress" items={board.data.queue?.inProgress} />
              <BoardSection title="Backlog" items={board.data.queue?.backlog} />
              <BoardSection title="Done" items={board.data.queue?.done} />
            </div>
          </div>
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

function RuntimeSection({ runtime }: { runtime?: BoardRuntime }) {
  const mainLan = runtime?.main?.lanUrl;
  const devLan = runtime?.dev?.lanUrl;
  const devTunnel = runtime?.dev?.tunnelUrl;
  const devRedirect = runtime?.dev?.spotifyRedirectUri;
  const mainDbPort = runtime?.main?.dbHostPort;
  const devDbPort = runtime?.dev?.dbHostPort;

  if (!mainLan && !devLan && !devTunnel && !devRedirect) return null;

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-100">Runtime URLs</h3>
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <RuntimeCard
          title="MAIN"
          items={[
            { label: "LAN", value: mainLan },
            { label: "DB", value: mainDbPort ? `:${mainDbPort}` : undefined },
          ]}
        />
        <RuntimeCard
          title="DEV"
          items={[
            { label: "LAN", value: devLan },
            { label: "Tunnel", value: devTunnel },
            { label: "Spotify redirect", value: devRedirect },
            { label: "DB", value: devDbPort ? `:${devDbPort}` : undefined },
          ]}
        />
      </div>

      <p className="mt-3 text-xs text-zinc-500">
        Tip: the DEV tunnel is temporary (trycloudflare). If it changes, update the Spotify redirect URI.
      </p>
    </section>
  );
}

function RuntimeCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; value?: string }[];
}) {
  const visible = items.filter((it) => typeof it.value === "string" && it.value.length > 0);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="text-xs font-semibold tracking-wide text-zinc-300">{title}</div>

      {visible.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-400">No data.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {visible.map((it) => (
            <li key={`${title}-${it.label}`} className="grid gap-1">
              <div className="text-xs text-zinc-500">{it.label}</div>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 break-all rounded bg-zinc-900 px-2 py-1 text-xs text-zinc-100">
                  {it.value}
                </code>
                <CopyButton value={it.value!} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1200);
        } catch {
          // ignore
        }
      }}
      className="shrink-0 rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200 hover:bg-zinc-800"
      aria-label="Copy to clipboard"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function BoardSection({ title, items }: { title: string; items?: BoardItem[] }) {
  const list = items ?? [];

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
        <span className="shrink-0 text-xs tabular-nums text-zinc-400">{list.length}</span>
      </div>

      {list.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-400">No items.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {list.map((it, idx) => {
            const key = `${it.ticketId || "item"}-${idx}`;
            return (
              <li key={key} className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-zinc-900 px-2 py-0.5 text-xs font-semibold text-zinc-200">
                        {it.ticketId || "(no id)"}
                      </span>
                      {it.role && (
                        <span className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300">
                          {it.role}
                        </span>
                      )}
                      {it.status && (
                        <span className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300">
                          {it.status}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 text-sm text-zinc-100 sm:text-[15px]">
                      {it.title || "(no title)"}
                    </div>

                    {it.updatedAt && (
                      <div className="mt-1 break-words text-xs text-zinc-500">Updated: {it.updatedAt}</div>
                    )}
                  </div>

                  {typeof it.prUrl === "string" && it.prUrl.length > 0 && (
                    <a
                      href={it.prUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-center text-xs text-zinc-200 hover:bg-zinc-800 sm:w-auto sm:px-3 sm:py-1.5"
                    >
                      PR
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
