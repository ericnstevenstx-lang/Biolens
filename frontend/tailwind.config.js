/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        manrope: ["var(--font-manrope)", "sans-serif"],
        inter: ["var(--font-inter)", "sans-serif"],
        playfair: ["var(--font-playfair)", "serif"],
      },
      colors: {
        "bg-primary": "#070b12",
        "bg-secondary": "#0c1220",
        "bg-card": "#111827",
        "bg-border": "#1e293b",
        "accent-cyan": "#06b6d4",
        "accent-cyan-glow": "#22d3ee",
        "accent-blue": "#3b82f6",
        "risk-red": "#ef4444",
        "risk-amber": "#f59e0b",
        "bridge-amber": "#f59e0b",
        "bio-green": "#10b981",
        "text-primary": "#f1f5f9",
        "text-secondary": "#94a3b8",
        "text-muted": "#475569",
      },
    },
  },
  plugins: [],
};
