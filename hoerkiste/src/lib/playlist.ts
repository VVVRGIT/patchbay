import { useSyncExternalStore } from 'react';
import type { Episode } from './feeds';
import { load, save } from './storage';

/** Eine Folge samt Senderdaten, damit die Playlist ohne Feed-Abruf abspielbar ist */
export interface QueueItem {
  feedId: string;
  feedName: string;
  color: string;
  cover: string | null;
  episode: Episode;
}

const MAX_ITEMS = 100;

let items: QueueItem[] = sanitize(load<unknown>('playlist', []));
const listeners = new Set<() => void>();

function sanitize(v: unknown): QueueItem[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (x): x is QueueItem =>
      !!x && typeof x === 'object' && typeof x.feedId === 'string' && !!x.episode && typeof x.episode.audioUrl === 'string',
  );
}

function emit() {
  save('playlist', items);
  listeners.forEach((l) => l());
}

export function sameItem(a: { feedId: string; episode: { id: string } }, b: { feedId: string; episode: { id: string } }) {
  return a.feedId === b.feedId && a.episode.id === b.episode.id;
}

export function inPlaylist(feedId: string, episodeId: string) {
  return items.some((i) => i.feedId === feedId && i.episode.id === episodeId);
}

export function addToPlaylist(item: QueueItem) {
  if (items.some((i) => sameItem(i, item))) return;
  items = [...items, item].slice(-MAX_ITEMS);
  emit();
}

export function removeFromPlaylist(feedId: string, episodeId: string) {
  items = items.filter((i) => !(i.feedId === feedId && i.episode.id === episodeId));
  emit();
}

export function moveInPlaylist(index: number, delta: -1 | 1) {
  const to = index + delta;
  if (to < 0 || to >= items.length) return;
  const next = [...items];
  [next[index], next[to]] = [next[to], next[index]];
  items = next;
  emit();
}

export function clearPlaylist() {
  items = [];
  emit();
}

export function getPlaylist() {
  return items;
}

export function usePlaylist(): QueueItem[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => items,
  );
}
