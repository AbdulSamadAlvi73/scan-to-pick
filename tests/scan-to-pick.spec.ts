import { test, expect } from "@playwright/test";

test.describe("Scan-to-Pick Warehouse Flow", () => {
  test.beforeEach(async ({ request }) => {
    // Deterministic database reset before each test
    const resetRes = await request.post("http://localhost:3000/api/batch", {
      data: { action: "reset" },
    });
    expect(resetRes.ok()).toBeTruthy();
  });

  test("1. Correct barcode scan increments picked quantity by exactly one", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");

    // Verify initial line state
    await expect(page.locator("#active-location-code")).toHaveText("A-01-01");
    await expect(page.locator("#active-product-name")).toContainText(
      "Pro Wireless Mechanical Keyboard"
    );
    await expect(page.locator("#picked-qty")).toHaveText("0");
    await expect(page.locator("#required-qty")).toHaveText("2");

    // Scan correct EAN for line 1
    const barcodeInput = page.locator("#barcode-input");
    await expect(barcodeInput).toBeFocused();
    await barcodeInput.fill("8712345678901");
    await barcodeInput.press("Enter");

    // Verify quantity incremented by exactly 1
    await expect(page.locator("#picked-qty")).toHaveText("1");
    await expect(page.locator("#required-qty")).toHaveText("2");

    // Verify scanner input was cleared and refocused
    await expect(barcodeInput).toHaveValue("");
    await expect(barcodeInput).toBeFocused();

    // Verify success feedback
    await expect(page.locator("#scan-feedback-banner")).toBeVisible();
    await expect(page.locator("#scan-feedback-banner")).toContainText(
      "Item scanned! Picked 1 of 2."
    );
  });

  test("2. Wrong barcode scan shows clear red error and leaves quantity unchanged", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");

    // Verify initial count is 0
    await expect(page.locator("#picked-qty")).toHaveText("0");

    // Enter incorrect EAN
    const barcodeInput = page.locator("#barcode-input");
    await barcodeInput.fill("9999999999999");
    await barcodeInput.press("Enter");

    // Verify error banner is visible and styled as an error
    const feedbackBanner = page.locator("#scan-feedback-banner");
    await expect(feedbackBanner).toBeVisible();
    await expect(feedbackBanner).toContainText("Wrong barcode!");
    await expect(feedbackBanner).toContainText("9999999999999");

    // Verify picked quantity was NOT incremented
    await expect(page.locator("#picked-qty")).toHaveText("0");
    await expect(page.locator("#required-qty")).toHaveText("2");
  });

  test("3. Line completion auto-advances to next incomplete line and persists on page reload", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");

    const barcodeInput = page.locator("#barcode-input");

    // Line 1: requires 2 items
    // First scan: picks 1 of 2
    await barcodeInput.fill("8712345678901");
    await barcodeInput.press("Enter");
    await expect(page.locator("#picked-qty")).toHaveText("1");

    // Second scan: picks 2 of 2 -> completes line 1
    await barcodeInput.fill("8712345678901");
    await barcodeInput.press("Enter");

    // Automatically advances to Line 2 without any manual Next button or scrolling
    await expect(page.locator("#active-location-code")).toHaveText("A-01-02");
    await expect(page.locator("#active-product-name")).toContainText(
      "Ergonomic Vertical Optical Mouse"
    );
    await expect(page.locator("#picked-qty")).toHaveText("0");
    await expect(page.locator("#required-qty")).toHaveText("1");

    // Progress indicator updates to Line 2 of 8
    await expect(page.locator("#batch-progress-indicator")).toHaveText(
      "Line 2 of 8"
    );

    // Refresh the browser to verify PostgreSQL persistence
    await page.reload();

    // Verify after reload: progress was preserved in PostgreSQL
    await expect(page.locator("#active-location-code")).toHaveText("A-01-02");
    await expect(page.locator("#active-product-name")).toContainText(
      "Ergonomic Vertical Optical Mouse"
    );
    await expect(page.locator("#picked-qty")).toHaveText("0");
    await expect(page.locator("#required-qty")).toHaveText("1");
    await expect(page.locator("#batch-progress-indicator")).toHaveText(
      "Line 2 of 8"
    );
  });

  test("4. 'Not found' button displays stocked alternative locations and updates assigned shelf", async ({
    page,
  }) => {
    await page.goto("http://localhost:3000");

    // Open Not Found modal on Line 1 (Keyboard at A-01-01)
    await page.locator("#not-found-btn").click();

    // Modal dialog opens
    const modal = page.locator("div[role='dialog']");
    await expect(modal).toBeVisible();
    await expect(modal).toContainText("Alternative Stock Locations");

    // Verify secondary location OVERFLOW-A1 with available stock is listed
    const altOption = page.locator("#alt-loc-11");
    await expect(altOption).toBeVisible();
    await expect(altOption).toContainText("OVERFLOW-A1");
    await expect(altOption).toContainText("24 in stock");

    // Select the alternative location
    await altOption.click();

    // Modal closes
    await expect(modal).not.toBeVisible();

    // Verify active line now shows the new assigned location
    await expect(page.locator("#active-location-code")).toHaveText(
      "OVERFLOW-A1"
    );

    // Scanner input should immediately regain focus
    await expect(page.locator("#barcode-input")).toBeFocused();
  });
});
