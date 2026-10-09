import { XMLParser } from 'fast-xml-parser';
import feeds from '../../src/config/feeds.json' with { type: 'json' };

export interface Episode {
  id: string;
  title: string;
  date: string | null;
  duration: number | null;
  audioUrl: string;
  image: string | null;
}

export interface FeedPayload {
  title: string;
  image: string | null;
  episodes: Episode[];
}

export interface ProxyResult {
  status: number;
  headers: Record<string, string>;
  body: string;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_EPISODES = 300;
const TIMEOUT_MS = 10_000;

const ALLOWED = new Set(feeds.map((f) => f.feedUrl));

export function isWhitelisted(url: string): boolean {
  return ALLOWED.has(url);
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  textNodeName: '#text',
  processEntities: true,
  htmlEntities: true,
  parseTagValue: false,
  trimValues: true,
  isArray: (name) => name === 'item',
});

function text(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === 'object' && '#text' in v) return text((v as Record<string, unknown>)['#text']);
  return '';
}

function httpUrl(v: unknown): string | null {
  const s = text(v);
  try {
    const u = new URL(s);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null;
  } catch {
    return null;
  }
}

function imageOf(node: Record<string, unknown> | undefined): string | null {
  if (!node) return null;
  const itunes = node['itunes:image'] as Record<string, unknown> | Record<string, unknown>[] | undefined;
  const first = Array.isArray(itunes) ? itunes[0] : itunes;
  if (first && typeof first === 'object' && '@href' in first) {
    const u = httpUrl(first['@href']);
    if (u) return u;
  }
  const img = node['image'] as Record<string, unknown> | undefined;
  if (img && typeof img === 'object') return httpUrl(img['url']);
  return null;
}

/** "1:02:03", "62:03", "3723" → seconds */
export function parseDuration(v: unknown): number | null {
  const s = text(v);
  if (!s) return null;
  const parts = s.split(':').map(Number);
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  const secs = parts.reduce((acc, n) => acc * 60 + n, 0);
  return secs > 0 ? Math.round(secs) : null;
}

export function parseFeed(xml: string): FeedPayload {
  const doc = parser.parse(xml) as Record<string, any>;
  const channel = doc?.rss?.channel;
  if (!channel || typeof channel !== 'object') throw new Error('not an RSS feed');

  const feedImage = imageOf(channel);
  const items: Record<string, unknown>[] = Array.isArray(channel.item) ? channel.item : [];

  const episodes: Episode[] = [];
  for (const item of items) {
    const enclosure = item['enclosure'] as Record<string, unknown> | Record<string, unknown>[] | undefined;
    const enc = Array.isArray(enclosure) ? enclosure[0] : enclosure;
    const audioUrl = enc ? httpUrl(enc['@url']) : null;
    if (!audioUrl) continue;

    const rawDate = text(item['pubDate']);
    const time = rawDate ? Date.parse(rawDate) : NaN;
    episodes.push({
      id: text(item['guid']) || audioUrl,
      title: text(item['title']) || text(item['itunes:title']),
      date: Number.isFinite(time) ? new Date(time).toISOString() : null,
      duration: parseDuration(item['itunes:duration']),
      audioUrl,
      image: imageOf(item) ?? feedImage,
    });
  }

  episodes.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  return {
    title: text(channel.title),
    image: feedImage,
    episodes: episodes.slice(0, MAX_EPISODES),
  };
}

function json(status: number, body: unknown, cache: string): ProxyResult {
  return {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache },
    body: JSON.stringify(body),
  };
}

async function readLimited(res: Response): Promise<string> {
  const len = Number(res.headers.get('content-length'));
  if (len > MAX_BYTES) throw new Error('feed too large');
  if (!res.body) return res.text();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      throw new Error('feed too large');
    }
    chunks.push(value);
  }
  return new TextDecoder('utf-8').decode(Buffer.concat(chunks));
}

export async function handleFeedRequest(url: string | null, fetchImpl: FetchLike = fetch): Promise<ProxyResult> {
  if (!url) return json(400, { error: 'missing_url' }, 'no-store');
  if (!isWhitelisted(url)) return json(403, { error: 'not_allowed' }, 'no-store');

  try {
    const res = await fetchImpl(url, {
      headers: { Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5', 'User-Agent': 'Hoerkiste/0.1 (+RSS proxy)' },
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return json(502, { error: 'upstream_status', status: res.status }, 's-maxage=60');
    const payload = parseFeed(await readLimited(res));
    if (payload.episodes.length === 0) return json(502, { error: 'no_episodes' }, 's-maxage=60');
    return json(200, payload, 'public, s-maxage=3600, stale-while-revalidate=86400');
  } catch {
    return json(502, { error: 'upstream_failed' }, 's-maxage=60');
  }
}
