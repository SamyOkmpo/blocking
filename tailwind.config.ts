import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Fondo dark navy / negro
        night: {
          950: '#07070f',
          900: '#0b0b18',
          850: '#101022',
          800: '#16162c',
          700: '#1f1f3a',
          600: '#2b2b4d',
        },
        // Acento: violeta por defecto, cambia según el tema activo (ver
        // globals.css y src/lib/themes.ts) a través de variables CSS.
        accent: {
          300: 'rgb(var(--accent-300) / <alpha-value>)',
          400: 'rgb(var(--accent-400) / <alpha-value>)',
          500: 'rgb(var(--accent-500) / <alpha-value>)',
          600: 'rgb(var(--accent-600) / <alpha-value>)',
          700: 'rgb(var(--accent-700) / <alpha-value>)',
        },
        success: '#34d399',
        danger: '#f87171',
        warning: '#fbbf24',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-grotesk)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '70%': { transform: 'scale(1.08)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'check-bounce': {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(139, 92, 246, 0.45)' },
          '50%': { boxShadow: '0 0 24px 6px rgba(139, 92, 246, 0.25)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        'xp-fill': {
          '0%': { width: '0%' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-150%)' },
          '100%': { transform: 'translateX(150%)' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'slide-up': 'slide-up 0.3s ease-out both',
        'check-bounce': 'check-bounce 0.3s ease-in-out',
        'pulse-glow': 'pulse-glow 2.4s ease-in-out infinite',
        shake: 'shake 0.4s ease-in-out',
        shimmer: 'shimmer 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
