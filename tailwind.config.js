/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        board: {
          bg: '#1A2744',
          space: '#1E293B',
          border: '#334155',
        },
        game: {
          navy: '#0F172A',
          gold: '#F59E0B',
          success: '#10B981',
          danger: '#EF4444',
          card: '#1E293B',
          'card-border': '#334155',
          'text-primary': '#F8FAFC',
          'text-muted': '#94A3B8',
        },
        property: {
          brown: '#8B4513',
          'light-blue': '#87CEEB',
          pink: '#FF69B4',
          orange: '#FF8C00',
          red: '#EF4444',
          yellow: '#F59E0B',
          green: '#10B981',
          'dark-blue': '#1E40AF',
        },
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        'dice-roll': {
          '0%': { transform: 'rotateX(0) rotateY(0)' },
          '25%': { transform: 'rotateX(180deg) rotateY(90deg)' },
          '50%': { transform: 'rotateX(360deg) rotateY(180deg)' },
          '75%': { transform: 'rotateX(540deg) rotateY(270deg)' },
          '100%': { transform: 'rotateX(720deg) rotateY(360deg)' },
        },
        'token-bounce': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'cash-change': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '50%': { opacity: '1', transform: 'translateY(-5px)' },
          '100%': { opacity: '0', transform: 'translateY(-20px)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-100vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(100vh) rotate(720deg)', opacity: '0' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(245, 158, 11, 0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'dice-roll': 'dice-roll 1s ease-out',
        'token-bounce': 'token-bounce 0.5s ease-in-out',
        'cash-change': 'cash-change 1.5s ease-out forwards',
        'shake': 'shake 0.5s ease-in-out',
        'confetti-fall': 'confetti-fall 3s linear forwards',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
