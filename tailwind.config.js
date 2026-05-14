/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:        '#06070a',
        'bg-panel':'#0d0f15',
        'bg-raise':'#141823',
        ink:       '#f1ede5',
        'ink-dim': 'rgba(241,237,229,0.55)',
        'ink-faint':'rgba(241,237,229,0.22)',
        rule:      'rgba(241,237,229,0.08)',
        'rule-hi': 'rgba(255,214,10,0.35)',
        yellow:    '#ffd60a',
        cyan:      '#7fe3ff',
        pink:      '#ff5e8a',
        green:     '#3ddc84',
        discord:   '#5865f2',
      },
      fontFamily: {
        anton:  ['var(--font-anton)', 'Impact', 'sans-serif'],
        manrope:['var(--font-manrope)', '-apple-system', 'sans-serif'],
        mono:   ['var(--font-mono)', 'monospace'],
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        pulse: {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.35' },
        },
        ticker: {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-up':    'fadeUp 0.7s ease both',
        'fade-up-1':  'fadeUp 0.7s 0.1s ease both',
        'fade-up-2':  'fadeUp 0.7s 0.2s ease both',
        'fade-up-3':  'fadeUp 0.7s 0.3s ease both',
        'fade-up-4':  'fadeUp 0.7s 0.4s ease both',
        'fade-in':    'fadeIn 1s ease both',
        'pulse':      'pulse 1.8s ease-in-out infinite',
        'ticker':     'ticker 30s linear infinite',
      },
      boxShadow: {
        yellow: '0 0 0 1px rgba(255,214,10,0.35), 0 0 28px rgba(255,214,10,0.22), inset 0 0 20px rgba(255,214,10,0.04)',
        'yellow-btn': '0 12px 32px rgba(255,214,10,0.32)',
      },
    },
  },
  plugins: [],
};
