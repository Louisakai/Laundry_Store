/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fbfb',
          100: '#d6f2f2',
          200: '#ace4e5',
          300: '#79d0d1',
          400: '#3fb4b5',
          500: '#189595',
          600: '#0a7b7b',
          700: '#0c6465',
          800: '#0e4f51',
          900: '#103f40',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted: '#f4f4f5',
          subtle: '#e4e4e7',
        },
        canvas: '#fafafa',
        ink: {
          DEFAULT: '#18181b',
          secondary: '#52525b',
          muted: '#71717a',
          inverse: '#ffffff',
        },
        accent: {
          success: '#059669',
          warning: '#d97706',
          danger: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
