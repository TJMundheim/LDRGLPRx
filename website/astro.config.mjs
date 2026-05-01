// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://my4mlife.com',
  output: 'static',
  trailingSlash: 'ignore',
  integrations: [sitemap()],
});
