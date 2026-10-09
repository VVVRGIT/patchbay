import { readFileSync } from 'node:fs';
import type { ServerResponse } from 'node:http';

const xml = readFileSync(new URL('./fixtures/checkpod.xml', import.meta.url), 'utf8');

/** Feeds, die im Fixture-Modus antworten (Varianten des CheckPod-Fixtures); alle anderen sind „nicht erreichbar“. */
const FIXTURE_FEEDS: Record<string, (x: string) => string> = {
  'https://feeds.br.de/checkpod-der-podcast-mit-checker-tobi/feed.xml': (x) => x,
  'https://feeds.br.de/betthupferl/feed.xml': (x) =>
    x.replace('CheckPod - Der Podcast mit Checker Tobi', 'Betthupferl').replace('Wie funktioniert ein Vulkan?', 'Der kleine Mond').replace('Warum ist der Himmel blau? &amp; andere Fragen', 'Bubu und der Regen').replaceAll('ep-', 'bh-'),
  'https://anchor.fm/s/e6f41280/podcast/rss': (x) =>
    x.replace('CheckPod - Der Podcast mit Checker Tobi', 'Cráneo').replace('Wie funktioniert ein Vulkan?', '¿Por qué tienen manchas los jaguares?').replace('Warum ist der Himmel blau? &amp; andere Fragen', '¿Cómo es un copo de nieve?').replaceAll('ep-', 'cr-').replaceAll('himmel', 'nieve'),
};

export function fixtureFetch(origin: string) {
  return async (url: string) => {
    const variant = FIXTURE_FEEDS[url];
    if (!variant) throw new Error('offline (fixture)');
    const body = variant(xml)
      .replaceAll('https://media.example.org/', `${origin}/__fixtures/`)
      .replaceAll('https://img.example.org/', `${origin}/__fixtures/`)
      .replace(/\.mp3"/g, '.wav"')
      .replace(/\.jpg"/g, '.svg"')
      .replace(/\.jpg</g, '.svg<');
    return new Response(body, { status: 200 });
  };
}

/** 30 s leiser Ton als WAV, damit Abspielen im Test echt läuft. */
function tone(seconds = 30, rate = 8000): Buffer {
  const n = seconds * rate;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((i / rate) * 2 * Math.PI * 440) * 800), 44 + i * 2);
  return buf;
}

const WAV = tone();

export function serveFixture(path: string, res: ServerResponse, range?: string) {
  if (path.endsWith('.wav')) {
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Accept-Ranges', 'bytes');
    const m = range && /bytes=(\d+)-(\d*)/.exec(range);
    if (m) {
      const start = Number(m[1]);
      const end = m[2] ? Math.min(Number(m[2]), WAV.length - 1) : WAV.length - 1;
      res.statusCode = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${WAV.length}`);
      res.end(WAV.subarray(start, end + 1));
      return;
    }
    res.end(WAV);
    return;
  }
  const hue = path.includes('himmel') ? '#219EBC' : '#FB8500';
  res.setHeader('Content-Type', 'image/svg+xml');
  res.end(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="${hue}"/><circle cx="50" cy="50" r="28" fill="#fff"/></svg>`);
}
