"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { BatchPickingState, PickingLine } from "@/lib/types";
import { ScannerInput } from "@/components/ScannerInput";
import { ActiveLineCard } from "@/components/ActiveLineCard";
import { AlternativeLocationsModal } from "@/components/AlternativeLocationsModal";
import { ScanFeedback, FeedbackState } from "@/components/ScanFeedback";
import { BatchCompleteView } from "@/components/BatchCompleteView";
import {
  Boxes,
  RotateCcw,
  AlertCircle,
  Loader2,
  Scan,
} from "lucide-react";

export default function ScanToPickPage() {
  const [batchState, setBatchState] = useState<BatchPickingState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const barcodeInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch initial batch state from PostgreSQL
  const loadBatchState = useCallback(async () => {
    try {
      setDbError(null);
      const res = await fetch("/api/batch");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to load picking batch.");
      }

      setBatchState(data.data);
    } catch (err: unknown) {
      console.error("loadBatchState error:", err);
      setDbError(
        err instanceof Error
          ? err.message
          : "Unable to connect to database. Ensure DATABASE_URL is set."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBatchState();
  }, [loadBatchState]);

  // Handle Barcode Scan
  const handleScan = async (scannedBarcode: string) => {
    if (!batchState || !batchState.currentLine || isScanning) {
      return;
    }

    const currentLine = batchState.currentLine;
    setIsScanning(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: batchState.batchId,
          lineId: currentLine.id,
          scannedEan: scannedBarcode,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        // Wrong barcode or validation error: do NOT advance, show prominent red error
        setFeedback({
          type: "error",
          message:
            result.message ||
            `Barcode "${scannedBarcode}" does not match ${currentLine.productName}.`,
        });
        return;
      }

      // Success: update persistent state
      const updatedLine: PickingLine = result.updatedLine;
      const nextLine: PickingLine | null = result.nextLine || null;
      const isBatchComplete: boolean = result.isBatchComplete || false;

      // Automatically advance to next incomplete line if current line is completed
      const newCurrentLine = updatedLine.isCompleted ? nextLine : updatedLine;

      // Update state locally in sync with PostgreSQL response
      setBatchState((prev) => {
        if (!prev) return prev;
        const newCompletedCount = updatedLine.isCompleted
          ? prev.completedLinesCount + 1
          : prev.completedLinesCount;

        return {
          ...prev,
          completedLinesCount: newCompletedCount,
          currentLine: newCurrentLine,
          isBatchComplete,
          batchStatus: isBatchComplete ? "completed" : "in_progress",
        };
      });

      setFeedback({
        type: "success",
        message: result.message || "Item picked successfully!",
      });
    } catch (err: unknown) {
      console.error("handleScan error:", err);
      setFeedback({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Network error saving barcode scan.",
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Handle Location Reassignment ("Not Found")
  const handleSelectLocation = async (newLocationId: number) => {
    if (!batchState || !batchState.currentLine) return;

    const lineId = batchState.currentLine.id;
    const res = await fetch("/api/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineId, newLocationId }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "Failed to update location.");
    }

    const updatedLine: PickingLine = data.updatedLine;

    // Update active line location code
    setBatchState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentLine: updatedLine,
      };
    });

    setFeedback({
      type: "info",
      message: `Location updated to ${updatedLine.assignedLocationCode}.`,
    });

    // Refocus scanner input
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 100);
  };

  // Reset Demo Batch
  const handleResetDemo = async () => {
    setIsResetting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to reset batch.");
      }
      setBatchState(data.data);
      setFeedback({
        type: "info",
        message: "Demo batch reset to Line #1 (0 picked).",
      });
    } catch (err: unknown) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to reset demo batch.",
      });
    } finally {
      setIsResetting(false);
      setTimeout(() => {
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }, 100);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-slate-950 px-3 py-4 text-slate-100 sm:py-6">
      {/* 360px Mobile-First Constraint */}
      <div className="flex w-full max-w-[390px] flex-col gap-3">
        {/* Top Header */}
        <header className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/80 px-3.5 py-2.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
              <Boxes className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xs font-black tracking-wider uppercase text-white">
                SYNC FULFILLMENT
              </h1>
              <span className="font-mono text-[11px] text-slate-400">
                {batchState?.batchNumber || "BATCH-2026-001"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {batchState && (
              <span
                id="batch-progress-indicator"
                className="rounded-full bg-slate-800 px-2.5 py-1 text-xs font-bold text-slate-300 border border-slate-700"
              >
                Line {batchState.isBatchComplete ? batchState.totalLines : (batchState.currentLine?.lineNumber || 1)} of {batchState.totalLines}
              </span>
            )}

            <button
              id="header-reset-btn"
              type="button"
              onClick={handleResetDemo}
              disabled={isResetting || isLoading}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-40"
              title="Reset demo batch"
              aria-label="Reset demo batch"
            >
              <RotateCcw className={`h-4 w-4 ${isResetting ? "animate-spin" : ""}`} />
            </button>
          </div>
        </header>

        {/* Global Database Error Display */}
        {dbError && (
          <div
            id="db-error-alert"
            className="flex flex-col gap-2 rounded-2xl border-2 border-red-500 bg-red-950/90 p-4 text-red-200 shadow-xl"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span>Database Connection Error</span>
            </div>
            <p className="text-xs leading-relaxed text-red-200/90">{dbError}</p>
            <button
              type="button"
              onClick={() => {
                setIsLoading(true);
                loadBatchState();
              }}
              className="mt-1 self-start rounded-lg bg-red-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !dbError && (
          <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/50 p-6 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-amber-400" />
            <span className="mt-3 text-sm font-semibold text-slate-300">
              Connecting to PostgreSQL...
            </span>
            <span className="mt-1 text-xs text-slate-500">
              Loading active batch lines
            </span>
          </div>
        )}

        {/* Loaded State: Interactive Picking Screen */}
        {!isLoading && !dbError && batchState && (
          <>
            {/* Scan Feedback Banner */}
            <ScanFeedback
              feedback={feedback}
              onDismiss={() => setFeedback(null)}
            />

            {/* Check if Batch is Complete */}
            {batchState.isBatchComplete || !batchState.currentLine ? (
              <BatchCompleteView
                batchNumber={batchState.batchNumber}
                totalLines={batchState.totalLines}
                onReset={handleResetDemo}
                isResetting={isResetting}
              />
            ) : (
              <>
                {/* Active Single Line Card */}
                <ActiveLineCard
                  line={batchState.currentLine}
                  onOpenNotFound={() => setIsModalOpen(true)}
                  disabled={isScanning}
                />

                {/* Persistent Barcode Scanner Input */}
                <div className="mt-1">
                  <ScannerInput
                    onScan={handleScan}
                    disabled={isScanning}
                    isProcessing={isScanning}
                    autoFocusRef={barcodeInputRef}
                  />
                </div>

                {/* Alternative Locations Modal */}
                <AlternativeLocationsModal
                  isOpen={isModalOpen}
                  onClose={() => {
                    setIsModalOpen(false);
                    setTimeout(() => {
                      if (barcodeInputRef.current) {
                        barcodeInputRef.current.focus();
                      }
                    }, 50);
                  }}
                  line={batchState.currentLine}
                  onSelectLocation={handleSelectLocation}
                />
              </>
            )}

            {/* Footer Quick Info */}
            <footer className="mt-1 flex items-center justify-between px-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Scan className="h-3.5 w-3.5 text-slate-400" />
                Handheld Scan-to-Pick
              </span>
              <span>PostgreSQL Persisted</span>
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
