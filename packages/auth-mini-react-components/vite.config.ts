import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [
        'auth-mini/sdk/browser',
        'class-variance-authority',
        'clsx',
        'lucide-react',
        'radix-ui',
        'react',
        'react-dom',
        'react-dom/client',
        'tailwind-merge',
      ],
      output: {
        banner: "'use client';",
      },
    },
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'https://app.example.test/',
      },
    },
    setupFiles: ['tests/setup.ts'],
  },
});
