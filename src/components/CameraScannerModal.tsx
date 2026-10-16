"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  Upload,
  ScanLine,
} from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedBarcode: string) => void;
  expectedEan?: string;
}

export function CameraScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  expectedEan,
}: CameraScannerModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const containerId = "html5-camera-viewfinder";

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;
    setError(null);
    setIsInitializing(true);
    setIsCameraActive(false);

    const initScanner = async () => {
      try {
        // Check secure context or mediaDevices support
        if (
          typeof navigator === "undefined" ||
          !navigator.mediaDevices ||
          !navigator.mediaDevices.getUserMedia
        ) {
          throw new Error(
            "Live camera stream requires HTTPS or localhost on mobile. You can use the 'Take Photo' button below to capture and decode a barcode."
          );
        }

        const html5QrCode = new Html5Qrcode(containerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });

        scannerRef.current = html5QrCode;

        const config = {
          fps: 20,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => ({
            width: Math.max(220, Math.floor(viewfinderWidth * 0.85)),
            height: Math.max(160, Math.floor(viewfinderHeight * 0.65)),
          }),
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            // Success callback
            if (isMounted) {
              const cleaned = (decodedText || "").trim();
              if (cleaned) {
                // Stop scanner and trigger scan
                html5QrCode
                  .stop()
                  .catch(() => {})
                  .finally(() => {
                    onScanSuccess(cleaned);
                    onClose();
                  });
              }
            }
          },
          () => {
            // Frame error - ignore repeated frame misses
          }
        );

        if (isMounted) {
          setIsCameraActive(true);
          setIsInitializing(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.warn("Camera start failed:", err);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to start camera. Please verify camera permissions or use the Take Photo option."
          );
          setIsInitializing(false);
        }
      }
    };

    // Small delay to ensure DOM container is mounted
    const timer = setTimeout(() => {
      initScanner();
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (scannerRef.current) {
        if (scannerRef.current.isScanning) {
          scannerRef.current
            .stop()
            .then(() => scannerRef.current?.clear())
            .catch(() => {});
        } else {
          scannerRef.current.clear();
        }
        scannerRef.current = null;
      }
    };
  }, [isOpen, onClose, onScanSuccess]);

  // Handle fallback file / photo capture
  const handleFileCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsInitializing(true);

    try {
      let qrCode = scannerRef.current;
      if (!qrCode) {
        qrCode = new Html5Qrcode(containerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A,
          ],
          verbose: false,
        });
        scannerRef.current = qrCode;
      }

      const decodedText = await qrCode.scanFile(file, true);
      const cleaned = (decodedText || "").trim();
      if (cleaned) {
        onScanSuccess(cleaned);
        onClose();
      } else {
        throw new Error("No barcode detected in the photo. Please try again with clear lighting.");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to read barcode from photo. Please ensure barcode is centered and well-lit."
      );
    } finally {
      setIsInitializing(false);
      // Reset input value so same photo can be retaken if needed
      e.target.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="camera-scanner-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 backdrop-blur-md"
    >
      <div className="flex w-full max-w-[400px] flex-col rounded-3xl border border-slate-700 bg-slate-900 p-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h3 id="camera-scanner-title" className="text-sm font-bold text-white">
                Camera Barcode Scanner
              </h3>
              <p className="text-[11px] text-slate-400">
                Aim your camera at the product barcode
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            aria-label="Close camera scanner"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewfinder Window */}
        <div className="relative mt-3 flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-black min-h-[260px]">
          {/* HTML5 QR Code Video Target */}
          <div id={containerId} className="w-full overflow-hidden" />

          {/* Loading Overlay */}
          {isInitializing && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/80 text-amber-400">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="mt-2 text-xs font-semibold text-slate-300">
                Starting camera...
              </span>
            </div>
          )}

          {/* Viewfinder Target Reticle */}
          {isCameraActive && !isInitializing && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="relative h-40 w-64 rounded-xl border-2 border-amber-400/80 shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                {/* Red Laser Scanline Animation */}
                <div className="absolute inset-x-0 h-0.5 bg-red-500 shadow-[0_0_8px_red] animate-pulse top-1/2 -translate-y-1/2" />
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/70 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                  Align Barcode Inside Box
                </span>
              </div>
            </div>
          )}

          {/* Camera Error / Permission Fallback */}
          {error && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 text-center bg-slate-900/95">
              <AlertCircle className="h-8 w-8 text-amber-400 mb-2" />
              <span className="text-xs font-bold text-white mb-1">
                Live Video Unavailable
              </span>
              <p className="text-[11px] leading-relaxed text-slate-300 mb-4 max-w-[280px]">
                {error}
              </p>

              {/* Photo Upload / Capture Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 shadow-md transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Take Photo / Choose Image</span>
              </button>
            </div>
          )}
        </div>

        {/* Hidden File Input for Native iOS Camera Capture */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileCapture}
          className="hidden"
          aria-hidden="true"
        />

        {/* Actions / Fallback Controls */}
        <div className="mt-3 flex flex-col gap-2">
          {!error && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            >
              <Upload className="h-4 w-4 text-amber-400" />
              <span>Take Photo of Barcode Instead</span>
            </button>
          )}

          {expectedEan && (
            <div className="flex items-center justify-between rounded-xl bg-slate-950/70 px-3 py-2 border border-slate-800 text-[11px]">
              <span className="text-slate-400">Expected: <strong className="text-white font-mono">{expectedEan}</strong></span>
              <button
                type="button"
                onClick={() => {
                  onScanSuccess(expectedEan);
                  onClose();
                }}
                className="rounded-lg bg-emerald-600/30 px-2 py-1 font-bold text-emerald-400 hover:bg-emerald-600/50 border border-emerald-500/40 transition-colors"
              >
                Test Scan Expected
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-800 py-2.5 text-xs font-bold text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
