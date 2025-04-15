/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#B133FF',
        secondary: '#000000',
      },
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'waveform': 'waveform 1.2s ease-in-out infinite',
      },
      keyframes: {
        waveform: {
          '0%, 100%': { height: '20%' },
          '50%': { height: '100%' },
        },
      },
      backgroundColor: {
        'app-dark': '#000000',
      },
      textColor: {
        'app-light': '#FFFFFF',
      },
    },
  },
  plugins: [],
};