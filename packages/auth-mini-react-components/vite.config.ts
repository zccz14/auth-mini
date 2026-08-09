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
        '@base-ui/react/button',
        '@base-ui/react/dialog',
        'auth-mini/sdk/browser',
        'class-variance-authority',
        'clsx',
        'lucide-react',
        'react',
        'react-dom',
        'react-dom/client',
        'sonner',
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
