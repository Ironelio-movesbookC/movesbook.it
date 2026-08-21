/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        news: {
          red: {
            DEFAULT: '#da1a03',
            start: '#da1a03',
            end: '#911700',
            border: '#a60300',
            hover: '#911700',
          },
          toolbox: {
            bg: '#880015',
            search: {
              bg: '#404040',
              text: '#dbdbdb',
            },
          },
          header: {
            bg: '#a51d2d',
          },
          social: {
            facebook: '#3b5998',
            twitter: '#00aced',
            linkedin: '#23659f',
            googleplus: '#d94c3b',
            pinterest: '#e94e5c',
            rssfeed: '#ff6600',
          },
        },
      },
    },
  },
  plugins: [],
};
