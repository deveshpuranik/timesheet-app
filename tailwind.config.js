/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1D1D1D",
        secondary: "#A65F44",
        background: "#FFFFFF",
        linen: "#FAF9F6",
        clay: "#D4A373",
        moss: "#1B2623"
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        serif: ["var(--font-playfair)", "Playfair Display", "serif"],
        display: ["var(--font-cormorant)", "Cormorant Garamond", "serif"]
      },
      boxShadow: {
        soft: "0 18px 60px rgba(15, 23, 42, 0.08)",
        luxury: "0 1px 2px rgba(0,0,0,.03), 0 12px 24px rgba(0,0,0,.08), 0 24px 48px rgba(0,0,0,.10)"
      }
    }
  },
  plugins: []
};
