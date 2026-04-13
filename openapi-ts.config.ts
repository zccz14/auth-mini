import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './openapi.yaml',
  output: './src/generated/api',
  plugins: [
    '@hey-api/client-fetch',
    {
      name: '@hey-api/sdk',
      auth: true,
      operations: {
        strategy: 'flat',
      },
    },
  ],
});
