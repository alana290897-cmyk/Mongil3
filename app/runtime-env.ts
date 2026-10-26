import { database } from '../lib/netlify-database';
export const env = {
  DB: database,
  get FB_PAGE_ID() { return process.env.FB_PAGE_ID; },
  get FB_PAGE_ACCESS_TOKEN() { return process.env.FB_PAGE_ACCESS_TOKEN; },
  BOOTSTRAP_ADMIN: 'false',
};
