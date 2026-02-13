import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

const BOARD_PATH = process.env.BOARD_PATH || "/home/nacho/.openclaw/state/spotify-insights-board.json";

export async function GET() {
  try {
    const raw = await readFile(BOARD_PATH, "utf8");
    const data = JSON.parse(raw);
    return NextResponse.json({ ok: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: { code: "BOARD_READ_FAILED", message } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
