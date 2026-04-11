/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#ff8674',
        'brand-dark': '#e86a58',
        'brand-light': '#fff0ed',
        'brand-border': '#ffb8ae',
      }
    },
  },
  plugins: [],
}
