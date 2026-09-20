import { NextResponse } from "next/server";
import { seedDatabase } from "@/lib/services/seed-service";

export async function POST() {
  try {
    const summary = await seedDatabase();
    return NextResponse.json({
      success: true,
      message: "Database successfully seeded with realistic master entities and claims.",
      data: summary,
    });
  } catch (error) {
    console.error("[Seed API Error]", error);
    const errMessage = error instanceof Error ? error.message : "Unknown error during seeding";
    return NextResponse.json(
      { success: false, error: errMessage },
      { status: 500 }
    );
  }
}
