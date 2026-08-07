import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
      cssFileName: 'styles',
    },
    rollupOptions: {
      external: [
        '@base-ui/react/dialog',
        'auth-mini/sdk/browser',
        'react',
        'react-dom',
        'react-dom/client',
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
