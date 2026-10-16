import { NextResponse } from "next/server";
import { getCurrentPickingState, resetDemoBatch } from "@/lib/picking-service";
import { isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: "DATABASE_NOT_CONFIGURED",
        message:
          "DATABASE_URL is not set. Please create a .env.local file with your PostgreSQL connection string.",
      },
      { status: 503 }
    );
  }

  try {
    const state = await getCurrentPickingState();
    return NextResponse.json({ success: true, data: state });
  } catch (err: unknown) {
    console.error("GET /api/batch error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "DB_CONNECTION_ERROR",
        message:
          err instanceof Error
            ? err.message
            : "Failed to connect to PostgreSQL database.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: "DATABASE_NOT_CONFIGURED",
        message: "DATABASE_URL is not configured.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    if (body.action === "reset") {
      await resetDemoBatch();
      const state = await getCurrentPickingState();
      return NextResponse.json({
        success: true,
        message: "Batch reset to initial state.",
        data: state,
      });
    }

    return NextResponse.json(
      { success: false, message: "Unknown action." },
      { status: 400 }
    );
  } catch (err: unknown) {
    console.error("POST /api/batch error:", err);
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof Error ? err.message : "Failed to reset batch.",
      },
      { status: 500 }
    );
  }
}
