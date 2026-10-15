import { signal } from '@preact/signals';
import { NOT_FOUND, ROUTES, type RouteDef } from './routes';

export interface ParsedHash {
  /** Normalised path, always starts with `/`, no trailing slash (except root). */
  path: string;
  segments: string[];
  query: Record<string, string>;
}

export interface RouteMatch {
  def: RouteDef;
  params: Record<string, string>;
  location: ParsedHash;
}

function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Parse `location.hash` ("#/learn?x=1") into path, segments and query. */
export function parseHash(hash: string): ParsedHash {
  let raw = hash.startsWith('#') ? hash.slice(1) : hash;
  const q = raw.indexOf('?');
  const queryString = q >= 0 ? raw.slice(q + 1) : '';
  raw = q >= 0 ? raw.slice(0, q) : raw;
  const segments = raw.split('/').filter(Boolean).map(safeDecode);
  const query: Record<string, string> = {};
  for (const [k, v] of new URLSearchParams(queryString)) query[k] = v;
  return { path: '/' + segments.map(encodeURIComponent).join('/'), segments, query };
}

/** Build a hash href like `#/report?screen=home`. Empty query values are dropped. */
export function hrefFor(path: string, query?: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v) params.set(k, v);
  const qs = params.toString();
  return `#${path.startsWith('/') ? path : '/' + path}${qs ? '?' + qs : ''}`;
}

/** Match a parsed location against the route table; unknown paths give Not Found. */
export function matchRoute(location: ParsedHash, routes: readonly RouteDef[] = ROUTES): RouteMatch {
  for (const def of routes) {
    const pattern = def.pattern.split('/').filter(Boolean);
    if (pattern.length !== location.segments.length) continue;
    const params: Record<string, string> = {};
    const ok = pattern.every((p, i) => {
      const seg = location.segments[i] as string;
      if (p.startsWith(':')) {
        params[p.slice(1)] = seg;
        return true;
      }
      return p === seg;
    });
    if (ok) return { def, params, location };
  }
  return { def: NOT_FOUND, params: {}, location };
}

const readLocation = (): ParsedHash => parseHash(typeof window === 'undefined' ? '' : window.location.hash);

/** Current location, updated on every hashchange once startRouter() ran. */
export const location$ = signal<ParsedHash>(readLocation());

/** Start listening for hash changes. Returns a stop function. */
export function startRouter(): () => void {
  const sync = () => {
    location$.value = readLocation();
  };
  sync();
  window.addEventListener('hashchange', sync);
  return () => window.removeEventListener('hashchange', sync);
}

export function navigate(path: string, query?: Record<string, string | undefined>): void {
  window.location.hash = hrefFor(path, query);
}
