import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { handleFeedRequest, parseDuration, parseFeed } from '../api/_lib/feed.js';

const CHECKPOD = 'https://feeds.br.de/checkpod-der-podcast-mit-checker-tobi/feed.xml';
const xml = readFileSync(new URL('./fixtures/checkpod.xml', import.meta.url), 'utf8');

const okFetch = async () => new Response(xml, { status: 200 });

describe('parseFeed', () => {
  it('liefert Titel, Cover und Folgen, neueste zuerst', () => {
    const feed = parseFeed(xml);
    expect(feed.title).toBe('CheckPod - Der Podcast mit Checker Tobi');
    expect(feed.image).toBe('https://img.example.org/checkpod.jpg');
    expect(feed.episodes.map((e) => e.id)).toEqual(['ep-himmel', 'ep-vulkan']);
    expect(feed.episodes[0]).toEqual({
      id: 'ep-himmel',
      title: 'Warum ist der Himmel blau? & andere Fragen',
      date: '2026-10-10T03:00:00.000Z',
      duration: 1450,
      audioUrl: 'https://media.example.org/himmel.mp3',
      image: 'https://img.example.org/himmel.jpg',
    });
    expect(feed.episodes[1].image).toBe('https://img.example.org/checkpod.jpg');
  });

  it('verwirft Folgen ohne gültige http(s)-Audio-URL', () => {
    expect(parseFeed(xml).episodes.some((e) => e.id === 'ep-js' || e.id === 'ep-kaputt')).toBe(false);
  });

  it('wirft bei Nicht-RSS', () => {
    expect(() => parseFeed('<html><body>nope</body></html>')).toThrow();
  });

  it('parst Dauerangaben', () => {
    expect(parseDuration('1:02:03')).toBe(3723);
    expect(parseDuration('24:10')).toBe(1450);
    expect(parseDuration('90')).toBe(90);
    expect(parseDuration('abc')).toBeNull();
    expect(parseDuration('')).toBeNull();
  });
});

describe('handleFeedRequest', () => {
  it('lehnt fehlende URL ab', async () => {
    expect((await handleFeedRequest(null, okFetch)).status).toBe(400);
  });

  it('lehnt URLs außerhalb der Whitelist ab, ohne sie abzurufen', async () => {
    let called = false;
    const spy = async () => {
      called = true;
      return new Response(xml);
    };
    for (const url of ['https://evil.example.org/feed.xml', CHECKPOD + '?x=1', 'http://169.254.169.254/', 'file:///etc/passwd']) {
      const r = await handleFeedRequest(url, spy);
      expect(r.status).toBe(403);
    }
    expect(called).toBe(false);
  });

  it('liefert JSON mit Cache-Headern für den CheckPod-Feed', async () => {
    const r = await handleFeedRequest(CHECKPOD, okFetch);
    expect(r.status).toBe(200);
    expect(r.headers['Cache-Control']).toBe('public, s-maxage=3600, stale-while-revalidate=86400');
    expect(JSON.parse(r.body).episodes).toHaveLength(2);
  });

  it('meldet 502, wenn der Anbieter ausfällt', async () => {
    expect((await handleFeedRequest(CHECKPOD, async () => new Response('', { status: 404 }))).status).toBe(502);
    expect((await handleFeedRequest(CHECKPOD, async () => { throw new Error('dns'); })).status).toBe(502);
    expect((await handleFeedRequest(CHECKPOD, async () => new Response('<html/>'))).status).toBe(502);
  });
});
