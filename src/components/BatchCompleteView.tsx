"use client";

import React from "react";
import { CheckCircle, RotateCcw, PackageCheck, Sparkles } from "lucide-react";

interface BatchCompleteViewProps {
  batchNumber: string;
  totalLines: number;
  onReset: () => Promise<void>;
  isResetting?: boolean;
}

export function BatchCompleteView({
  batchNumber,
  totalLines,
  onReset,
  isResetting = false,
}: BatchCompleteViewProps) {
  return (
    <div
      id="batch-complete-view"
      className="flex flex-col items-center justify-center rounded-3xl border-2 border-emerald-500/40 bg-slate-900/95 p-6 text-center shadow-2xl backdrop-blur animate-in zoom-in-95 duration-300"
    >
      <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
        <CheckCircle className="h-12 w-12" />
        <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-amber-400 animate-bounce" />
      </div>

      <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/30">
        All Items Picked
      </span>

      <h2 className="mt-3 text-2xl font-black text-white">
        Batch Complete!
      </h2>

      <p className="mt-1 text-sm text-slate-400">
        All <strong className="text-white">{totalLines} lines</strong> for batch{" "}
        <span className="font-mono text-amber-400">{batchNumber}</span> have been successfully fulfilled.
      </p>

      <div className="mt-6 flex w-full flex-col gap-2 rounded-2xl bg-slate-950/80 p-4 border border-slate-800 text-left text-xs">
        <div className="flex justify-between text-slate-400">
          <span>Batch Status:</span>
          <span className="font-bold text-emerald-400 uppercase">Fulfilled</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Lines Processed:</span>
          <span className="font-bold text-white">{totalLines} / {totalLines}</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Scanner Mode:</span>
          <span className="text-slate-400 font-medium">Locked (Inactive)</span>
        </div>
      </div>

      <button
        id="reset-batch-btn"
        type="button"
        onClick={onReset}
        disabled={isResetting}
        className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 font-bold text-white shadow-lg transition-all hover:bg-blue-500 active:scale-95 disabled:pointer-events-none disabled:opacity-50"
      >
        <RotateCcw className={`h-5 w-5 ${isResetting ? "animate-spin" : ""}`} />
        <span>{isResetting ? "Resetting Demo..." : "Restart Demo Batch"}</span>
      </button>

      <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
        <PackageCheck className="h-4 w-4" />
        <span>Ready for pallet staging and packing</span>
      </div>
    </div>
  );
}
