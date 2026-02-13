import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

const execFileAsync = promisify(execFile);

export async function GET() {
  try {
    // We rely on the local OpenClaw CLI status output for a simple, LAN-only dashboard.
    // If JSON output is not supported, we fall back to plain text.
    const { stdout } = await execFileAsync("openclaw", ["status"], { timeout: 20_000 });
    return NextResponse.json(
      { ok: true, data: { raw: stdout } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: { code: "AGENTS_STATUS_FAILED", message } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
