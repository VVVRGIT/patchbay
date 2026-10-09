import { describe, expect, it } from 'vitest';
import feeds from '../src/config/feeds.json';
import { isWhitelisted } from '../api/_lib/feed.js';
import { addToPlaylist, clearPlaylist, getPlaylist, moveInPlaylist, removeFromPlaylist } from '../src/lib/playlist.js';

describe('feeds.json', () => {
  it('hat eindeutige IDs, https-URLs, DE/ES-Sprache und Hex-Farben', () => {
    const ids = feeds.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const f of feeds) {
      expect(f.feedUrl.startsWith('https://'), f.id).toBe(true);
      expect(['de', 'es']).toContain(f.language);
      expect(f.color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(f.name.de && f.name.es).toBeTruthy();
      expect(isWhitelisted(f.feedUrl)).toBe(true);
    }
  });

  it('enthält deutsche und spanische Sendungen', () => {
    expect(feeds.filter((f) => f.language === 'de').length).toBeGreaterThanOrEqual(10);
    expect(feeds.filter((f) => f.language === 'es').length).toBeGreaterThanOrEqual(7);
  });
});

describe('Playlist', () => {
  const item = (feedId: string, id: string) => ({
    feedId,
    feedName: feedId,
    color: '#000000',
    cover: null,
    episode: { id, title: id, date: null, duration: 60, audioUrl: `https://x/${id}.mp3`, image: null },
  });

  it('fügt ohne Duplikate hinzu, sortiert um und entfernt', () => {
    clearPlaylist();
    addToPlaylist(item('a', '1'));
    addToPlaylist(item('b', '2'));
    addToPlaylist(item('a', '1'));
    expect(getPlaylist().map((i) => i.episode.id)).toEqual(['1', '2']);
    moveInPlaylist(1, -1);
    expect(getPlaylist().map((i) => i.episode.id)).toEqual(['2', '1']);
    moveInPlaylist(0, -1);
    expect(getPlaylist().map((i) => i.episode.id)).toEqual(['2', '1']);
    removeFromPlaylist('b', '2');
    expect(getPlaylist().map((i) => i.episode.id)).toEqual(['1']);
  });
});
