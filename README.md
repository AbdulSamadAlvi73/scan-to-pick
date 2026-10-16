# Scan-to-Pick Mobile Warehouse Application

A high-efficiency, mobile-first scan-to-pick web application designed for warehouse order fulfillment with handheld barcode scanners and mobile devices.

Built as a practical technical assessment for the **Founding Engineer** position at **Loopin (SMC-Pvt) Limited** for its client **SYNC FULFILLMENT**.

- **Repository**: [https://github.com/AbdulSamadAlvi73/scan-to-pick](https://github.com/AbdulSamadAlvi73/scan-to-pick)
- **Author**: Abdul Samad Alvi (`AbdulSamadAlvi73`)
- **Technology Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, PostgreSQL (`pg`), Playwright.

---

## 1. Project Purpose & Features Implemented

Warehouse order pickers operate in fast-paced environments where every second and every tap matters. Handheld barcode scanners (and modern smartphones with barcode sleds) emit a burst of keystrokes followed by an `Enter` key. This application eliminates manual navigation, scrolling, and clicking, offering a zero-friction scanning experience:

### Key Features
1. **Single-Line Focused UX**: The interface displays exactly one active, incomplete picking line at a time. The warehouse location shelf code (e.g., `A-01-01`), product name, SKU, and pick quantity (`picked / required`) are rendered with high-contrast, large typography visible at arm's length.
2. **Always-Ready Scan Input**: A dedicated input automatically gains and retains focus on page load, after every successful scan, after error alerts, and when modal drawers close. An unobtrusive background listener ensures accidental clicks outside form controls return focus to the scanner.
3. **Hardware Scanner & Keyboard Support**: Seamlessly captures hardware barcode scanner inputs (which enter numbers and send an `Enter` keystroke) as well as manual keyboard typing followed by `Enter`. Surrounding whitespace is automatically trimmed; empty scans do nothing.
4. **Duplicate Scan & Rapid-Fire Protection**: An internal submission guard prevents duplicate event handling from rapid hardware scanner trigger pulls or accidental double-Enters.
5. **Atomic Pick Increment**: Scanning the correct EAN barcode increments the picked quantity by exactly 1 in PostgreSQL and visibly updates the progress counter and progress bar.
6. **Automatic Line Advancement**: When the required quantity for a line is reached, the application automatically transitions to the next incomplete line without requiring the picker to click "Next" or touch the screen.
7. **Wrong Barcode Rejection**: Scanning an incorrect EAN triggers a prominent, high-contrast red error alert (`Wrong barcode! Scanned "..." expected "..."`) along with an audio buzz. The picked count remains unchanged in both the database and UI, and the scanner is immediately cleared and refocused for retry.
8. **"Not Found" Alternative Location Reassignment**: If a shelf is empty or inventory is damaged, tapping the **"Not found"** button opens a bottom sheet listing all alternative warehouse locations that currently have available stock (`stock_quantity > 0`). Selecting an alternative shelf atomically reassigns the line in PostgreSQL and updates the visible location code.
9. **Batch Completion State**: Once all 8 lines are completely picked, a fulfillment summary view renders, locking the scanner and preventing further scans. A "Restart Demo Batch" button allows resetting the demo.
10. **Persistent PostgreSQL State Across Page Refreshes**: State is persisted directly in PostgreSQL (`pg` pool). Refreshing the browser or opening the app on a mobile device immediately loads the exact current progress from the database. No fake `localStorage` or temporary in-memory arrays.
11. **Mobile-First 360px Viewport**: Responsive design tailored for compact 360px smartphone screens without horizontal scrollbars or layout breakage.
12. **Live Scannable Barcode & QR Companion Sheet (`/barcodes`)**: Includes an authentic barcode sheet with both 1D Barcodes (via `JsBarcode`) and 2D QR Codes for each item, plus an integrated mobile camera scanner modal with native iOS/Android hardware barcode acceleration (`BarcodeDetector`).

---

## 2. Prerequisites & Windows Setup Instructions

### Prerequisites
- **Operating System**: Windows 10/11, macOS, or Linux.
- **Node.js**: v18.17+ or v20+ LTS (Tested and verified on Node.js `v24.16.0`).
- **Package Manager**: npm (Tested on npm `v11.13.0`).
- **PostgreSQL Database**: Any PostgreSQL 14+ instance (Local PostgreSQL, Supabase, Neon, or Prisma Postgres).

### Setup Commands (Windows PowerShell)

#### Step 1: Clone the Repository
```powershell
git clone https://github.com/AbdulSamadAlvi73/scan-to-pick.git
cd scan-to-pick
```

#### Step 2: Install Dependencies
```powershell
npm install
```

#### Step 3: Configure Environment Variables
Copy the template `.env.example` to `.env.local`:
```powershell
Copy-Item .env.example .env.local
```

Open `.env.local` in your editor and enter your PostgreSQL connection string:
```env
DATABASE_URL="postgres://username:password@hostname:5432/database_name?sslmode=require"
PORT=3000
```
> **Security Note**: Real database credentials belong only in `.env.local`, which is strictly ignored in `.gitignore`. Never commit credentials to version control.

#### Step 4: Initialize & Seed the Database
Execute the database schema setup script and seed the initial batch:
```powershell
# Create tables and check constraints:
npm run db:setup

# Seed batch BATCH-2026-001 (8 lines with alternative stocked locations):
npm run db:seed
```

#### Step 5: Start the Development Server
```powershell
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser. For mobile emulation, open Chrome DevTools (Press `F12` or `Ctrl+Shift+I`), click the Device Toolbar icon (`Ctrl+Shift+M`), and select **Pixel 5** or set viewport dimensions to **360 × 800 px**.

To open the scannable barcode test sheet on your laptop screen, visit:
**[http://localhost:3000/barcodes](http://localhost:3000/barcodes)**.

---

## 3. Verification & Quality Assurance Commands

Every command listed below has been executed and confirmed clean with zero errors:

| Task | Command | Description |
| :--- | :--- | :--- |
| **Linting** | `npm run lint` | Runs Next.js ESLint rules (0 errors, 0 warnings). |
| **Type Check** | `npm run type-check` | Runs TypeScript compiler check (`tsc --noEmit`). |
| **Production Build** | `npm run build` | Compiles optimized Next.js production bundle. |
| **Production Server** | `npm start` | Starts Next.js production server on port 3000. |
| **All Automated Tests** | `npm test` | Runs all 10 Playwright E2E and API integration tests. |
| **E2E Browser Tests** | `npm run test:e2e` | Runs 4 mobile browser tests in a 360px viewport. |
| **API Integration Tests**| `npm run test:integration` | Runs 6 backend PostgreSQL database integration tests. |
| **Interactive Test UI** | `npm run test:ui` | Launches Playwright UI runner with time-travel trace. |

---

## 4. Architecture & Key Technical Decisions

### A. Next.js 14 App Router + Server-Only DB Layer
Next.js App Router enables colocation of frontend client components and secure server-side API routes.
- The PostgreSQL database client (`src/lib/db.ts`) contains an explicit runtime safety guard (`if (typeof window !== "undefined") throw ...`), guaranteeing that database connection credentials can never be leaked to the browser.
- API endpoints (`/api/batch`, `/api/scan`, `/api/locations`) use `export const dynamic = "force-dynamic"` to bypass Next.js static route caching and guarantee real-time database reads.

### B. Relational Schema & Database-Level Check Constraints
The schema (`db/schema.sql`) enforces integrity at the relational database level:
- `batches`: Holds batch identifier (`BATCH-2026-001`), fulfillment status, and timestamps.
- `locations`: Shelf codes (`A-01-01`, `B-09-02`, `OVERFLOW-A1`) and zone partitions.
- `products`: Product catalog with unique 13-digit EAN barcodes (`products.ean UNIQUE`).
- `product_locations`: Multi-location stock ledger (`product_id, location_id, stock_quantity`).
- `batch_lines`: Ordered lines with required vs picked quantities.
  - **Check Constraint**: `CONSTRAINT chk_picked_lte_required CHECK (picked_qty <= required_qty)` guarantees at the SQL level that a picker cannot over-pick items.

### C. Atomic Transactions & Row-Level Locking
Barcode scanning involves fast, concurrent network requests. In `src/lib/picking-service.ts`, `processScan()` uses an atomic PostgreSQL transaction with row-level locking:
```sql
SELECT ... FROM batch_lines WHERE id = $1 AND batch_id = $2 FOR UPDATE OF batch_lines
```
This locks the specific line record during the check and increment, eliminating race conditions and duplicate increments even if two requests arrive concurrently.

### D. Cloud Database Connection Pool Resilience
Connecting to remote cloud PostgreSQL instances (e.g., Supabase, Prisma Postgres, Neon) over public networks can occasionally encounter cold starts or idle connection drops. The connection pool in `db.ts` is configured with:
- `connectionTimeoutMillis: 20000` (20 seconds) to prevent premature timeouts during cloud connection establishment.
- TCP `keepAlive: true` to prevent intermediate firewalls and serverless gateways from severing idle sockets.
- Automatic connection retry in `getClient()` and `query()` to transparently handle dropped idle sockets.

---

## 5. Seeded Batch Data (8 Picking Lines)

| Line # | Product Name | SKU | Expected EAN | Primary Shelf | Qty | Secondary Stocked Locations |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- |
| **1** | Pro Wireless Mechanical Keyboard | `TECH-KB-01` | `8712345678901` | `A-01-01` | 2 | `OVERFLOW-A1` (24 units) |
| **2** | Ergonomic Vertical Optical Mouse | `TECH-MS-02` | `8712345678918` | `A-01-02` | 1 | `B-09-02` (8 units) |
| **3** | Heavy-Duty Braided USB-C Cable 2M | `CBL-USBC-03` | `8712345678925` | `A-02-01` | 3 | `OVERFLOW-B2` (100 units) |
| **4** | Ultra-Clear 4K DisplayPort Cable | `CBL-DP-04` | `8712345678932` | `B-03-01` | 1 | *(Primary only)* |
| **5** | Noise-Cancelling Over-Ear Headset | `AUD-HSET-05` | `8712345678949` | `B-03-02` | 2 | `C-05-03` (15 units) |
| **6** | MagSafe Magnetic Phone Mount | `ACC-MNT-06` | `8712345678956` | `B-04-01` | 1 | *(Primary only)* |
| **7** | 65W GaN Dual-Port Fast Charger | `PWR-CHG-07` | `8712345678963` | `C-01-01` | 2 | `OVERFLOW-A1` (25 units) |
| **8** | Anti-Static Microfiber Cleaning Kit | `CLN-KIT-08` | `8712345678970` | `C-02-01` | 1 | *(Primary only)* |

---

## 6. Transparent AI Tool Usage Disclosure

In adherence to the interview assessment guidelines:
- **AI Coding Partner**: Google DeepMind Antigravity agentic coding assistant in high-reasoning mode.
- **Scaffolding & Boilerplate**: AI assisted in scaffolding the initial Next.js App Router structure, TypeScript models, and Tailwind design tokens.
- **Database & Concurrency Logic**: Relational schema check constraints (`CHECK (picked_qty <= required_qty)`) and atomic transaction row-locking (`SELECT ... FOR UPDATE`) were co-architected with AI.
- **Automated Testing Suite**: AI assisted in writing Playwright E2E and API integration test suites covering mobile viewports, network cold starts, and error paths.
- **Engineering Audit & Review**: All generated code was inspected, type-checked, linted, tested against a real PostgreSQL database, and verified in real-time.

---

## 7. Known Limitations

1. **Single Demo Batch**: The current demonstration is configured for batch `BATCH-2026-001`. In a production warehouse environment, a picker assignment queue would dynamically route batches based on picker zone.
2. **Audio Autoplay Policies**: Audio chimes are generated via Web Audio API. Modern mobile browsers require an initial user tap before audio can play without restriction.
3. **External Database**: Requires an active PostgreSQL connection string in `.env.local` to run tests and live features.

---

## 8. What I Would Build Next (Production WMS Roadmap)

If transitioning this project into a full enterprise warehouse management system:
1. **Pick Path Optimization**: Implement a Traveling Salesperson Problem (TSP) heuristic algorithm based on 3D warehouse coordinate graphs (Aisle, Bay, Level) to sequence lines and minimize picker walking distance.
2. **Offline-First Synchronization**: Deploy an offline Service Worker with an IndexedDB mutation queue and background sync so pickers inside metal warehouse dead zones can continue scanning without downtime.
3. **Multi-Tote Cluster / Wave Picking**: Support multi-bin picking carts where a worker picks items for 6 to 12 distinct customer orders simultaneously into color-coded tote compartments.
4. **Lot, Batch & Serial Tracking**: Validate serialized items and enforce First-Expired, First-Out (FEFO) rules for perishable inventory.
5. **Scanner Sled Hardware Telemetry**: Integrate Bluetooth Low Energy (BLE) APIs for Zebra/Honeywell scanner battery monitoring, firmware health, and scan-rate performance metrics (units per hour).
