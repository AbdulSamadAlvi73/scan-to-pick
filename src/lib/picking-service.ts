import { getClient, query } from "./db";
import {
  AlternativeLocation,
  BatchPickingState,
  PickingLine,
  ScanResult,
} from "./types";

export async function getCurrentPickingState(
  batchNumber: string = "BATCH-2026-001"
): Promise<BatchPickingState> {
  // 1. Fetch batch
  const batchRes = await query<{
    id: number;
    batch_number: string;
    status: "in_progress" | "completed";
  }>("SELECT id, batch_number, status FROM batches WHERE batch_number = $1", [
    batchNumber,
  ]);

  if (batchRes.rows.length === 0) {
    throw new Error(`Batch "${batchNumber}" was not found in the database.`);
  }

  const batch = batchRes.rows[0];

  // 2. Fetch all lines for the batch
  const linesRes = await query<{
    id: number;
    line_number: number;
    product_id: number;
    product_sku: string;
    product_name: string;
    product_ean: string;
    assigned_location_id: number;
    assigned_location_code: string;
    location_zone: string;
    required_qty: number;
    picked_qty: number;
    is_completed: boolean;
  }>(
    `SELECT 
       bl.id,
       bl.line_number,
       bl.product_id,
       p.sku AS product_sku,
       p.name AS product_name,
       p.ean AS product_ean,
       bl.assigned_location_id,
       l.code AS assigned_location_code,
       l.zone AS location_zone,
       bl.required_qty,
       bl.picked_qty,
       bl.is_completed
     FROM batch_lines bl
     JOIN products p ON bl.product_id = p.id
     JOIN locations l ON bl.assigned_location_id = l.id
     WHERE bl.batch_id = $1
     ORDER BY bl.line_number ASC`,
    [batch.id]
  );

  const lines: PickingLine[] = linesRes.rows.map((r) => ({
    id: r.id,
    lineNumber: r.line_number,
    productId: r.product_id,
    productSku: r.product_sku,
    productName: r.product_name,
    productEan: r.product_ean,
    assignedLocationId: r.assigned_location_id,
    assignedLocationCode: r.assigned_location_code,
    locationZone: r.location_zone,
    requiredQty: r.required_qty,
    pickedQty: r.picked_qty,
    isCompleted: r.is_completed,
  }));

  const totalLines = lines.length;
  const completedLinesCount = lines.filter((l) => l.isCompleted).length;
  const currentIncompleteLine = lines.find((l) => !l.isCompleted) || null;
  const isBatchComplete = totalLines > 0 && completedLinesCount === totalLines;

  return {
    batchId: batch.id,
    batchNumber: batch.batch_number,
    batchStatus: isBatchComplete ? "completed" : "in_progress",
    totalLines,
    completedLinesCount,
    currentLine: currentIncompleteLine,
    isBatchComplete,
  };
}

export async function processScan(
  batchId: number,
  lineId: number,
  rawEan: string
): Promise<ScanResult> {
  const scannedEan = (rawEan || "").trim();

  if (!scannedEan) {
    return {
      success: false,
      errorType: "INVALID_INPUT",
      message: "Please enter or scan a barcode.",
    };
  }

  const client = await getClient();

  try {
    await client.query("BEGIN");

    // 1. Fetch line with row lock to prevent race conditions
    const lineRes = await client.query<{
      id: number;
      batch_id: number;
      line_number: number;
      product_id: number;
      assigned_location_id: number;
      required_qty: number;
      picked_qty: number;
      is_completed: boolean;
      product_name: string;
      product_sku: string;
      product_ean: string;
      assigned_location_code: string;
      location_zone: string;
    }>(
      `SELECT 
         bl.id,
         bl.batch_id,
         bl.line_number,
         bl.product_id,
         bl.assigned_location_id,
         bl.required_qty,
         bl.picked_qty,
         bl.is_completed,
         p.name AS product_name,
         p.sku AS product_sku,
         p.ean AS product_ean,
         l.code AS assigned_location_code,
         l.zone AS location_zone
       FROM batch_lines bl
       JOIN products p ON bl.product_id = p.id
       JOIN locations l ON bl.assigned_location_id = l.id
       WHERE bl.id = $1 AND bl.batch_id = $2
       FOR UPDATE OF bl`,
      [lineId, batchId]
    );

    if (lineRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return {
        success: false,
        errorType: "INVALID_INPUT",
        message: "Picking line not found.",
      };
    }

    const line = lineRes.rows[0];

    // Check if already completed
    if (line.is_completed || line.picked_qty >= line.required_qty) {
      await client.query("ROLLBACK");
      return {
        success: false,
        errorType: "ALREADY_COMPLETED",
        message: `Line #${line.line_number} is already complete.`,
      };
    }

    // 2. Barcode comparison
    if (scannedEan !== line.product_ean) {
      // Barcode does not match current product: reject without incrementing
      await client.query("ROLLBACK");
      return {
        success: false,
        errorType: "WRONG_EAN",
        scannedEan,
        message: `Wrong barcode! Scanned "${scannedEan}", expected "${line.product_ean}" (${line.product_name}).`,
      };
    }

    // 3. Atomically increment picked quantity by 1
    const newPickedQty = line.picked_qty + 1;
    const isNowCompleted = newPickedQty >= line.required_qty;

    await client.query(
      `UPDATE batch_lines 
       SET picked_qty = $1, is_completed = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [newPickedQty, isNowCompleted, line.id]
    );

    // 4. Check if batch is completely finished
    const remainingRes = await client.query<{ count: string }>(
      "SELECT COUNT(*) AS count FROM batch_lines WHERE batch_id = $1 AND is_completed = false",
      [batchId]
    );
    const remainingIncomplete = parseInt(remainingRes.rows[0].count, 10);
    const isBatchComplete = remainingIncomplete === 0;

    if (isBatchComplete) {
      await client.query(
        "UPDATE batches SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [batchId]
      );
    }

    await client.query("COMMIT");

    // 5. Build updated line and find next line
    const updatedLine: PickingLine = {
      id: line.id,
      lineNumber: line.line_number,
      productId: line.product_id,
      productSku: line.product_sku,
      productName: line.product_name,
      productEan: line.product_ean,
      assignedLocationId: line.assigned_location_id,
      assignedLocationCode: line.assigned_location_code,
      locationZone: line.location_zone,
      requiredQty: line.required_qty,
      pickedQty: newPickedQty,
      isCompleted: isNowCompleted,
    };

    // Find next incomplete line
    const nextLineRes = await query<{
      id: number;
      line_number: number;
      product_id: number;
      product_sku: string;
      product_name: string;
      product_ean: string;
      assigned_location_id: number;
      assigned_location_code: string;
      location_zone: string;
      required_qty: number;
      picked_qty: number;
      is_completed: boolean;
    }>(
      `SELECT 
         bl.id,
         bl.line_number,
         bl.product_id,
         p.sku AS product_sku,
         p.name AS product_name,
         p.ean AS product_ean,
         bl.assigned_location_id,
         l.code AS assigned_location_code,
         l.zone AS location_zone,
         bl.required_qty,
         bl.picked_qty,
         bl.is_completed
       FROM batch_lines bl
       JOIN products p ON bl.product_id = p.id
       JOIN locations l ON bl.assigned_location_id = l.id
       WHERE bl.batch_id = $1 AND bl.is_completed = false
       ORDER BY bl.line_number ASC
       LIMIT 1`,
      [batchId]
    );

    const nextLine: PickingLine | null =
      nextLineRes.rows.length > 0
        ? {
            id: nextLineRes.rows[0].id,
            lineNumber: nextLineRes.rows[0].line_number,
            productId: nextLineRes.rows[0].product_id,
            productSku: nextLineRes.rows[0].product_sku,
            productName: nextLineRes.rows[0].product_name,
            productEan: nextLineRes.rows[0].product_ean,
            assignedLocationId: nextLineRes.rows[0].assigned_location_id,
            assignedLocationCode: nextLineRes.rows[0].assigned_location_code,
            locationZone: nextLineRes.rows[0].location_zone,
            requiredQty: nextLineRes.rows[0].required_qty,
            pickedQty: nextLineRes.rows[0].picked_qty,
            isCompleted: nextLineRes.rows[0].is_completed,
          }
        : null;

    return {
      success: true,
      message: isNowCompleted
        ? `Line #${line.line_number} completed!`
        : `Item scanned! Picked ${newPickedQty} of ${line.required_qty}.`,
      scannedEan,
      updatedLine,
      nextLine,
      isBatchComplete,
    };
  } catch (err: unknown) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Ignore rollback failure if connection was severed
    }
    console.error("Error processing barcode scan:", err);
    return {
      success: false,
      errorType: "DB_ERROR",
      message:
        err instanceof Error ? err.message : "Database error processing scan.",
    };
  } finally {
    try {
      client.release();
    } catch {
      // Ignore release failure if client was destroyed
    }
  }
}

export async function getAlternativeLocations(
  productId: number,
  currentLocationId: number
): Promise<AlternativeLocation[]> {
  const res = await query<{
    location_id: number;
    location_code: string;
    zone: string;
    stock_quantity: number;
  }>(
    `SELECT 
       pl.location_id,
       l.code AS location_code,
       l.zone,
       pl.stock_quantity
     FROM product_locations pl
     JOIN locations l ON pl.location_id = l.id
     WHERE pl.product_id = $1 
       AND pl.location_id != $2 
       AND pl.stock_quantity > 0
     ORDER BY pl.stock_quantity DESC, l.code ASC`,
    [productId, currentLocationId]
  );

  return res.rows.map((r) => ({
    locationId: r.location_id,
    locationCode: r.location_code,
    zone: r.zone,
    stockQuantity: r.stock_quantity,
  }));
}

export async function updateLineLocation(
  lineId: number,
  newLocationId: number
): Promise<PickingLine> {
  const res = await query<{
    id: number;
    line_number: number;
    product_id: number;
    product_sku: string;
    product_name: string;
    product_ean: string;
    assigned_location_id: number;
    assigned_location_code: string;
    location_zone: string;
    required_qty: number;
    picked_qty: number;
    is_completed: boolean;
  }>(
    `WITH updated AS (
       UPDATE batch_lines
       SET assigned_location_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND is_completed = false
       RETURNING *
     )
     SELECT 
       u.id,
       u.line_number,
       u.product_id,
       p.sku AS product_sku,
       p.name AS product_name,
       p.ean AS product_ean,
       u.assigned_location_id,
       l.code AS assigned_location_code,
       l.zone AS location_zone,
       u.required_qty,
       u.picked_qty,
       u.is_completed
     FROM updated u
     JOIN products p ON u.product_id = p.id
     JOIN locations l ON u.assigned_location_id = l.id`,
    [newLocationId, lineId]
  );

  if (res.rows.length === 0) {
    throw new Error("Unable to update location. Line may already be completed.");
  }

  const r = res.rows[0];
  return {
    id: r.id,
    lineNumber: r.line_number,
    productId: r.product_id,
    productSku: r.product_sku,
    productName: r.product_name,
    productEan: r.product_ean,
    assignedLocationId: r.assigned_location_id,
    assignedLocationCode: r.assigned_location_code,
    locationZone: r.location_zone,
    requiredQty: r.required_qty,
    pickedQty: r.picked_qty,
    isCompleted: r.is_completed,
  };
}

export async function resetDemoBatch(): Promise<void> {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    // Reset batch status
    await client.query(
      "UPDATE batches SET status = 'in_progress', updated_at = CURRENT_TIMESTAMP WHERE id = 1"
    );
    // Reset all lines to 0 picked and primary location
    await client.query(
      `UPDATE batch_lines bl
       SET picked_qty = 0, 
           is_completed = false, 
           assigned_location_id = bl.product_id, -- Maps back to original 1..8
           updated_at = CURRENT_TIMESTAMP
       WHERE bl.batch_id = 1`
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
