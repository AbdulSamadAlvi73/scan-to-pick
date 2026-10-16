"use client";

import React from "react";
import { PickingLine } from "@/lib/types";
import { MapPin, SearchX, CheckCircle2 } from "lucide-react";

interface ActiveLineCardProps {
  line: PickingLine;
  onOpenNotFound: () => void;
  disabled?: boolean;
}

export function ActiveLineCard({
  line,
  onOpenNotFound,
  disabled = false,
}: ActiveLineCardProps) {
  const percentComplete = Math.min(
    100,
    Math.round((line.pickedQty / line.requiredQty) * 100)
  );

  return (
    <div
      id="active-line-card"
      className="flex flex-col gap-4 rounded-2xl border-2 border-slate-700 bg-slate-900/95 p-4 shadow-xl backdrop-blur"
    >
      {/* 1. Prominent Warehouse Location Badge */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
            <MapPin className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Location (Zone {line.locationZone})
            </span>
            <div
              id="active-location-code"
              className="text-2xl font-black tracking-wider text-amber-400"
            >
              {line.assignedLocationCode}
            </div>
          </div>
        </div>

        {/* Not Found Button */}
        <button
          id="not-found-btn"
          type="button"
          onClick={onOpenNotFound}
          disabled={disabled}
          className="flex h-10 items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 transition-all hover:border-amber-500/50 hover:bg-slate-700 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
          title="Product not at this shelf? Check other stocked locations"
        >
          <SearchX className="h-4 w-4 text-amber-400" />
          <span>Not found</span>
        </button>
      </div>

      {/* 2. Product Information */}
      <div className="flex flex-col gap-1">
        <span className="text-xs font-mono text-slate-400">
          SKU: {line.productSku}
        </span>
        <h2
          id="active-product-name"
          className="text-lg font-bold leading-snug text-white"
        >
          {line.productName}
        </h2>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Expected EAN:</span>
          <code id="active-product-ean" className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-slate-200">
            {line.productEan}
          </code>
        </div>
      </div>

      {/* 3. High-Contrast Pick Quantity Counter */}
      <div className="mt-1 rounded-xl bg-slate-950/80 p-3.5 border border-slate-800/80">
        <div className="flex items-end justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Quantity Picked
          </span>
          <div
            id="active-qty-counter"
            className="flex items-baseline gap-1 text-3xl font-black text-white"
          >
            <span id="picked-qty" className="text-emerald-400">
              {line.pickedQty}
            </span>
            <span className="text-slate-500 text-2xl font-normal">/</span>
            <span id="required-qty" className="text-slate-300">
              {line.requiredQty}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            id="qty-progress-bar"
            className="h-full bg-emerald-500 transition-all duration-300 ease-out"
            style={{ width: `${percentComplete}%` }}
          />
        </div>

        {line.pickedQty > 0 && (
          <div className="mt-2 flex items-center justify-end gap-1 text-[11px] font-medium text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>
              {line.pickedQty === line.requiredQty
                ? "Line completed"
                : `${line.requiredQty - line.pickedQty} remaining`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
