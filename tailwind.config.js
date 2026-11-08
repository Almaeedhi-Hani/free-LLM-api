/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          600: '#0d9488',
          700: '#0f766e',
          900: '#134e4a',
        },
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
        gold: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#d97706',
          600: '#b45309',
          700: '#92400e',
        },
        navy: {
          700: '#1e3a5f',
          800: '#172e4d',
          900: '#0f1f38',
          950: '#0a1628',
        },
      },
      fontFamily: {
        sans: ['Tajawal', 'sans-serif'],
      },
      boxShadow: {
        luxury: '0 10px 40px -10px rgba(15, 31, 56, 0.15)',
        'gold-glow': '0 0 20px rgba(217, 119, 6, 0.25)',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.5)' },
          '50%': { transform: 'scale(1.05)', boxShadow: '0 0 0 12px rgba(16, 185, 129, 0)' },
        },
      },
    },
  },
  plugins: [],
}
