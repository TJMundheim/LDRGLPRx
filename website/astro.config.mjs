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
  integrations: [
    sitemap({
      // Unlinked direct-buy questionnaires stay out of search (audit 2026-11-01).
      filter: (page) => !/\/rx\/[^/]+\/questionnaire\/?$/.test(page),
    }),
  ],
});
