"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BarcodeSvg } from "@/components/BarcodeSvg";
import { QrCodeSvg } from "@/components/QrCodeSvg";
import {
  Barcode,
  ArrowLeft,
  Copy,
  Check,
  Smartphone,
  AlertTriangle,
  QrCode,
  Layers,
} from "lucide-react";

interface ProductBarcodeItem {
  line: number;
  name: string;
  sku: string;
  ean: string;
  location: string;
  qty: number;
  altLocation?: string;
}

const PRODUCTS: ProductBarcodeItem[] = [
  {
    line: 1,
    name: "Pro Wireless Mechanical Keyboard",
    sku: "TECH-KB-01",
    ean: "8712345678901",
    location: "A-01-01",
    qty: 2,
    altLocation: "OVERFLOW-A1 (24 units)",
  },
  {
    line: 2,
    name: "Ergonomic Vertical Optical Mouse",
    sku: "TECH-MS-02",
    ean: "8712345678918",
    location: "A-01-02",
    qty: 1,
    altLocation: "B-09-02 (8 units)",
  },
  {
    line: 3,
    name: "Heavy-Duty Braided USB-C Cable 2M",
    sku: "CBL-USBC-03",
    ean: "8712345678925",
    location: "A-02-01",
    qty: 3,
    altLocation: "OVERFLOW-B2 (100 units)",
  },
  {
    line: 4,
    name: "Ultra-Clear 4K DisplayPort Cable",
    sku: "CBL-DP-04",
    ean: "8712345678932",
    location: "B-03-01",
    qty: 1,
  },
  {
    line: 5,
    name: "Noise-Cancelling Over-Ear Headset",
    sku: "AUD-HSET-05",
    ean: "8712345678949",
    location: "B-03-02",
    qty: 2,
    altLocation: "C-05-03 (15 units)",
  },
  {
    line: 6,
    name: "MagSafe Magnetic Phone Mount",
    sku: "ACC-MNT-06",
    ean: "8712345678956",
    location: "B-04-01",
    qty: 1,
  },
  {
    line: 7,
    name: "65W GaN Dual-Port Fast Charger",
    sku: "PWR-CHG-07",
    ean: "8712345678963",
    location: "C-01-01",
    qty: 2,
    altLocation: "OVERFLOW-A1 (25 units)",
  },
  {
    line: 8,
    name: "Anti-Static Microfiber Cleaning Kit",
    sku: "CLN-KIT-08",
    ean: "8712345678970",
    location: "C-02-01",
    qty: 1,
  },
];

export default function BarcodeSheetPage() {
  const [copiedEan, setCopiedEan] = useState<string | null>(null);

  const handleCopy = (ean: string) => {
    navigator.clipboard.writeText(ean);
    setCopiedEan(ean);
    setTimeout(() => setCopiedEan(null), 2000);
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-4xl">
        {/* Navigation & Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              title="Return to Scan-to-Pick screen"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[11px] font-bold text-blue-400 border border-blue-500/30">
                  Demo Companion Sheet
                </span>
                <span className="text-xs text-slate-400">Batch: BATCH-2026-001</span>
              </div>
              <h1 className="text-2xl font-black text-white">
                Warehouse Barcode Test Sheet
              </h1>
            </div>
          </div>

          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-500 transition-colors shadow-lg"
          >
            <Barcode className="h-4 w-4" />
            <span>Open Scan Screen</span>
          </Link>
        </div>

        {/* Mobile / iPhone Testing Instructions */}
        <div className="mb-8 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
            <Smartphone className="h-5 w-5" />
            <span>How to Record on iPhone while Scanning from Laptop Screen</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800/80">
              <strong className="text-white block mb-1">1. Keep this page open on Laptop</strong>
              Leave this <code className="text-amber-400">/barcodes</code> page open on your computer screen so the barcodes are clearly visible.
            </div>
            <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800/80">
              <strong className="text-white block mb-1">2. Open App on your iPhone</strong>
              Connect your iPhone to the same Wi-Fi. Open Safari and navigate to:
              <br />
              <code className="text-emerald-400 font-bold mt-1 inline-block">http://&lt;your-laptop-ip&gt;:3000</code>
            </div>
            <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800/80">
              <strong className="text-white block mb-1">3. Point Scanner &amp; Record</strong>
              Start iOS Screen Recording. Scan barcodes off your laptop screen or type them to test the full live flow!
            </div>
          </div>
        </div>

        {/* Section: Valid Product Barcodes */}
        <div className="mb-8">
          <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
            <QrCode className="h-5 w-5 text-emerald-400" />
            <span>Valid Product Barcodes (Lines 1 to 8)</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRODUCTS.map((item) => (
              <div
                key={item.line}
                className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-md transition-all hover:border-slate-700"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="rounded-md bg-slate-800 px-2 py-0.5 text-xs font-bold text-amber-400 border border-slate-700">
                      Line #{item.line} &bull; Qty: {item.qty}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      Shelf: <strong className="text-white">{item.location}</strong>
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-white leading-tight">
                    {item.name}
                  </h3>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                    <span>SKU: {item.sku}</span>
                    {item.altLocation && (
                      <span className="text-[11px] text-emerald-400">
                        Alt: {item.altLocation}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-slate-800/80">
                  <BarcodeSvg code={item.ean} />
                  <QrCodeSvg value={item.ean} size={88} />
                </div>
                <div className="mt-2 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => handleCopy(item.ean)}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  >
                    {copiedEan === item.ean ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy {item.ean}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section: Wrong / Invalid Barcode for Negative Testing */}
        <div className="rounded-2xl border-2 border-red-500/40 bg-red-950/20 p-5">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm mb-1">
            <AlertTriangle className="h-5 w-5" />
            <span>Negative Test Case: Wrong Barcode (Causes Red Error)</span>
          </div>
          <p className="text-xs text-slate-300 mb-4">
            Scan or enter this barcode while on Line 1. It does not match the expected product, verifying that the system safely rejects mismatched barcodes without changing picked quantity.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl bg-slate-900 p-4 border border-red-900/50">
            <div>
              <span className="text-xs uppercase font-bold text-red-400 tracking-wider">
                Mismatched Barcode
              </span>
              <h4 className="text-base font-bold text-white">
                Unregistered / Wrong Item Barcode
              </h4>
              <span className="text-xs font-mono text-slate-400">
                EAN: 8712345678994
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <BarcodeSvg code="8712345678994" />
              <QrCodeSvg value="8712345678994" size={88} />
              <button
                type="button"
                onClick={() => handleCopy("8712345678994")}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                {copiedEan === "8712345678994" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy 8712345678994</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
