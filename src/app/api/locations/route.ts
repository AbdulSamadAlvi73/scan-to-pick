import { NextResponse } from "next/server";
import {
  getAlternativeLocations,
  updateLineLocation,
} from "@/lib/picking-service";
import { isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { success: false, message: "DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const currentLocationId = searchParams.get("currentLocationId");

    if (!productId || !currentLocationId) {
      return NextResponse.json(
        {
          success: false,
          message: "Missing productId or currentLocationId query parameter.",
        },
        { status: 400 }
      );
    }

    const locations = await getAlternativeLocations(
      Number(productId),
      Number(currentLocationId)
    );

    return NextResponse.json({ success: true, locations });
  } catch (err: unknown) {
    console.error("GET /api/locations error:", err);
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof Error
            ? err.message
            : "Failed to fetch alternative locations.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { success: false, message: "DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { lineId, newLocationId } = body;

    if (!lineId || !newLocationId) {
      return NextResponse.json(
        { success: false, message: "Missing lineId or newLocationId." },
        { status: 400 }
      );
    }

    const updatedLine = await updateLineLocation(
      Number(lineId),
      Number(newLocationId)
    );

    return NextResponse.json({
      success: true,
      message: `Assigned location updated to ${updatedLine.assignedLocationCode}.`,
      updatedLine,
    });
  } catch (err: unknown) {
    console.error("POST /api/locations error:", err);
    return NextResponse.json(
      {
        success: false,
        message:
          err instanceof Error
            ? err.message
            : "Failed to update assigned location.",
      },
      { status: 500 }
    );
  }
}
