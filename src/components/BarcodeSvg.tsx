"use client";

import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface BarcodeSvgProps {
  code: string;
  className?: string;
  height?: number;
  width?: number;
}

export function BarcodeSvg({
  code,
  className = "",
  height = 80,
  width = 2,
}: BarcodeSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (svgRef.current && code) {
      try {
        JsBarcode(svgRef.current, code, {
          format: "CODE128",
          width,
          height,
          displayValue: true,
          font: "monospace",
          fontSize: 14,
          fontOptions: "bold",
          textMargin: 6,
          margin: 10,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch (err) {
        console.error("JsBarcode render error:", err);
      }
    }
  }, [code, height, width]);

  return (
    <div
      className={`inline-flex flex-col items-center rounded-xl bg-white p-2 shadow-md ${className}`}
    >
      <svg ref={svgRef} />
    </div>
  );
}
