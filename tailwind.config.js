/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F3EB',
        paperdark: '#EDE8DA',
        ink: '#1B1710',
        muted: '#6B6259',
        line: '#E2DCCB',
        accent: '#B45309',
        accentdeep: '#92400E',
        moss: '#166534',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
