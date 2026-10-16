import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        warehouse: {
          dark: "#0f172a",
          card: "#1e293b",
          border: "#334155",
          highlight: "#f59e0b",
          accent: "#3b82f6",
          success: "#10b981",
          danger: "#ef4444",
        },
      },
    },
  },
  plugins: [],
};
export default config;
