"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Database,
  Table,
  RotateCcw,
  ArrowLeft,
  Barcode,
  Layers,
  MapPin,
  Boxes,
  KeyRound,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

type TableName =
  | "batch_lines"
  | "product_locations"
  | "products"
  | "locations"
  | "batches";

export default function DatabaseViewerPage() {
  const [activeTab, setActiveTab] = useState<TableName>("batch_lines");
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTables = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/database");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load database tables.");
      }
      setData(json.tables);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to database."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const tablesMeta: Record<
    TableName,
    { label: string; icon: any; count: number; description: string }
  > = {
    batch_lines: {
      label: "batch_lines",
      icon: Layers,
      count: data?.batch_lines?.length || 0,
      description:
        "Fulfillment lines linking batches, products, and locations with required vs picked quantities.",
    },
    product_locations: {
      label: "product_locations",
      icon: Boxes,
      count: data?.product_locations?.length || 0,
      description:
        "Warehouse inventory ledger tracking stock across primary and alternative shelves.",
    },
    products: {
      label: "products",
      icon: Barcode,
      count: data?.products?.length || 0,
      description: "Product catalog with unique SKUs and 13-digit EAN barcodes.",
    },
    locations: {
      label: "locations",
      icon: MapPin,
      count: data?.locations?.length || 0,
      description:
        "Warehouse shelf layout codes (e.g. A-01-01, OVERFLOW-A1) partitioned by zones.",
    },
    batches: {
      label: "batches",
      icon: Table,
      count: data?.batches?.length || 0,
      description: "Order picking batches and their fulfillment statuses.",
    },
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl">
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
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 border border-emerald-500/30">
                  <Database className="h-3.5 w-3.5" />
                  Live PostgreSQL GUI
                </span>
                <span className="text-xs text-slate-400">
                  phpMyAdmin-style Table Viewer
                </span>
              </div>
              <h1 className="text-2xl font-black text-white">
                Database Table &amp; Relational Explorer
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchTables}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-3.5 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-all disabled:opacity-50"
            >
              <RotateCcw
                className={`h-4 w-4 ${isLoading ? "animate-spin text-amber-400" : ""}`}
              />
              <span>Refresh Tables</span>
            </button>

            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-lg"
            >
              <Barcode className="h-4 w-4" />
              <span>Open Scanner</span>
            </Link>
          </div>
        </div>

        {/* Relational Schema Architecture Banner */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-2">
            <KeyRound className="h-4 w-4" />
            <span>Database Foreign Key Relationships</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800">
              <strong className="text-white block font-mono text-xs">
                batches &rarr; batch_lines
              </strong>
              <span className="text-[11px] text-slate-400">
                1 Batch contains 8 Lines (FK: <code className="text-amber-400">batch_lines.batch_id</code>).
              </span>
            </div>
            <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800">
              <strong className="text-white block font-mono text-xs">
                products &rarr; batch_lines
              </strong>
              <span className="text-[11px] text-slate-400">
                Each line references an item by EAN barcode (FK: <code className="text-amber-400">batch_lines.product_id</code>).
              </span>
            </div>
            <div className="rounded-xl bg-slate-950/70 p-3 border border-slate-800">
              <strong className="text-white block font-mono text-xs">
                locations &rarr; product_locations
              </strong>
              <span className="text-[11px] text-slate-400">
                Multi-location stock ledger tracking shelves (FK: <code className="text-amber-400">location_id</code>).
              </span>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border-2 border-red-500 bg-red-950/80 p-4 text-red-200">
            <AlertCircle className="h-6 w-6 text-red-400 shrink-0" />
            <div>
              <strong className="font-bold">Database Error</strong>
              <p className="text-xs">{error}</p>
            </div>
          </div>
        )}

        {/* Table Selection Tabs */}
        <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {(Object.keys(tablesMeta) as TableName[]).map((tbl) => {
            const meta = tablesMeta[tbl];
            const Icon = meta.icon;
            const isActive = activeTab === tbl;
            return (
              <button
                key={tbl}
                type="button"
                onClick={() => setActiveTab(tbl)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                  isActive
                    ? "bg-amber-500 text-slate-950 shadow-md"
                    : "bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="font-mono">{tbl}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    isActive
                      ? "bg-slate-950/30 text-slate-950"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {meta.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Table Description */}
        <div className="mb-3 flex items-center justify-between text-xs text-slate-400 px-1">
          <span>{tablesMeta[activeTab].description}</span>
          <span className="font-mono text-slate-500">
            Showing {data?.[activeTab]?.length || 0} rows from PostgreSQL
          </span>
        </div>

        {/* Table Viewport */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur">
          {isLoading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              <span className="mt-3 text-xs font-semibold">
                Reading table data from PostgreSQL...
              </span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    {data?.[activeTab]?.[0] ? (
                      Object.keys(data[activeTab][0]).map((col) => (
                        <th key={col} className="px-4 py-3 font-mono font-bold">
                          {col === "id" ? (
                            <span className="text-amber-400 flex items-center gap-1">
                              <KeyRound className="h-3 w-3" />
                              {col}
                            </span>
                          ) : col.endsWith("_id") ? (
                            <span className="text-blue-400">{col}</span>
                          ) : (
                            col
                          )}
                        </th>
                      ))
                    ) : (
                      <th className="px-4 py-3">No Data</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {data?.[activeTab]?.map((row: any, i: number) => (
                    <tr
                      key={row.id || i}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {Object.entries(row).map(([key, val]: [string, any]) => {
                        let displayVal = String(val);
                        let isBadge = false;
                        let badgeClass = "";

                        if (typeof val === "boolean") {
                          isBadge = true;
                          badgeClass = val
                            ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                            : "bg-amber-950 text-amber-400 border-amber-800";
                        } else if (key === "status") {
                          isBadge = true;
                          badgeClass =
                            val === "completed"
                              ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                              : "bg-blue-950 text-blue-400 border-blue-800";
                        } else if (key === "location_code" || key === "code") {
                          isBadge = true;
                          badgeClass = "bg-amber-500/10 text-amber-300 border-amber-500/30";
                        }

                        return (
                          <td key={key} className="px-4 py-3 whitespace-nowrap">
                            {isBadge ? (
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold border ${badgeClass}`}
                              >
                                {displayVal}
                              </span>
                            ) : key === "id" ? (
                              <span className="font-bold text-white">
                                {displayVal}
                              </span>
                            ) : (
                              <span className="text-slate-300">
                                {displayVal}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
