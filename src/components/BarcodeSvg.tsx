"use client";

import React from "react";

// Standard EAN-13 Bit Encoding Tables
const TABLE_A: Record<string, string> = {
  "0": "0001101",
  "1": "0011001",
  "2": "0010011",
  "3": "0111101",
  "4": "0100011",
  "5": "0110001",
  "6": "0101111",
  "7": "0111011",
  "8": "0110111",
  "9": "0001011",
};

const TABLE_B: Record<string, string> = {
  "0": "0100111",
  "1": "0110011",
  "2": "0011011",
  "3": "0100001",
  "4": "0011101",
  "5": "0111001",
  "6": "0000101",
  "7": "0010001",
  "8": "0001001",
  "9": "0010111",
};

const TABLE_C: Record<string, string> = {
  "0": "1110010",
  "1": "1100110",
  "2": "1101100",
  "3": "1000010",
  "4": "1011100",
  "5": "1001110",
  "6": "1010000",
  "7": "1000100",
  "8": "1001000",
  "9": "1110100",
};

const PARITY: Record<string, string> = {
  "0": "AAAAAA",
  "1": "AABABB",
  "2": "AABBAB",
  "3": "AABBBA",
  "4": "ABAABB",
  "5": "ABBAAB",
  "6": "ABBBAA",
  "7": "ABABAB",
  "8": "ABABBA",
  "9": "ABBABA",
};

export function generateEan13Modules(code: string): string {
  const digits = code.replace(/\D/g, "").padEnd(13, "0").slice(0, 13);
  const firstDigit = digits[0];
  const parityPattern = PARITY[firstDigit] || "AAAAAA";

  // Start guard: 101
  let modules = "101";

  // First group of 6 digits (digits index 1 to 6)
  for (let i = 1; i <= 6; i++) {
    const digit = digits[i];
    const type = parityPattern[i - 1];
    modules += type === "A" ? TABLE_A[digit] : TABLE_B[digit];
  }

  // Center guard: 01010
  modules += "01010";

  // Second group of 6 digits (digits index 7 to 12)
  for (let i = 7; i <= 12; i++) {
    const digit = digits[i];
    modules += TABLE_C[digit];
  }

  // End guard: 101
  modules += "101";

  return modules;
}

interface BarcodeSvgProps {
  code: string;
  className?: string;
  moduleWidth?: number;
  height?: number;
}

export function BarcodeSvg({
  code,
  className = "",
  moduleWidth = 2,
  height = 70,
}: BarcodeSvgProps) {
  const modules = generateEan13Modules(code);
  const quietZoneModules = 10;
  const totalModules = modules.length + quietZoneModules * 2;
  const svgWidth = totalModules * moduleWidth;
  const svgHeight = height + 24;

  const rects: React.ReactNode[] = [];
  for (let i = 0; i < modules.length; i++) {
    if (modules[i] === "1") {
      const isGuard =
        i < 3 || // Start guard
        (i >= 45 && i < 50) || // Center guard
        i >= modules.length - 3; // End guard

      const barHeight = isGuard ? height + 8 : height;

      rects.push(
        <rect
          key={i}
          x={(i + quietZoneModules) * moduleWidth}
          y={6}
          width={moduleWidth}
          height={barHeight}
          fill="black"
        />
      );
    }
  }

  return (
    <div className={`inline-flex flex-col items-center rounded-xl bg-white p-3 shadow-md ${className}`}>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="block"
      >
        <rect width={svgWidth} height={svgHeight} fill="white" />
        {rects}
      </svg>
      <div className="mt-1 font-mono text-xs tracking-widest text-slate-800 font-bold">
        {code.slice(0, 1)} {code.slice(1, 7)} {code.slice(7, 13)}
      </div>
    </div>
  );
}
