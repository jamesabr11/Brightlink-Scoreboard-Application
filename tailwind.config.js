/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        broadcast: {
          dark: "#1a1a1a",
          panel: "#2a2a2a",
          accent: "#3b82f6",
        },
      },
    },
  },
  plugins: [],
};
