import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],

  theme: {
    extend: {
      animation: {
        'spin-slow': 'spin 24s linear infinite',
      },
      screens: {
        'm': '220px',
      }
    }
  },

  plugins: []
} satisfies Config;
