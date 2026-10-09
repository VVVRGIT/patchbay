import { useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'feed'; feedId: string }
  | { name: 'player' }
  | { name: 'parents' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'sender' && parts[1]) return { name: 'feed', feedId: parts[1] };
  if (parts[0] === 'player') return { name: 'player' };
  if (parts[0] === 'eltern') return { name: 'parents' };
  return { name: 'home' };
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case 'feed':
      return `#/sender/${encodeURIComponent(route.feedId)}`;
    case 'player':
      return '#/player';
    case 'parents':
      return '#/eltern';
    default:
      return '#/';
  }
}

/** Wie viele Schritte die App selbst in den Verlauf gelegt hat */
let depth = 0;

export function navigate(route: Route, replace = false) {
  const href = hrefFor(route);
  if (replace) history.replaceState(null, '', href);
  else {
    history.pushState(null, '', href);
    depth++;
  }
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

/** Zurück innerhalb der App; ohne eigenen Verlauf (Direktaufruf) geht es zum Ziel. */
export function goBack(fallback: Route) {
  if (depth > 0) history.back();
  else navigate(fallback, true);
}

let snapshot = window.location.hash;

function subscribe(l: () => void) {
  const onHash = () => {
    snapshot = window.location.hash;
    l();
  };
  const onPop = () => {
    depth = Math.max(0, depth - 1);
    onHash();
  };
  window.addEventListener('hashchange', onHash);
  window.addEventListener('popstate', onPop);
  return () => {
    window.removeEventListener('hashchange', onHash);
    window.removeEventListener('popstate', onPop);
  };
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => snapshot);
  return parseHash(hash);
}
