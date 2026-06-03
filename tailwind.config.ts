import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#fbfaf6",
        sage: {
          50: "#f5f7f2",
          100: "#e8eddf",
          200: "#d2dcc4",
          300: "#adbf95",
          400: "#86a167",
          500: "#668248",
          600: "#50683a",
          700: "#40532f",
          800: "#364429",
          900: "#2f3a26"
        },
        rose: {
          50: "#fff5f6",
          100: "#ffe8eb",
          200: "#ffd3d9",
          300: "#ffadb9",
          400: "#ff7a8d",
          500: "#f74d66",
          600: "#df2948",
          700: "#bb1d39"
        }
      }
    }
  },
  plugins: []
};

export default config;
