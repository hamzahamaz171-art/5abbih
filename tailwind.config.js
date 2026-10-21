/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        dark: {
          bg: "#050A07",
          card: "#0D1711",
          elevated: "#101C14",
          soft: "#142219",
          border: "#1A2A20",
        },

        brand: {
          // On garde ces noms pour ne rien casser dans le projet
          blue: "#22C55E",
          green: "#22C55E",
          purple: "#A78BFA",
          orange: "#F97316",

          emerald: "#10B981",
          lime: "#4ADE80",
        },

        pitch: {
          DEFAULT: "#15803D",
          light: "#16A34A",
          dark: "#14532D",
          stripe: "#106B35",
        },
      },

      borderRadius: {
        premium: "18px",
        "premium-lg": "24px",
      },

      boxShadow: {
        premium:
          "0 18px 45px rgba(0,0,0,.28), inset 0 1px 0 rgba(255,255,255,.03)",

        "premium-lg":
          "0 28px 70px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.04)",

        glow:
          "0 0 25px rgba(34,197,94,.10)",

        "glow-lg":
          "0 0 40px rgba(34,197,94,.18)",

        sidebar:
          "20px 0 70px rgba(0,0,0,.32)",
      },

      backdropBlur: {
        premium: "18px",
      },

      backgroundImage: {
        "premium-card":
          "linear-gradient(145deg,#101913,#09110c)",

        "premium-header":
          "linear-gradient(90deg,#0b1810,#0c1510,#08100b)",

        "football-bg":
          "radial-gradient(circle at 15% 0%,rgba(34,197,94,.08),transparent 25%), radial-gradient(circle at 90% 95%,rgba(16,185,129,.05),transparent 30%)",

        pitch:
          "repeating-linear-gradient(90deg,#106B35 0,#106B35 42px,#0D5C2E 42px,#0D5C2E 84px)",
      },

      animation: {
        "pulse-live": "pulseLive 1.8s ease-in-out infinite",
        "fade-up": "fadeUp .5s ease-out both",
        "float-soft": "floatSoft 5s ease-in-out infinite",
      },

      keyframes: {
        pulseLive: {
          "0%,100%": {
            opacity: "1",
            transform: "scale(1)",
          },
          "50%": {
            opacity: ".45",
            transform: "scale(.85)",
          },
        },

        floatSoft: {
          "0%,100%": {
            transform: "translateY(0)",
          },
          "50%": {
            transform: "translateY(-6px)",
          },
        },

        fadeUp: {
          from: {
            opacity: "0",
            transform: "translateY(10px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
      },

      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
      },

      letterSpacing: {
        premium: "0.16em",
        "premium-wide": "0.22em",
      },
    },
  },

  plugins: [],
};