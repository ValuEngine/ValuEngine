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
        base:      "var(--bg-base)",
        surface:   "var(--bg-surface)",
        elevated:  "var(--bg-elevated)",
        overlay:   "var(--bg-overlay)",
        accent:    "var(--accent-primary)",
        "accent-hover": "var(--accent-primary-hover)",
        "accent-muted": "var(--accent-primary-muted)",
        gold: {
          DEFAULT: "var(--accent-gold)",
          muted:   "var(--accent-gold-muted)",
        },
        success:   "var(--color-success)",
        danger:    "var(--color-danger)",
        warning:   "var(--color-warning)",
        info:      "var(--color-info)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "20px",
      },
      animation: {
        "fade-in":      "fadeIn 0.4s ease-out",
        "slide-up":     "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-slow":   "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "tickerScroll": "tickerScroll 30s linear infinite",
        "count-up":     "countUp 0.3s ease-out",
      },
      keyframes: {
        fadeIn:       { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp:      { from: { opacity: "0", transform: "translateY(20px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        tickerScroll: { from: { transform: "translateX(0)" }, to: { transform: "translateX(-50%)" } },
        countUp:      { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};

export default config;
