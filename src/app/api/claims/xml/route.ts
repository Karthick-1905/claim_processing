import { NextRequest, NextResponse } from "next/server";
import { parseXmlClaimsBatch, parseXmlClaim } from "@/lib/services/xml-parser-service";
import { ingestClaim } from "@/lib/services/claim-service";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let xmlContent = "";

    if (contentType.includes("application/json")) {
      const jsonBody = await request.json();
      xmlContent = jsonBody.xml || jsonBody.content || "";
    } else {
      xmlContent = await request.text();
    }

    if (!xmlContent || !xmlContent.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "ERR_EMPTY_XML: No XML content provided in the request body.",
        },
        { status: 400 }
      );
    }

    // Attempt batch extraction first
    const batchResult = parseXmlClaimsBatch(xmlContent);

    if (batchResult.totalExtracted === 0) {
      // Try single parsing
      const single = parseXmlClaim(xmlContent);
      if (!single.success || !single.data) {
        return NextResponse.json(
          {
            success: false,
            error: single.error || "ERR_XML_PARSE_FAILURE: Failed to parse XML structure.",
          },
          { status: 422 }
        );
      }

      const ingested = await ingestClaim(single.data);
      return NextResponse.json(
        {
          success: ingested.success,
          mode: "SINGLE",
          total_submitted: 1,
          successful_ingestions: ingested.success ? 1 : 0,
          claims: [ingested.claim],
          validation_errors: ingested.validation_errors.length > 0 ? ingested.validation_errors : undefined,
        },
        { status: ingested.success ? 201 : 422 }
      );
    }

    // Process all extracted batch claims
    const processedClaims = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (const item of batchResult.results) {
      if (!item.result.success || !item.result.data) {
        errors.push({
          index: item.index,
          error: item.result.error || "Malformed XML node structure.",
        });
        continue;
      }

      try {
        const result = await ingestClaim(item.result.data);
        if (result.success) {
          processedClaims.push(result.claim);
        } else {
          errors.push({
            index: item.index,
            error: result.validation_errors.join(", ") || result.message,
          });
        }
      } catch (err) {
        errors.push({
          index: item.index,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const statusCode = processedClaims.length > 0 ? 201 : 422;

    return NextResponse.json(
      {
        success: processedClaims.length > 0,
        mode: "BATCH_XML",
        total_submitted: batchResult.totalExtracted,
        successful_ingestions: processedClaims.length,
        failed_records: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        claims: processedClaims,
      },
      { status: statusCode }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error during XML ingestion";
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
