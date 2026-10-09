import { useSyncExternalStore } from 'react';
import { load, remove, save } from './storage';

export interface Progress {
  /** Position in Sekunden */
  t: number;
  /** Gesamtdauer in Sekunden (0 = unbekannt) */
  d: number;
  done: boolean;
}

export const HEARD_THRESHOLD = 0.95;

type Store = Record<string, Progress>;

let store: Store = load<Store>('progress', {});
const listeners = new Set<() => void>();

function emit() {
  save('progress', store);
  listeners.forEach((l) => l());
}

export function episodeKey(feedId: string, episodeId: string) {
  return `${feedId}::${episodeId}`;
}

export function getProgress(key: string): Progress | undefined {
  return store[key];
}

export function setProgress(key: string, t: number, d: number) {
  const prev = store[key];
  const done = (prev?.done ?? false) || (d > 0 && t / d >= HEARD_THRESHOLD);
  store = { ...store, [key]: { t, d, done } };
  emit();
}

export function markDone(key: string, d: number) {
  store = { ...store, [key]: { t: d, d, done: true } };
  emit();
}

export function resetAllProgress() {
  store = {};
  remove('progress');
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useProgressStore(): Store {
  return useSyncExternalStore(subscribe, () => store);
}
