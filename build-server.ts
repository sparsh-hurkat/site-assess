import esbuild from 'esbuild';

async function build() {
  try {
    await esbuild.build({
      entryPoints: ['server.ts'],
      bundle: true,
      platform: 'node',
      target: 'node20',
      outfile: 'dist/server.js',
      format: 'esm',
      external: [
        'express',
        'vite',
        'axios',
        'cheerio',
        'dotenv',
        'path',
        'url',
        'fs'
      ],
      banner: {
        js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);",
      },
      logLevel: 'info',
    });
    console.log('Server build complete.');
  } catch (err) {
    console.error('Server build failed:', err);
    process.exit(1);
  }
}

build();
