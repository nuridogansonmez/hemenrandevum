import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#1C1C1E",
          secondary: "#6B6B6B",
          tertiary: "#9E9E9E",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 2px 16px 0 rgba(0,0,0,0.07)",
        "card-hover": "0 6px 28px 0 rgba(0,0,0,0.12)",
        soft: "0 1px 8px 0 rgba(0,0,0,0.05)",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "32px",
      },
    },
  },
  plugins: [],
};

export default config;
