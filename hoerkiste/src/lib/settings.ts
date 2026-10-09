import { useSyncExternalStore } from 'react';
import { load, save } from './storage';

export interface Settings {
  /** Überschreibt die Sichtbarkeit pro Sender (Standard: verified !== false) */
  feedVisibility: Record<string, boolean>;
  autoplayNext: boolean;
}

let settings: Settings = {
  feedVisibility: load<Record<string, boolean>>('feedVisibility', {}),
  autoplayNext: load<boolean>('autoplayNext', false),
};
const listeners = new Set<() => void>();

export function updateSettings(patch: Partial<Settings>) {
  settings = { ...settings, ...patch };
  if (patch.feedVisibility) save('feedVisibility', settings.feedVisibility);
  if (patch.autoplayNext !== undefined) save('autoplayNext', settings.autoplayNext);
  listeners.forEach((l) => l());
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
