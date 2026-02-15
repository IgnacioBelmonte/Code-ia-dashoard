import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

const REGISTRY_PATH =
  process.env.PROJECTS_REGISTRY_PATH || "/home/nacho/.openclaw/state/projects.registry.json";

export async function GET() {
  try {
    const raw = await readFile(REGISTRY_PATH, "utf8");
    const data = JSON.parse(raw);

    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: { code: "REGISTRY_READ_FAILED", message } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
