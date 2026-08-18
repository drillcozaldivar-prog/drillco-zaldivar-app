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
        drillco: {
          red: "#9E1B2C",
          hover: "#801423",
          lightred: "#FFF1F2",
          gold: "#EAB308",
          dark: "#0F172A",
          surface: "#FFFFFF",
          bg: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0",
          text: "#1E293B",
          muted: "#64748B",
        },
        mining: {
          dark: "#0F172A",
          surface: "#1E293B",
          card: "#334155",
          border: "#475569",
          primary: "#9E1B2C",
          hover: "#801423",
          danger: "#EF4444",
          success: "#10B981",
          warning: "#F59E0B",
          info: "#3B82F6"
        }
      }
    },
  },
  plugins: [],
};
export default config;
