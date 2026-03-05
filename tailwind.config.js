/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0B0F14",
        card: "#1A2029",
        "card-hover": "#222B37",
        border: "#2A3441",
        "border-light": "#3A4755",
        "text-primary": "#E8ECF1",
        "text-muted": "#8899AA",
        "text-dim": "#5A6B7C",
        accent: "#3B82F6",
        "accent-light": "#60A5FA",
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glowPulse: {
          "0%, 100%": { boxShadow: "0 0 8px rgba(59,130,246,0.2)" },
          "50%": { boxShadow: "0 0 16px rgba(59,130,246,0.4)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "glow-pulse": "glowPulse 2s ease-in-out infinite",
      },
      boxShadow: {
        glow: "0 0 12px rgba(59,130,246,0.25)",
      },
    },
  },
  plugins: [],
};
