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
      // /coaching is a draft (PUBLIC_SHOW_DRAFTS=1 only); keep it out of the sitemap otherwise.
      filter: (page) => process.env.PUBLIC_SHOW_DRAFTS === '1' || !/\/coaching\/?$/.test(page),
    }),
  ],
});
