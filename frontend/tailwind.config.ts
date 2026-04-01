import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "#C9A84C",
          light:   "#e8c55a",
          dark:    "#a8892e",
          muted:   "rgba(201,168,76,0.12)",
        },
        navy: {
          DEFAULT: "#0a1628",
          card:    "#132032",
          card2:   "#1a2d45",
          border:  "rgba(201,168,76,0.18)",
        },
        success: "#00d4aa",
        danger:  "#ff4d6d",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in":      "fadeIn 0.4s ease-out",
        "slide-up":     "slideUp 0.4s ease-out",
        "pulse-slow":   "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "tickerScroll": "tickerScroll 30s linear infinite",
      },
      keyframes: {
        fadeIn:       { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:      { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        tickerScroll: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
      },
    },
  },
  plugins: [],
};

export default config;
