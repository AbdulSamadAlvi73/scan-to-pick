import { test, expect } from "@playwright/test";

test.describe("PostgreSQL Backend & API Integration Tests", () => {
  test.beforeEach(async ({ request }) => {
    // Reset batch to initial clean state
    const resetRes = await request.post("http://localhost:3000/api/batch", {
      data: { action: "reset" },
    });
    expect(resetRes.status()).toBe(200);
    const body = await resetRes.json();
    expect(body.success).toBe(true);
    expect(body.data.currentLine.lineNumber).toBe(1);
    expect(body.data.currentLine.pickedQty).toBe(0);
  });

  test("1. GET /api/batch returns 8 lines and current incomplete line #1", async ({
    request,
  }) => {
    const res = await request.get("http://localhost:3000/api/batch");
    expect(res.status()).toBe(200);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.data.batchNumber).toBe("BATCH-2026-001");
    expect(body.data.totalLines).toBe(8);
    expect(body.data.completedLinesCount).toBe(0);
    expect(body.data.isBatchComplete).toBe(false);

    // Current line verification
    const currentLine = body.data.currentLine;
    expect(currentLine).not.toBeNull();
    expect(currentLine.lineNumber).toBe(1);
    expect(currentLine.productName).toBe("Pro Wireless Mechanical Keyboard");
    expect(currentLine.productEan).toBe("8712345678901");
    expect(currentLine.assignedLocationCode).toBe("A-01-01");
    expect(currentLine.requiredQty).toBe(2);
    expect(currentLine.pickedQty).toBe(0);
    expect(currentLine.isCompleted).toBe(false);
  });

  test("2. POST /api/scan with correct EAN increments picked_qty in database", async ({
    request,
  }) => {
    // Fetch active line dynamically
    const initRes = await request.get("http://localhost:3000/api/batch");
    const initData = await initRes.json();
    const line = initData.data.currentLine;

    const scanRes = await request.post("http://localhost:3000/api/scan", {
      data: {
        batchId: initData.data.batchId,
        lineId: line.id,
        scannedEan: line.productEan,
      },
    });

    expect(scanRes.status()).toBe(200);
    const scanData = await scanRes.json();
    expect(scanData.success).toBe(true);
    expect(scanData.updatedLine.pickedQty).toBe(1);
    expect(scanData.updatedLine.isCompleted).toBe(false);

    // Verify persistence by fetching batch state directly from DB endpoint
    const batchRes = await request.get("http://localhost:3000/api/batch");
    const batchData = await batchRes.json();
    expect(batchData.data.currentLine.pickedQty).toBe(1);
  });

  test("3. POST /api/scan with wrong EAN is rejected with HTTP 400 and quantity unchanged", async ({
    request,
  }) => {
    const initRes = await request.get("http://localhost:3000/api/batch");
    const initData = await initRes.json();
    const line = initData.data.currentLine;

    const scanRes = await request.post("http://localhost:3000/api/scan", {
      data: {
        batchId: initData.data.batchId,
        lineId: line.id,
        scannedEan: "0000000000000",
      },
    });

    expect(scanRes.status()).toBe(400);
    const scanData = await scanRes.json();
    expect(scanData.success).toBe(false);
    expect(scanData.errorType).toBe("WRONG_EAN");
    expect(scanData.message).toContain("Wrong barcode!");

    // Verify quantity was NOT updated in PostgreSQL
    const batchRes = await request.get("http://localhost:3000/api/batch");
    const batchData = await batchRes.json();
    expect(batchData.data.currentLine.pickedQty).toBe(0);
  });

  test("4. Completing Line #1 automatically advances to Line #2", async ({
    request,
  }) => {
    const initRes = await request.get("http://localhost:3000/api/batch");
    const initData = await initRes.json();
    const line = initData.data.currentLine;

    // Pick item 1 of 2
    await request.post("http://localhost:3000/api/scan", {
      data: {
        batchId: initData.data.batchId,
        lineId: line.id,
        scannedEan: line.productEan,
      },
    });

    // Pick item 2 of 2 -> completes line
    const secondScan = await request.post("http://localhost:3000/api/scan", {
      data: {
        batchId: initData.data.batchId,
        lineId: line.id,
        scannedEan: line.productEan,
      },
    });
    expect(secondScan.status()).toBe(200);
    const secondData = await secondScan.json();
    expect(secondData.updatedLine.isCompleted).toBe(true);
    expect(secondData.nextLine.lineNumber).toBe(2);
    expect(secondData.nextLine.productName).toBe(
      "Ergonomic Vertical Optical Mouse"
    );

    // Verify database state: currentLine is now Line #2
    const batchRes = await request.get("http://localhost:3000/api/batch");
    const batchData = await batchRes.json();
    expect(batchData.data.completedLinesCount).toBe(1);
    expect(batchData.data.currentLine.lineNumber).toBe(2);
    expect(batchData.data.currentLine.assignedLocationCode).toBe("A-01-02");
  });

  test("5. GET /api/locations returns stocked alternative warehouse locations", async ({
    request,
  }) => {
    const initRes = await request.get("http://localhost:3000/api/batch");
    const initData = await initRes.json();
    const line = initData.data.currentLine;

    const res = await request.get(
      `http://localhost:3000/api/locations?productId=${line.productId}&currentLocationId=${line.assignedLocationId}`
    );
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(Array.isArray(data.locations)).toBe(true);
    expect(data.locations.length).toBeGreaterThan(0);

    const overflowLoc = data.locations.find(
      (l: { locationCode: string }) => l.locationCode === "OVERFLOW-A1"
    );
    expect(overflowLoc).toBeDefined();
    expect(overflowLoc.stockQuantity).toBe(24);
  });

  test("6. POST /api/locations updates assigned shelf in database", async ({
    request,
  }) => {
    const initRes = await request.get("http://localhost:3000/api/batch");
    const initData = await initRes.json();
    const line = initData.data.currentLine;

    // Reassign line 1 to location 11 (OVERFLOW-A1)
    const updateRes = await request.post("http://localhost:3000/api/locations", {
      data: { lineId: line.id, newLocationId: 11 },
    });
    expect(updateRes.status()).toBe(200);
    const updateData = await updateRes.json();
    expect(updateData.success).toBe(true);
    expect(updateData.updatedLine.assignedLocationCode).toBe("OVERFLOW-A1");

    // Verify change is persisted in PostgreSQL
    const batchRes = await request.get("http://localhost:3000/api/batch");
    const batchData = await batchRes.json();
    expect(batchData.data.currentLine.assignedLocationCode).toBe("OVERFLOW-A1");
  });
});
