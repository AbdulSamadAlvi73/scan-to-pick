"use client";

import React, { useEffect } from "react";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";

export interface FeedbackState {
  type: "success" | "error" | "info";
  message: string;
}

interface ScanFeedbackProps {
  feedback: FeedbackState | null;
  onDismiss?: () => void;
}

// Optional synthetic beep for warehouse audio cues (no external asset needed)
function playFeedbackSound(type: "success" | "error") {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      // Pleasant high-pitch chime
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } else {
      // Lower double-buzz for warning
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {
    // Ignore audio permission or playback errors
  }
}

export function ScanFeedback({ feedback, onDismiss }: ScanFeedbackProps) {
  useEffect(() => {
    if (!feedback) return;

    if (feedback.type === "error" || feedback.type === "success") {
      playFeedbackSound(feedback.type);
    }

    // Auto-clear success messages after 3.5 seconds
    if (feedback.type === "success") {
      const timer = setTimeout(() => {
        if (onDismiss) onDismiss();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [feedback, onDismiss]);

  if (!feedback) return null;

  const isError = feedback.type === "error";
  const isSuccess = feedback.type === "success";

  return (
    <div
      id="scan-feedback-banner"
      role="alert"
      aria-live="assertive"
      className={`flex items-start gap-3 rounded-xl p-3.5 shadow-lg transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
        isError
          ? "border-2 border-red-500 bg-red-950/95 text-red-100"
          : isSuccess
          ? "border-2 border-emerald-500 bg-emerald-950/95 text-emerald-100"
          : "border border-blue-500/50 bg-blue-950/90 text-blue-100"
      }`}
    >
      <div className="shrink-0 mt-0.5">
        {isError && <AlertTriangle className="h-5 w-5 text-red-400" />}
        {isSuccess && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
        {!isError && !isSuccess && <Info className="h-5 w-5 text-blue-400" />}
      </div>

      <div className="flex-1 text-sm font-semibold leading-tight">
        {feedback.message}
      </div>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-bold uppercase opacity-70 hover:opacity-100"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
