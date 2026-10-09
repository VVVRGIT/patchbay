import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Cover, ErrorState } from '../components/States';
import { LangToggle } from '../components/LangToggle';
import { ParentGateButton } from '../components/ParentGate';
import { FEEDS, feedName, fetchFeed, cachedFeed, isFeedVisible, type FeedConfig, type FeedData } from '../lib/feeds';
import { navigate } from '../lib/router';
import { useSettings } from '../lib/settings';

type TileState = { status: 'loading' } | { status: 'error' } | { status: 'ok'; data: FeedData };

export function Home() {
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const visible = useMemo(() => FEEDS.filter((f) => isFeedVisible(f, settings)), [settings]);
  const [states, setStates] = useState<Record<string, TileState>>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setStates(Object.fromEntries(visible.map((f) => {
      const hit = attempt === 0 ? cachedFeed(f.id) : undefined;
      return [f.id, hit ? { status: 'ok', data: hit } : { status: 'loading' }];
    })));
    for (const f of visible) {
      fetchFeed(f, attempt > 0).then(
        (data) => alive && setStates((s) => ({ ...s, [f.id]: { status: 'ok', data } })),
        () => alive && setStates((s) => ({ ...s, [f.id]: { status: 'error' } })),
      );
    }
    return () => {
      alive = false;
    };
  }, [visible, attempt]);

  const shown = visible.filter((f) => states[f.id]?.status !== 'error');
  const allFailed = visible.length > 0 && shown.length === 0;

  return (
    <main className="screen home">
      <header className="topbar">
        <LangToggle />
        <h1 className="sr-only">{t('home.title')}</h1>
        <ParentGateButton />
      </header>

      {allFailed ? (
        <ErrorState onRetry={() => setAttempt((n) => n + 1)} />
      ) : visible.length === 0 ? (
        <p className="empty">{t('home.empty')}</p>
      ) : (
        <ul className="tiles">
          {shown.map((f) => (
            <li key={f.id}>
              <Tile feed={f} state={states[f.id] ?? { status: 'loading' }} lang={i18n.language} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function Tile({ feed, state, lang }: { feed: FeedConfig; state: TileState; lang: string }) {
  const name = feedName(feed, lang);
  if (state.status !== 'ok') {
    return (
      <div className="tile skeleton" style={{ background: feed.color }} aria-hidden="true">
        <span className="cover shimmer" />
        <span className="tile-name shimmer-text" />
      </div>
    );
  }
  return (
    <button type="button" className="tile" style={{ background: feed.color }} onClick={() => navigate({ name: 'feed', feedId: feed.id })}>
      <Cover src={state.data.image} color={feed.color} />
      <span className="tile-name">{name}</span>
    </button>
  );
}
