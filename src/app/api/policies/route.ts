import { NextResponse } from "next/server";
import { getAllPolicies, getAllCustomers } from "@/lib/services/policy-service";

export async function GET() {
  try {
    const [policies, customers] = await Promise.all([
      getAllPolicies(),
      getAllCustomers(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        policies,
        customers,
      },
    });
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Error fetching policies and customers";
    return NextResponse.json({ success: false, error: errMessage }, { status: 500 });
  }
}
