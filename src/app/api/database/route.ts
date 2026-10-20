import { NextResponse } from "next/server";
import { query, isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json(
      { success: false, message: "DATABASE_URL is not configured." },
      { status: 503 }
    );
  }

  try {
    const batches = await query("SELECT * FROM batches ORDER BY id ASC");
    const locations = await query("SELECT * FROM locations ORDER BY id ASC");
    const products = await query("SELECT * FROM products ORDER BY id ASC");
    const productLocations = await query(`
      SELECT 
        pl.id,
        pl.product_id,
        p.name AS product_name,
        p.sku,
        pl.location_id,
        l.code AS location_code,
        l.zone,
        pl.stock_quantity,
        pl.created_at
      FROM product_locations pl
      JOIN products p ON pl.product_id = p.id
      JOIN locations l ON pl.location_id = l.id
      ORDER BY pl.product_id ASC, pl.stock_quantity DESC
    `);
    const batchLines = await query(`
      SELECT 
        bl.id,
        bl.batch_id,
        b.batch_number,
        bl.line_number,
        bl.product_id,
        p.name AS product_name,
        p.sku,
        p.ean,
        bl.assigned_location_id,
        l.code AS location_code,
        l.zone,
        bl.required_qty,
        bl.picked_qty,
        bl.is_completed,
        bl.updated_at
      FROM batch_lines bl
      JOIN batches b ON bl.batch_id = b.id
      JOIN products p ON bl.product_id = p.id
      JOIN locations l ON bl.assigned_location_id = l.id
      ORDER BY bl.line_number ASC
    `);

    return NextResponse.json({
      success: true,
      tables: {
        batch_lines: batchLines.rows,
        product_locations: productLocations.rows,
        products: products.rows,
        locations: locations.rows,
        batches: batches.rows,
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/database error:", err);
    return NextResponse.json(
      {
        success: false,
        message: err instanceof Error ? err.message : "Failed to fetch database tables.",
      },
      { status: 500 }
    );
  }
}
