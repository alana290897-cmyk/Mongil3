import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  serverExternalPackages: ['sql.js', '@netlify/blobs'],
  outputFileTracingIncludes: { '/*': ['./node_modules/sql.js/dist/sql-wasm.wasm', './export-data/restore-new-database.sql'] },
};
export default nextConfig;
