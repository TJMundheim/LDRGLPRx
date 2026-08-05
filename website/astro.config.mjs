// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.my4mlife.com',
  output: 'static',
  trailingSlash: 'ignore',
  redirects: {
    '/products/cohort-workbook': '/products/logbook',
  },
  integrations: [sitemap()],
});
