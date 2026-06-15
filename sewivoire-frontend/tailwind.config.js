/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        or: '#C8962E',
        nuit: '#295b4f',
        ivoire: '#F5F0E8',
      },
      fontFamily: {
        titre: ['Playfair Display', 'serif'],
        corps: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}