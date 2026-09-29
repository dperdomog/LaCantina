/** @type {import('tailwindcss').Config} */
// Colores de tema como variables CSS (ver app/globals.css): cambian entre claro y nocturno.
const themed = v => `rgb(var(--${v}) / <alpha-value>)`;

module.exports = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tema
        bg:          themed('bg'),
        surface:     themed('surface'),
        'surface-2': themed('surface-2'),
        'bg-panel':  themed('surface'),
        'bg-raise':  themed('surface-2'),
        ink:         themed('ink'),
        'ink-dim':   'rgb(var(--ink) / 0.64)',
        'ink-faint': 'rgb(var(--ink) / 0.32)',
        rule:        'rgb(var(--ink) / 0.12)',
        'rule-hi':   themed('line'),
        line:        themed('line'),
        // Texto de color legible en ambos temas
        'yellow-ink': themed('yellow-ink'),
        'cyan-ink':   themed('cyan-ink'),
        'green-ink':  themed('green-ink'),
        'pink-ink':   themed('pink-ink'),
        // Marca (fijos): las franjas del logo
        yellow:     '#ffd400',
        cyan:       '#00c8f0',
        green:      '#00d97e',
        orange:     '#ff7043',
        red:        '#ff2d2d',
        pink:       '#ff5e8a',
        discord:    '#5865f2',
        'on-color': '#1c1c1c',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body:    ['var(--font-body)', '-apple-system', 'sans-serif'],
        anton:   ['var(--font-display)', 'sans-serif'],
        manrope: ['var(--font-body)', '-apple-system', 'sans-serif'],
        mono:    ['ui-monospace', 'SFMono-Regular', 'monospace'],
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
        // Sombra sólida estilo sticker
        sticker:      '6px 6px 0 rgb(var(--shadow))',
        'sticker-sm': '4px 4px 0 rgb(var(--shadow))',
        yellow:       '6px 6px 0 rgb(var(--shadow))',
        'yellow-btn': '4px 4px 0 rgb(var(--shadow))',
      },
    },
  },
  plugins: [],
};
