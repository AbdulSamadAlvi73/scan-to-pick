# Scan-to-Pick Mobile Warehouse Application

A high-efficiency, mobile-first scan-to-pick screen built for warehouse order fulfillment with handheld barcode scanners. Designed for **SYNC FULFILLMENT** via **Loopin (SMC-Pvt) Limited**.

---

## 1. Quickstart & Setup Guide

### Prerequisites
- **Node.js**: v18.0.0+ (Tested on v24.16.0 LTS)
- **npm**: v9.0.0+ (Tested on 11.13.0)
- **PostgreSQL**: Local instance, Supabase, Neon, or Prisma Postgres

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Update `DATABASE_URL` with your PostgreSQL connection string:
```env
DATABASE_URL="postgres://user:password@host:5432/postgres?sslmode=require"
PORT=3000
```
> **Security Note**: Real database credentials are strictly server-side and never exposed to browser bundles or client code. `.env.local` is ignored in `.gitignore`.

### Step 3: Run Database Setup & Seeding
Initialize the database tables and seed 1 batch with 8 picking lines:
```bash
npm run db:setup
```
To reset picking progress back to initial demo state at any time:
```bash
npm run db:seed
```

### Step 4: Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000). For optimal warehouse handheld simulation, toggle Chrome DevTools device mode to **360 × 800 px** (e.g. Samsung Galaxy S20 / Pixel 5).

### Step 5: Run Automated Tests
```bash
# Run end-to-end tests in headless mobile viewport (360px)
npm run test

# Run tests with interactive UI
npm run test:ui
```

---

## 2. Architecture & Implementation Decisions

### A. Minimalist, Distraction-Free Warehouse UX
- **Zero-Friction Workflow**: One incomplete picking line is displayed at a time with large, prominent typography for the assigned warehouse shelf/location (e.g., `A-01-01`), product name, and picked/required quantity.
- **Hardware Scanner & Keyboard Integration**: A single, auto-refocusing input captures input from handheld laser/camera barcode scanners (which type characters and emit an `Enter` keystroke) as well as manual keyboard typing. Input is trimmed of accidental leading/trailing spaces.
- **Auto-Advancement**: Reaching the required quantity automatically advances to the next incomplete line without scrolling or requiring a "Next" button click.
- **Completion Guard**: When all 8 lines are fulfilled, a dedicated "Batch Complete" view renders, disabling further scanning and locking the batch.

### B. Relational Data Model (`PostgreSQL`)
The application uses a relational model with strict database-level constraints:
- `batches`: Holds batch number (`BATCH-2026-001`), fulfillment status (`in_progress`, `completed`), and timestamps.
- `locations`: Shelf/bin coordinates (`A-01-01`, `B-09-02`, `OVERFLOW-A1`) categorized by zone.
- `products`: Product catalog with SKU, name, and unique 13-digit EAN barcode (`products.ean UNIQUE`).
- `product_locations`: Multi-location inventory stock (`product_id, location_id, stock_quantity`). Allows querying alternate stocked locations when a product is unavailable at its primary location.
- `batch_lines`: Ordered batch lines (`line_number`) with `product_id`, `assigned_location_id`, `required_qty`, `picked_qty`, and `is_completed`.
  - **Constraint**: `CHECK (picked_qty >= 0 AND picked_qty <= required_qty)` guarantees at the engine level that picked quantities can never exceed the required quantity.

### C. Concurrency & Double-Scan Prevention
In `src/lib/picking-service.ts`, `processScan()` uses an atomic PostgreSQL transaction with row-level locking:
```sql
SELECT ... FROM batch_lines WHERE id = $1 FOR UPDATE OF batch_lines
```
This prevents duplicate submissions from rapid Enter key presses or network retries from incrementing counts twice.

### D. "Not Found" Shelf Reassignment
If an item is depleted or missing at the assigned location, clicking the **"Not found"** button opens a bottom sheet listing only alternative locations that currently have positive stock (`stock_quantity > 0`). Selecting an alternate location atomically updates `batch_lines.assigned_location_id` in PostgreSQL and immediately refocuses the scanner input.

---

## 3. Seeded Sample Data (8 Picking Lines)

| Line # | Product Name | EAN Barcode | Assigned Location | Required | Alternate Locations With Stock |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | Pro Wireless Mechanical Keyboard | `8712345678901` | `A-01-01` | 2 | `OVERFLOW-A1` (24 units) |
| **2** | Ergonomic Vertical Optical Mouse | `8712345678918` | `A-01-02` | 1 | `B-09-02` (8 units) |
| **3** | Heavy-Duty Braided USB-C Cable 2M | `8712345678925` | `A-02-01` | 3 | `OVERFLOW-B2` (100 units) |
| **4** | Ultra-Clear 4K DisplayPort Cable | `8712345678932` | `B-03-01` | 1 | *(Single location)* |
| **5** | Noise-Cancelling Over-Ear Headset | `8712345678949` | `B-03-02` | 2 | `C-05-03` (15 units) |
| **6** | MagSafe Magnetic Phone Mount | `8712345678956` | `B-04-01` | 1 | *(Single location)* |
| **7** | 65W GaN Dual-Port Fast Charger | `8712345678963` | `C-01-01` | 2 | `OVERFLOW-A1` (25 units) |
| **8** | Anti-Static Microfiber Cleaning Kit | `8712345678970` | `C-02-01` | 1 | *(Single location)* |

---

## 4. Automated Testing Suite

The project includes both **API/database integration tests** and **browser end-to-end tests** executed in a 360px mobile viewport (`Pixel 5` profile):

```bash
# Run all automated tests (10 tests)
npm test

# Run Playwright mobile browser E2E tests (4 tests)
npm run test:e2e

# Run PostgreSQL API integration tests (6 tests)
npm run test:integration
```

### Verified Test Cases (10 / 10 Passing):

#### A. Mobile Browser End-to-End Tests (`tests/scan-to-pick.spec.ts`)
1. **Single Scan Increment**: Scans correct EAN (`8712345678901`) on Line 1; verifies count increases from `0 / 2` to `1 / 2`, input clears, and focus returns to scanner.
2. **Wrong Barcode Rejection**: Scans an invalid barcode (`9999999999999`); verifies count remains `0 / 2` and a clear red error alert is displayed.
3. **Auto-Advance & PostgreSQL Persistence**: Completes Line 1; verifies immediate auto-advance to Line 2 (`Ergonomic Vertical Optical Mouse` at `A-01-02`). Refreshes the page; verifies picking progress is fully preserved from PostgreSQL.
4. **Alternative Location Reassignment ("Not Found")**: Opens the "Not found" modal; selects `OVERFLOW-A1`; verifies assigned shelf updates to `OVERFLOW-A1` and scanner input refocuses immediately.

#### B. Backend API & Concurrency Integration Tests (`tests/api-integration.spec.ts`)
5. **Initial Batch Retrieval**: `GET /api/batch` returns batch `BATCH-2026-001`, all 8 lines, and current incomplete line #1.
6. **Persistent Scan Increment**: `POST /api/scan` atomically increments picked count in PostgreSQL.
7. **Wrong Barcode Rejection**: `POST /api/scan` with mismatched EAN returns HTTP 400 (`WRONG_EAN`) and leaves count unchanged.
8. **Line Completion Advancement**: Submitting full required quantity marks line completed and returns next incomplete line.
9. **Stocked Locations Lookup**: `GET /api/locations` returns only locations with available inventory (`stock_quantity > 0`).
10. **Assigned Shelf Persistence**: `POST /api/locations` updates the line's assigned location in PostgreSQL.

---

## 5. Transparent AI Tool Usage Disclosure

In compliance with interview assessment instructions:
- **Pair Programming Agent**: Used Antigravity (Google DeepMind agentic coding assistant) in high-reasoning mode.
- **Scaffolding & Architecture**: AI assisted in configuring the Next.js App Router structure, TypeScript interfaces, and Tailwind CSS design tokens.
- **SQL & Concurrency Logic**: AI drafted the PostgreSQL schema check constraints (`CHECK (picked_qty <= required_qty)`) and transaction locking logic (`SELECT ... FOR UPDATE`).
- **Test Generation**: Playwright test suites and assertions were co-authored with AI to cover edge cases, cloud database network timeouts, and mobile viewport requirements.
- **Engineering Review**: All generated code was manually inspected, type-checked (`tsc --noEmit`), linted (`next lint`), and validated through end-to-end test execution against real database endpoints.

---

## 6. What I Would Build Next (Production Roadmap)

If this were developed into a full production warehouse management system (WMS):
1. **Pick Path Optimization**: Sort batch lines dynamically using a Traveling Salesperson Problem (TSP) heuristic based on warehouse aisle/bay geometry to minimize physical walking distance.
2. **Offline-First Resilience**: Implement an offline Service Worker and IndexedDB queue with background sync so warehouse pickers in dead zones can continue scanning without interruption.
3. **Multi-Item Batch / Wave Picking**: Support multi-tote picking carts where pickers collect items for multiple orders simultaneously into color-coded tote bins.
4. **Lot & Expiration Tracking**: Add barcode scanning validation for serial numbers, batch lot codes, and FEFO (First-Expired, First-Out) perishable validation.
5. **Role-Based Authentication & Device Fleet Telemetry**: Integrate warehouse employee badge scanning (SSO), scanner battery/hardware health monitoring, and pick rate telemetry (units picked per hour).
