import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          0: '#080d18',
          1: '#0f1824',
          2: '#162030',
          3: '#1e2d40',
          4: '#263850',
        },
        accent: {
          DEFAULT: '#34d399',
          dim: '#059669',
          glow: 'rgba(52,211,153,0.15)',
        },
        risk: {
          high: '#ef4444',
          medium: '#f59e0b',
          low: '#22c55e',
        },
        cred: {
          high: '#22c55e',
          mid: '#f59e0b',
          low: '#ef4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulse_dot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        fadeUp: 'fadeUp 0.4s ease-out forwards',
        pulse_dot: 'pulse_dot 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
