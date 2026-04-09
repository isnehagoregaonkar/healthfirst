const { colors } = require('./src/theme/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,ts,tsx}', './src/**/*.{js,ts,tsx}'],
  theme: {
    extend: {
      colors,

      spacing: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },

      fontSize: {
        h1: '24px',
        h2: '18px',
        body: '15px',
        caption: '12px',
      },

      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      },
    },
  },
  plugins: [],
};
