import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";

const REGISTRY_PATH =
  process.env.PROJECTS_REGISTRY_PATH || "/home/nacho/.openclaw/state/projects.registry.json";

type RegistryProject = { id: string; boardPath?: string };

type Registry = {
  projects?: RegistryProject[];
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  try {
    const regRaw = await readFile(REGISTRY_PATH, "utf8");
    const reg = JSON.parse(regRaw) as Registry;
    const project = (reg.projects || []).find((p) => p.id === projectId);
    if (!project) {
      return NextResponse.json(
        { ok: false, error: { code: "PROJECT_NOT_FOUND", message: `Unknown project: ${projectId}` } },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    // If boardPath is not specified, default to /data/projects/<id>.json
    const boardPath = project.boardPath || `/data/projects/${projectId}.json`;

    const raw = await readFile(boardPath, "utf8");
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
