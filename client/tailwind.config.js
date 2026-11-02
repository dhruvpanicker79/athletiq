/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0D1010', bg2: '#171C1A', card: '#1D2420', line: '#303832',
        lime: { DEFAULT: '#C5F36A', dim: '#9DC24F' },
        ink: '#F5F6F2', mute: '#929A91', live: '#FF4D4F',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
