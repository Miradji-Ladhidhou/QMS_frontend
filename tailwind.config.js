/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1F3864',
          50: '#EAEEF4',
          100: '#D5DCE8',
          500: '#2A4A80',
          600: '#1F3864',
          700: '#16294A',
        },
      },
    },
  },
  plugins: [],
};
