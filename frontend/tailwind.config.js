/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#1E40AF',
          green: '#16A34A',
        }
      }
    },
  },
  plugins: [],
}
