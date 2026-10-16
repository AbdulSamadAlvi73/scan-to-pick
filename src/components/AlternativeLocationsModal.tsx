"use client";

import React, { useEffect, useState } from "react";
import { AlternativeLocation, PickingLine } from "@/lib/types";
import {
  MapPin,
  X,
  PackageCheck,
  AlertCircle,
  Loader2,
  Check,
} from "lucide-react";

interface AlternativeLocationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  line: PickingLine;
  onSelectLocation: (newLocationId: number) => Promise<void>;
}

export function AlternativeLocationsModal({
  isOpen,
  onClose,
  line,
  onSelectLocation,
}: AlternativeLocationsModalProps) {
  const [locations, setLocations] = useState<AlternativeLocation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetch(
      `/api/locations?productId=${line.productId}&currentLocationId=${line.assignedLocationId}`
    )
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.message || "Failed to load alternative locations");
        }
        if (isMounted) {
          setLocations(data.locations || []);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Error fetching locations");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, line.productId, line.assignedLocationId]);

  if (!isOpen) return null;

  const handleSelect = async (locationId: number) => {
    setIsUpdating(locationId);
    try {
      await onSelectLocation(locationId);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to reassign location");
      setIsUpdating(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="w-full max-w-[420px] rounded-t-3xl border border-slate-700 bg-slate-900 p-5 shadow-2xl transition-all sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 id="modal-title" className="text-base font-bold text-white">
              Alternative Stock Locations
            </h3>
            <p className="text-xs text-slate-400">
              Current shelf: <strong className="text-amber-400">{line.assignedLocationCode}</strong>
            </p>
          </div>
          <button
            type="button"
            id="close-modal-btn"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
              <span className="mt-2 text-xs">Checking warehouse inventory...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-950/60 border border-red-800/80 p-3 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !error && locations.length === 0 && (
            <div id="no-alt-locations" className="flex flex-col items-center justify-center py-8 text-center text-slate-400">
              <PackageCheck className="h-10 w-10 text-slate-600 mb-2" />
              <span className="text-sm font-semibold text-slate-300">
                No alternative locations
              </span>
              <p className="mt-1 text-xs text-slate-500 max-w-[260px]">
                This product is currently only stocked at location {line.assignedLocationCode}.
              </p>
            </div>
          )}

          {!isLoading &&
            locations.map((loc) => (
              <button
                key={loc.locationId}
                id={`alt-loc-${loc.locationId}`}
                type="button"
                onClick={() => handleSelect(loc.locationId)}
                disabled={isUpdating !== null}
                className="group flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800/70 p-3.5 text-left transition-all hover:border-amber-400 hover:bg-slate-800 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 group-hover:bg-amber-500/20">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-bold text-white group-hover:text-amber-300">
                      {loc.locationCode}
                    </div>
                    <div className="text-xs text-slate-400">
                      Zone {loc.zone} &bull; Available Stock
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-emerald-950/80 px-2.5 py-1 text-xs font-bold text-emerald-400 border border-emerald-800/60">
                    {loc.stockQuantity} in stock
                  </span>
                  {isUpdating === loc.locationId ? (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                  ) : (
                    <Check className="h-4 w-4 text-transparent group-hover:text-amber-400" />
                  )}
                </div>
              </button>
            ))}
        </div>

        {/* Footer */}
        <div className="mt-4 border-t border-slate-800 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-800 py-3 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
          >
            Cancel and Return to Picking
          </button>
        </div>
      </div>
    </div>
  );
}
