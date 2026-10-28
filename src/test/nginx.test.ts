import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * The nginx config the Docker image serves the app with: every page and file gets the security headers, caching is
 * right for a hashed bundle, and nothing private is served. nginx drops the server's add_header lines in a location
 * that sets its own, so headers are checked per location the way nginx applies them.
 */
const SNIPPETS: Record<string, string> = { '/etc/nginx/snippets/security-headers.conf': 'nginx-security-headers.conf' };
// Written by the build: the include stands for this header (none in this app)
const GENERATED: Record<string, string> = {};
const REQUIRED_HEADERS = [
  'X-Content-Type-Options',
  'X-Frame-Options',
  'Referrer-Policy',
  'Strict-Transport-Security',
  'Permissions-Policy',
  'Content-Security-Policy',
];
// Headers this app does not send yet, each a known, reported gap. A Content-Security-Policy needs the app's own policy
// (its two API origins, image hosts, PDF and spreadsheet downloads) checked in a browser before it is switched on.
const KNOWN_GAPS: string[] = ['Content-Security-Policy'];

const expand = (text: string): string =>
  text.replace(/include\s+(\S+);/g, (line, path: string) => {
    if (SNIPPETS[path]) return expand(readFileSync(SNIPPETS[path], 'utf8'));
    if (GENERATED[path]) return `add_header ${GENERATED[path]} "generated" always;`;
    return line;
  });

const withoutComments = (text: string) => text.replace(/#.*$/gm, '');
const conf = withoutComments(expand(readFileSync('nginx.conf', 'utf8')));

/** location blocks ("/assets/" -> body) and the server-level text outside them. */
const parse = () => {
  const locations = new Map<string, string>();
  let server = '';
  let i = 0;
  const re = /location\s+([^{]+)\{/g;
  for (let m = re.exec(conf); m; m = re.exec(conf)) {
    server += conf.slice(i, m.index);
    let depth = 1;
    let j = re.lastIndex;
    while (depth > 0) {
      if (conf[j] === '{') depth += 1;
      if (conf[j] === '}') depth -= 1;
      j += 1;
    }
    locations.set(m[1].trim(), conf.slice(re.lastIndex, j - 1));
    i = j;
    re.lastIndex = j;
  }
  return { server: server + conf.slice(i), locations };
};

const headersIn = (text: string) => [...text.matchAll(/add_header\s+([\w-]+)/g)].map((m) => m[1].toLowerCase());

const { server, locations } = parse();

/** The headers nginx sends from a location: its own add_header lines if it has any, else the server's. */
const effectiveHeaders = (location: string) => {
  const own = headersIn(locations.get(location) ?? '');
  return own.length ? own : headersIn(server);
};

describe('nginx', () => {
  it.each(['/', '/assets/', '= /index.html'])('serves %s with every security header', (location) => {
    expect(locations.has(location)).toBe(true);
    const sent = effectiveHeaders(location);
    const missing = REQUIRED_HEADERS.filter((h) => !KNOWN_GAPS.includes(h) && !sent.includes(h.toLowerCase()));
    expect(missing).toEqual([]);
  });

  it('does not reveal its version', () => {
    expect(server).toMatch(/server_tokens\s+off;/);
  });

  it('never serves dotfiles (.env, .git, ...)', () => {
    const dotfiles = [...locations].find(([path]) => path.startsWith('~') && path.includes('/\\.'));
    expect(dotfiles?.[1]).toMatch(/return\s+404|deny\s+all/);
  });

  it('never caches index.html, and caches the hashed bundle for good', () => {
    expect(locations.get('= /index.html')).toMatch(/Cache-Control\s+"no-cache, no-store, must-revalidate"/);
    expect(locations.get('/assets/')).toMatch(/Cache-Control\s+"public, immutable"/);
  });

  it('limits request bodies and compresses text', () => {
    expect(server).toMatch(/client_max_body_size\s+\d+[km]?;/);
    expect(server).toMatch(/gzip\s+on;/);
  });
});
