import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function GET() {
  const summaryFile = path.join(process.cwd(), "data", "spark_analytics_summary.json");
  if (fs.existsSync(summaryFile)) {
    try {
      const summary = JSON.parse(fs.readFileSync(summaryFile, "utf-8"));
      return NextResponse.json({ success: true, data: summary });
    } catch {
      // Fallback
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      timestamp: null,
      engine: "Apache Spark / PySpark",
      total_claims_processed: 0,
      investigation_candidates_identified: 0,
      message: "No Spark analytics job has run yet.",
    },
  });
}

export async function POST() {
  try {
    const venvName = [".", "v", "e", "n", "v"].join("");
    const venvDir = process.env.VIRTUAL_ENV || path.join(/*turbopackIgnore: true*/ process.cwd(), venvName);
    const scriptPath = path.join(process.cwd(), "spark", "jobs", "claim_feature_analytics.py");

    const execEnv = {
      ...process.env,
      VIRTUAL_ENV: venvDir,
      PATH: `${path.join(venvDir, "bin")}:${process.env.PATH || ""}`,
    };

    // Run Spark job
    const { stdout, stderr } = await execAsync(`python3 ${scriptPath}`, {
      cwd: process.cwd(),
      env: execEnv,
      timeout: 60000,
    });

    const summaryFile = path.join(process.cwd(), "data", "spark_analytics_summary.json");
    let summaryData = null;
    if (fs.existsSync(summaryFile)) {
      summaryData = JSON.parse(fs.readFileSync(summaryFile, "utf-8"));
    }

    return NextResponse.json({
      success: true,
      message: "PySpark Feature Analytics Job completed successfully!",
      stdout: stdout.split("\n").filter(Boolean).slice(-10),
      stderr: stderr ? stderr.split("\n").slice(-5) : [],
      data: summaryData,
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Error executing Spark job";
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
