import { NextResponse } from "next/server";
import { processScan } from "@/lib/picking-service";
import { isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      {
        success: false,
        errorType: "DB_ERROR",
        message:
          "DATABASE_URL is not set. Please configure PostgreSQL in .env.local.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { batchId, lineId, scannedEan } = body;

    if (!batchId || !lineId || typeof scannedEan !== "string") {
      return NextResponse.json(
        {
          success: false,
          errorType: "INVALID_INPUT",
          message: "Missing required fields: batchId, lineId, or scannedEan.",
        },
        { status: 400 }
      );
    }

    const result = await processScan(
      Number(batchId),
      Number(lineId),
      scannedEan
    );

    if (!result.success) {
      const status = result.errorType === "DB_ERROR" ? 500 : 400;
      return NextResponse.json(result, { status });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    console.error("POST /api/scan error:", err);
    return NextResponse.json(
      {
        success: false,
        errorType: "DB_ERROR",
        message:
          err instanceof Error
            ? err.message
            : "An unexpected server error occurred.",
      },
      { status: 500 }
    );
  }
}
