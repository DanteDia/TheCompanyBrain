import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        ink: {
          50:  '#f7f7f6',
          100: '#ededec',
          200: '#d9d8d5',
          300: '#b8b6b1',
          400: '#8e8a83',
          500: '#6f6b64',
          600: '#55524c',
          700: '#3d3b36',
          800: '#26241f',
          900: '#15140f',
        },
        accent: {
          DEFAULT: '#cc785c',
          dark:    '#a05a44',
          light:   '#e6a585',
        },
      },
      maxWidth: {
        'prose-wide': '72ch',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
export default config;
