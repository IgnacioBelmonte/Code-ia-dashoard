"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

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

type TabKey = "runtime" | "inProgress" | "backlog" | "done";

export default function Dashboard() {
  const [board, setBoard] = useState<ApiState<Board>>({ status: "idle" });
  const [tab, setTab] = useState<TabKey>("inProgress");

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
    <div className="grid gap-4">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 sm:p-5">
        <div className="sticky top-2 z-10 -mx-2 mb-4 rounded-lg border border-zinc-800 bg-zinc-950/90 px-2 py-2 backdrop-blur sm:mx-0 sm:px-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold sm:text-lg">Board · Tablero</h2>
            <button
              onClick={load}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs hover:bg-zinc-800 sm:text-sm"
            >
              Refresh · Actualizar
            </button>
          </div>
          <p className="mt-1 text-xs text-zinc-400">Auto-refresh cada 15s · Carga ligera para Raspberry Pi</p>
        </div>

        {board.status === "loading" && <LoadingSkeleton />}
        {board.status === "error" && <p className="mt-2 text-sm text-red-300">Error: {board.error}</p>}

        {board.status === "ok" && counts && (
          <div className="mt-2">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Stat label="Backlog · Pendiente" value={counts.backlog} />
              <Stat label="In progress · En curso" value={counts.inProgress} />
              <Stat label="Done · Hecho" value={counts.done} />
            </div>

            <div className="mt-2 text-xs text-zinc-400">Updated · Actualizado: {counts.updatedAt || "(unknown)"}</div>

            <div className="mt-4 flex flex-wrap gap-2">
              <TabButton active={tab === "runtime"} onClick={() => setTab("runtime")}>
                Runtime
              </TabButton>
              <TabButton active={tab === "inProgress"} onClick={() => setTab("inProgress")}>
                In progress · En curso
              </TabButton>
              <TabButton active={tab === "backlog"} onClick={() => setTab("backlog")}>
                Backlog · Pendiente
              </TabButton>
              <TabButton active={tab === "done"} onClick={() => setTab("done")}>
                Done · Hecho
              </TabButton>
            </div>

            <div className="mt-4">
              {tab === "runtime" && <RuntimeSection runtime={board.data.runtime} />}
              {tab === "inProgress" && <BoardSection title="In progress · En curso" items={board.data.queue?.inProgress} />}
              {tab === "backlog" && <BoardSection title="Backlog · Pendiente" items={board.data.queue?.backlog} />}
              {tab === "done" && <BoardSection title="Done · Hecho" items={board.data.queue?.done} />}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-xs sm:text-sm ${
        active ? "border-zinc-500 bg-zinc-800 text-zinc-100" : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mt-2 grid gap-3 animate-pulse">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="h-20 rounded-lg bg-zinc-900" />
        <div className="h-20 rounded-lg bg-zinc-900" />
        <div className="h-20 rounded-lg bg-zinc-900" />
      </div>
      <div className="h-40 rounded-lg bg-zinc-900" />
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
      <h3 className="text-sm font-semibold text-zinc-100">Runtime URLs</h3>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
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
        Tip · Consejo: el túnel DEV (trycloudflare) es temporal. Si cambia, actualiza la redirect URI de Spotify.
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
        <p className="mt-2 text-sm text-zinc-400">No data · Sin datos.</p>
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
      {copied ? "Copied · Copiado" : "Copy · Copiar"}
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
        <p className="mt-3 text-sm text-zinc-400">No items · Sin elementos.</p>
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
                        <span className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300">{it.role}</span>
                      )}
                      {it.status && (
                        <span className="rounded bg-zinc-900 px-2 py-0.5 text-xs text-zinc-300">{it.status}</span>
                      )}
                    </div>

                    <div className="mt-1 text-sm text-zinc-100 sm:text-[15px]">{it.title || "(no title)"}</div>

                    {it.updatedAt && (
                      <div className="mt-1 break-words text-xs text-zinc-500">Updated · Actualizado: {it.updatedAt}</div>
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
