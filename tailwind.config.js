/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        apple: {
          bg: 'var(--bg-primary)',
          surface: 'var(--bg-secondary)',
          text: 'var(--text-primary)',
          subtext: 'var(--text-secondary)',
          blue: 'var(--accent)',
          border: 'var(--border-color)',
        },
      },
      borderRadius: {
        'apple': '18px',
        'apple-sm': '10px',
      },
    },
  },
  plugins: [],
};