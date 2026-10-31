import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Tests never read the real agreement: `agreement-md` resolves to a fixture.
export default defineConfig({
  resolve: { alias: { 'agreement-md': resolve(__dirname, 'src/fixtures/agreement.fixture.md') + '?raw' } },
});
