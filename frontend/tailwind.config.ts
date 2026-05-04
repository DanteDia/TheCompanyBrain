import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Acento terracotta tipo Anthropic
        accent: {
          50: "#FEF3E2",
          100: "#FDE4C0",
          200: "#FAC88F",
          300: "#F5A961",
          400: "#EB8C40",
          500: "#D2691E",
          600: "#B25319",
          700: "#A0522D",
          800: "#7C3F1F",
          900: "#5C2F18",
          950: "#3D1F10",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.2s ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "orb-pulse": "orbPulse var(--duration,4s) ease-in-out infinite",
        "orb-breathe": "orbBreathe var(--duration,4s) ease-in-out infinite",
        "orb-ripple": "orbRipple 3s cubic-bezier(0.16,1,0.3,1) infinite",
        "orb-spin": "orbSpin 60s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        orbPulse: {
          "0%, 100%": { transform: "scale(1)", filter: "brightness(1)" },
          "50%": { transform: "scale(1.05)", filter: "brightness(1.1)" },
        },
        orbBreathe: {
          "0%, 100%": { transform: "scale(1) rotate(0deg)" },
          "33%": { transform: "scale(1.02) rotate(2deg)" },
          "66%": { transform: "scale(1.04) rotate(-1deg)" },
        },
        orbRipple: {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(1.8)", opacity: "0" },
        },
        orbSpin: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
