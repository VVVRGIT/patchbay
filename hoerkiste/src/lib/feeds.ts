import { useCallback, useEffect, useState } from 'react';
import feedsConfig from '../config/feeds.json';
import type { Settings } from './settings';

export interface FeedConfig {
  id: string;
  name: { de: string; es: string };
  feedUrl: string;
  color: string;
  language: string;
  verified?: boolean;
}

export interface Episode {
  id: string;
  title: string;
  date: string | null;
  duration: number | null;
  audioUrl: string;
  image: string | null;
}

export interface FeedData {
  title: string;
  image: string | null;
  episodes: Episode[];
}

export const FEEDS: FeedConfig[] = feedsConfig;

export function feedById(id: string): FeedConfig | undefined {
  return FEEDS.find((f) => f.id === id);
}

export function isFeedVisible(feed: FeedConfig, settings: Settings): boolean {
  return settings.feedVisibility[feed.id] ?? feed.verified !== false;
}

export function feedName(feed: FeedConfig, lang: string): string {
  return lang === 'es' ? feed.name.es : feed.name.de;
}

const cache = new Map<string, FeedData>();
const inflight = new Map<string, Promise<FeedData>>();

export function fetchFeed(feed: FeedConfig, force = false): Promise<FeedData> {
  if (!force) {
    const hit = cache.get(feed.id);
    if (hit) return Promise.resolve(hit);
    const running = inflight.get(feed.id);
    if (running) return running;
  }
  const p = fetch(`/api/feed?url=${encodeURIComponent(feed.feedUrl)}`)
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as FeedData;
      if (!Array.isArray(data.episodes) || data.episodes.length === 0) throw new Error('empty');
      cache.set(feed.id, data);
      return data;
    })
    .finally(() => inflight.delete(feed.id));
  inflight.set(feed.id, p);
  return p;
}

export function cachedFeed(id: string): FeedData | undefined {
  return cache.get(id);
}

export type FeedState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ok'; data: FeedData };

export function useFeed(feed: FeedConfig | undefined): [FeedState, () => void] {
  const [state, setState] = useState<FeedState>(() => {
    const hit = feed && cache.get(feed.id);
    return hit ? { status: 'ok', data: hit } : { status: 'loading' };
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!feed) {
      setState({ status: 'error' });
      return;
    }
    let alive = true;
    if (!cache.has(feed.id) || attempt > 0) setState({ status: 'loading' });
    fetchFeed(feed, attempt > 0).then(
      (data) => alive && setState({ status: 'ok', data }),
      () => alive && setState({ status: 'error' }),
    );
    return () => {
      alive = false;
    };
  }, [feed, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return [state, retry];
}
