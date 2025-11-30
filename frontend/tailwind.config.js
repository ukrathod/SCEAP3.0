/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: "#071021",
        dark2: "#0C1B2A",
        accent: "#00E5FF"
      }
    },
  },
  plugins: [],
}
