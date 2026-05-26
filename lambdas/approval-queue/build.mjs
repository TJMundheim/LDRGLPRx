import { build } from 'esbuild';
import { mkdirSync } from 'fs';

mkdirSync('dist', { recursive: true });

const common = {
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  external: ['@aws-sdk/*'],
};

await build({ ...common, entryPoints: ['src/dispatch-handler.ts'], outfile: 'dist/dispatch-handler.js' });
await build({ ...common, entryPoints: ['src/respond-handler.ts'],  outfile: 'dist/respond-handler.js'  });
console.log('Build complete.');
