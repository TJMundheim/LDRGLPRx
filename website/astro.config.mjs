// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SHOW_PULLUP, SHOW_HERITAGE } from './src/lib/siteMode.ts';

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
      // /pullup is hidden (redirects) while SHOW_PULLUP is false (see src/lib/siteMode.ts).
      filter: (page) =>
        !/\/reorder\/?$/.test(page) &&
        !/\/rx\/[^/]+\/questionnaire\/?$/.test(page) && (SHOW_PULLUP || !/\/pullup\/?$/.test(page)) &&
        (SHOW_HERITAGE || !/\/heritage\/?$/.test(page)),
    }),
  ],
});
