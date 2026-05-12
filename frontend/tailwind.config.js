/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2fb",
          100: "#d6def5",
          200: "#a9bbea",
          300: "#7493dc",
          400: "#456fcb",
          500: "#2553b5",
          600: "#1c3f8e",
          700: "#172f6a",
          800: "#12244f",
          900: "#0c1936",
        },
        crimson: {
          50: "#fdf2f2",
          100: "#fbe0e0",
          200: "#f6b8b8",
          300: "#ee8585",
          400: "#e34d4d",
          500: "#d32424",
          600: "#b51717",
          700: "#8c1414",
          800: "#641010",
          900: "#420a0a",
        },
        gold: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#a16207",
          800: "#713f12",
          900: "#451a03",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Poppins", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px -12px rgba(23, 47, 106, 0.25)",
      },
    },
  },
  plugins: [],
};
