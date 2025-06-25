/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#111111',
        surface: '#1C1C1C',
        slate: '#1F1F1F',
        accent: '#009EFF',
      },
      animation: {
        'fade-in': 'fadeIn 200ms ease-in-out',
        'slide-up': 'slideUp 200ms ease-in-out',
        'pulse-glow': 'pulseGlow 1s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%': { boxShadow: '0 0 0 0 rgba(0, 158, 255, 0.4)' },
          '70%': { boxShadow: '0 0 0 10px rgba(0, 158, 255, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(0, 158, 255, 0)' },
        },
      },
      transitionDuration: {
        '300': '300ms',
        '150': '150ms',
      },
    },
  },
  plugins: [],
} 