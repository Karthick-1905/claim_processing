import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

export async function GET() {
  const statusFile = path.join(process.cwd(), "data", "stream_status.json");
  if (fs.existsSync(statusFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(statusFile, "utf-8"));
      return NextResponse.json({ success: true, data });
    } catch {
      // Fallback
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      status: "IDLE",
      total_generated: 0,
      valid_claims: 0,
      invalid_claims: 0,
      last_updated: null,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const count = typeof body.count === "number" ? body.count : 15;
    const interval = typeof body.interval === "number" ? body.interval : 0.5;

    const venvName = [".", "v", "e", "n", "v"].join("");
    const venvDir = process.env.VIRTUAL_ENV || path.join(process.cwd(), venvName);
    const scriptPath = path.join(process.cwd(), "spark", "pipelines", "stream_generator.py");

    const spawnEnv = {
      ...process.env,
      VIRTUAL_ENV: venvDir,
      PATH: `${path.join(venvDir, "bin")}:${process.env.PATH || ""}`,
    };

    const child = spawn(
      /*turbopackIgnore: true*/
      "python3",
      [scriptPath, "--count", String(count), "--interval", String(interval)],
      {
        detached: true,
        stdio: "ignore",
        cwd: process.cwd(),
        env: spawnEnv,
      }
    );

    child.unref();

    return NextResponse.json({
      success: true,
      message: `Launched real-time stream worker to ingest ${count} claims at ${interval}s interval.`,
      pid: child.pid,
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Error launching stream worker";
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
