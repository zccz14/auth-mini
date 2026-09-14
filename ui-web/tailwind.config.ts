import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    './node_modules/auth-mini-react-components/dist/**/*.js',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
} satisfies Config;
