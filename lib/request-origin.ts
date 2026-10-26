// Next/Netlify can reconstruct request.url using an internal hostname.
// Browser Origin must match the external HTTP Host, not that internal URL.
export function sameOrigin(req: Request) {
  try {
    const origin = new URL(req.headers.get('origin') || '');
    if (origin.host.toLowerCase() !== req.headers.get('host')?.toLowerCase()) return false;
    return origin.protocol === 'https:' || (origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname));
  } catch { return false; }
}
