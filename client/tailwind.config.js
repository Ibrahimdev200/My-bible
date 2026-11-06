/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f3ff',
          100: '#dbe1ff',
          200: '#b6c3ff',
          300: '#8199ff',
          400: '#4d6bff',
          500: '#1a3dff',
          600: '#0a1f8f',
          700: '#0d1b69',
          800: '#0f1852',
          900: '#0b1137',
          950: '#060a1f',
        },
        gold: {
          50: '#fff9eb',
          100: '#ffefc6',
          200: '#ffdd88',
          300: '#ffc94a',
          400: '#ffb620',
          500: '#f99307',
          600: '#dd6d02',
          700: '#b74b06',
          800: '#94390c',
          900: '#7a300d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
        scripture: ['Merriweather', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'fade-out': 'fadeOut 0.6s ease-in',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(30px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(249, 147, 7, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(249, 147, 7, 0.6)' },
        },
      },
    },
  },
  plugins: [],
};

