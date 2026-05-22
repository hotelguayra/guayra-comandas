import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        rubi: {
          DEFAULT: '#70161f',
          dark: '#56101a',
          light: '#8a1d28',
        },
        windsor: {
          DEFAULT: '#0c1826',
          light: '#132233',
          lighter: '#1a2d40',
          card: '#101f30',
        },
        jade: {
          DEFAULT: '#8baea7',
          dark: '#6d9089',
          light: '#a8c4be',
        },
        bronceado: {
          DEFAULT: '#b78c57',
          dark: '#9a7340',
          light: '#cba870',
        },
        tierra: {
          DEFAULT: '#d4c9b5',
          dark: '#b8a98f',
          light: '#e8e0d0',
          muted: '#8a8070',
        },
      },
      fontFamily: {
        heading: ['"GalanoGrotesque"', 'sans-serif'],
        body: ['"GalanoGrotesque"', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 4px 24px rgba(0,0,0,0.5)',
        card: '0 2px 16px rgba(0,0,0,0.4)',
        glow: '0 0 24px rgba(183,140,87,0.15)',
        'glow-rubi': '0 0 20px rgba(112,22,31,0.3)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config
