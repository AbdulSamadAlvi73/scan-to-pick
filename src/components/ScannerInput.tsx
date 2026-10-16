"use client";

import React, { useEffect, useRef, useState } from "react";
import { Barcode, CornerDownLeft, Loader2, Camera } from "lucide-react";
import { CameraScannerModal } from "./CameraScannerModal";

interface ScannerInputProps {
  onScan: (barcode: string) => Promise<void>;
  disabled?: boolean;
  isProcessing?: boolean;
  placeholder?: string;
  autoFocusRef?: React.MutableRefObject<HTMLInputElement | null>;
  expectedEan?: string;
}

export function ScannerInput({
  onScan,
  disabled = false,
  isProcessing = false,
  placeholder = "Scan barcode or type EAN...",
  autoFocusRef,
  expectedEan,
}: ScannerInputProps) {
  const [value, setValue] = useState("");
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = autoFocusRef || internalInputRef;

  // Keep scanner input focused at all times for hardware scanners
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      if (!disabled && !isCameraOpen && inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);

    return () => clearTimeout(focusTimer);
  }, [disabled, isCameraOpen, inputRef]);

  // Global listener to refocus input if user clicks anywhere outside of modal
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      // Don't steal focus if interacting with buttons, modals, or other inputs
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.closest("button") ||
          target.closest("[role='dialog']") ||
          target.closest("input"))
      ) {
        return;
      }

      if (!disabled && !isCameraOpen && inputRef.current) {
        inputRef.current.focus();
      }
    };

    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [disabled, isCameraOpen, inputRef]);

  const isSubmittingRef = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = value.trim();
    if (!barcode || isProcessing || disabled || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    // Immediately clear input to prepare for next scan
    setValue("");
    try {
      await onScan(barcode);
    } finally {
      isSubmittingRef.current = false;
      // Refocus input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative flex items-center">
          <div className="pointer-events-none absolute left-3 flex items-center text-slate-400">
            {isProcessing ? (
              <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            ) : (
              <Barcode className="h-5 w-5 text-amber-400" />
            )}
          </div>

          <input
            id="barcode-input"
            ref={inputRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            value={value}
            disabled={disabled || isProcessing}
            onChange={(e) => setValue(e.target.value)}
            placeholder={disabled ? "Scanning disabled" : placeholder}
            className={`h-14 w-full rounded-xl border-2 bg-slate-900 pl-11 pr-24 text-base font-semibold tracking-wider text-white shadow-inner transition-colors placeholder:text-sm placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-500 focus:outline-none ${
              disabled
                ? "cursor-not-allowed border-slate-800 bg-slate-950 text-slate-500"
                : "border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            }`}
          />

          <div className="absolute right-2 flex items-center gap-1.5">
            <button
              type="button"
              id="camera-scan-btn"
              onClick={() => setIsCameraOpen(true)}
              disabled={disabled || isProcessing}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 transition-all hover:bg-amber-500/30 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
              title="Open camera to scan barcode"
              aria-label="Open camera barcode scanner"
            >
              <Camera className="h-5 w-5" />
            </button>

            <button
              type="submit"
              id="barcode-submit-btn"
              disabled={disabled || isProcessing || !value.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:pointer-events-none disabled:opacity-40"
              title="Submit barcode"
              aria-label="Submit barcode scan"
            >
              <CornerDownLeft className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-1.5 flex items-center justify-between px-1 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Scanner &amp; Camera Ready
          </span>
          <button
            type="button"
            id="camera-link-btn"
            onClick={() => setIsCameraOpen(true)}
            className="text-amber-400 hover:underline font-medium flex items-center gap-1"
          >
            <Camera className="h-3 w-3" />
            <span>Open Camera</span>
          </button>
        </div>
      </form>

      {/* Live Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isCameraOpen}
        onClose={() => {
          setIsCameraOpen(false);
          setTimeout(() => {
            if (inputRef.current) inputRef.current.focus();
          }, 100);
        }}
        onScanSuccess={async (scanned) => {
          await onScan(scanned);
        }}
        expectedEan={expectedEan}
      />
    </>
  );
}
