import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#fffafc",
        sage: {
          50: "#fff7fa",
          100: "#fdeef3",
          200: "#f6dfe8",
          300: "#edc6d7",
          400: "#e2a9c2",
          500: "#c98ba8",
          600: "#a96d8d",
          700: "#8b5673",
          800: "#6d445a",
          900: "#2d2027"
        },
        rose: {
          50: "#fff7f9",
          100: "#ffe8ef",
          200: "#ffd7e4",
          300: "#f6c0d5",
          400: "#efaccd",
          500: "#de8db0",
          600: "#c56a93",
          700: "#a64e78",
          800: "#8d4163"
        }
      }
    }
  },
  plugins: []
};

export default config;
