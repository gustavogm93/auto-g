/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pending: {
          bg: '#fef3c7',
          text: '#92400e',
          border: '#f59e0b',
        },
        'in-process': {
          bg: '#dbeafe',
          text: '#1e40af',
          border: '#3b82f6',
        },
        end: {
          bg: '#d1fae5',
          text: '#065f46',
          border: '#10b981',
        },
      },
    },
  },
  plugins: [],
}
