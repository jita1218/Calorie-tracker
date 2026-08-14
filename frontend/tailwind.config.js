/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        steel: '#ECE7DD',
        plate: '#FBF8F2',
        ink: '#2B211B',
        turmeric: '#D89B1F',
        'turmeric-dark': '#B57E15',
        masala: '#A83E2C',
        curry: '#4C6444',
        cardamom: '#8B8272',
      },
      fontFamily: {
        display: ['"Kalam"', 'cursive'],
        body: ['"Work Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      borderRadius: {
        thali: '2.5rem',
      },
    },
  },
  plugins: [],
};
