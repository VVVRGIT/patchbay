import { useSyncExternalStore } from 'react';
import { load, save } from './storage';

/** Welche Sendungen die Startseite zeigt: alle, nach Sprache oder nur Favoriten */
export type ShowFilter = 'all' | 'de' | 'es' | 'fav';
export const SHOW_FILTERS: ShowFilter[] = ['all', 'de', 'es', 'fav'];

export interface Settings {
  /** Überschreibt die Sichtbarkeit pro Sender (Standard: verified !== false) */
  feedVisibility: Record<string, boolean>;
  autoplayNext: boolean;
  showFilter: ShowFilter;
  /** Sender-IDs mit Herz */
  favorites: string[];
}

const storedFilter = load<string>('showFilter', 'all');

let settings: Settings = {
  feedVisibility: load<Record<string, boolean>>('feedVisibility', {}),
  autoplayNext: load<boolean>('autoplayNext', false),
  showFilter: (SHOW_FILTERS as string[]).includes(storedFilter) ? (storedFilter as ShowFilter) : 'all',
  favorites: load<string[]>('favorites', []),
};
const listeners = new Set<() => void>();

export function updateSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  for (const key of Object.keys(patch) as (keyof Settings)[]) save(key, settings[key]);
  listeners.forEach((l) => l());
}

export function toggleFavorite(feedId: string) {
  const has = settings.favorites.includes(feedId);
  updateSettings({ favorites: has ? settings.favorites.filter((f) => f !== feedId) : [...settings.favorites, feedId] });
}

export function getSettings() {
  return settings;
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => settings,
  );
}
