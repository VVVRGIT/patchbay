import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';
import { FLAGS, LangToggle } from '../components/LangToggle';
import { ParentGateButton } from '../components/ParentGate';
import { Cover, ErrorState } from '../components/States';
import type { Lang } from '../i18n';
import { FEEDS, cachedFeed, feedName, fetchFeed, isFeedVisible, type FeedConfig, type FeedData } from '../lib/feeds';
import { usePlaylist } from '../lib/playlist';
import { navigate } from '../lib/router';
import { toggleFavorite, updateSettings, useSettings, type ShowFilter } from '../lib/settings';

type TileState = { status: 'loading' } | { status: 'error' } | { status: 'ok'; data: FeedData };

const FILTER_ICONS: Record<ShowFilter, ReactNode> = {
  all: <Icon name="globe" size={30} />,
  de: <span className="flag">{FLAGS.de}</span>,
  es: <span className="flag">{FLAGS.es}</span>,
  fav: <Icon name="heart" size={30} />,
};
const FILTER_LABELS: Record<ShowFilter, string> = { all: 'home.filterAll', de: 'home.filterDe', es: 'home.filterEs', fav: 'home.filterFav' };

export function Home() {
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const playlist = usePlaylist();
  const visible = useMemo(() => FEEDS.filter((f) => isFeedVisible(f, settings)), [settings.feedVisibility]);
  const [states, setStates] = useState<Record<string, TileState>>({});
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    setStates(
      Object.fromEntries(
        visible.map((f) => {
          const hit = attempt === 0 ? cachedFeed(f.id) : undefined;
          return [f.id, hit ? { status: 'ok', data: hit } : { status: 'loading' }];
        }),
      ),
    );
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

  const reachable = visible.filter((f) => states[f.id]?.status !== 'error');
  const allFailed = visible.length > 0 && reachable.length === 0;

  const filter = settings.showFilter;
  const favs = settings.favorites;
  const shown = reachable
    .filter((f) => (filter === 'all' ? true : filter === 'fav' ? favs.includes(f.id) : f.language === filter))
    // Lieblinge zuerst, sonst Reihenfolge aus feeds.json
    .sort((a, b) => Number(favs.includes(b.id)) - Number(favs.includes(a.id)));

  return (
    <main className="screen home">
      <header className="topbar">
        <LangToggle />
        <h1 className="sr-only">{t('home.title')}</h1>
        <ParentGateButton />
      </header>

      <div className="show-filter" role="radiogroup" aria-label={t('home.filter')}>
        {(['all', 'de', 'es', 'fav'] as ShowFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={filter === f}
            aria-label={t(FILTER_LABELS[f])}
            className={`filter-option filter-${f}`}
            onClick={() => updateSettings({ showFilter: f })}
          >
            {FILTER_ICONS[f]}
          </button>
        ))}
      </div>

      {allFailed ? (
        <ErrorState onRetry={() => setAttempt((n) => n + 1)} />
      ) : (
        <ul className="tiles">
          <li>
            <button type="button" className="tile tile-playlist" onClick={() => navigate({ name: 'playlist' })} aria-label={t('playlist.open', { count: playlist.length })}>
              <span className="cover playlist-cover">
                <Icon name="playlist" size={72} />
                {playlist.length > 0 && <span className="count-badge">{playlist.length}</span>}
              </span>
              <span className="tile-name">{t('playlist.title')}</span>
            </button>
          </li>
          {shown.map((f) => (
            <li key={f.id} className="tile-wrap">
              <Tile feed={f} state={states[f.id] ?? { status: 'loading' }} lang={i18n.language} fav={favs.includes(f.id)} />
            </li>
          ))}
        </ul>
      )}

      {!allFailed && filter === 'fav' && shown.length === 0 && (
        <p className="empty empty-fav">
          <Icon name="heartOutline" size={48} />
          <span>{t('home.noFav')}</span>
        </p>
      )}
      {!allFailed && visible.length === 0 && <p className="empty">{t('home.empty')}</p>}
    </main>
  );
}

function Tile({ feed, state, lang, fav }: { feed: FeedConfig; state: TileState; lang: string; fav: boolean }) {
  const { t } = useTranslation();
  const name = feedName(feed, lang);
  const showLang = feed.language === 'es' || feed.language === 'de' ? (feed.language as Lang) : null;
  if (state.status !== 'ok') {
    return (
      <div className="tile skeleton" style={{ background: feed.color }} aria-hidden="true">
        <span className="cover shimmer" />
        <span className="tile-name shimmer-text" />
      </div>
    );
  }
  return (
    <>
      <button type="button" className="tile" style={{ background: feed.color }} onClick={() => navigate({ name: 'feed', feedId: feed.id })}>
        <Cover src={state.data.image} color={feed.color} />
        <span className="tile-name">
          {showLang && (
            <span className="tile-flag" role="img" aria-label={t('home.showLang', { lang: t(showLang === 'de' ? 'lang.showDe' : 'lang.showEs') })}>
              {FLAGS[showLang]}
            </span>
          )}
          {name}
        </span>
      </button>
      <button
        type="button"
        className={fav ? 'heart on' : 'heart'}
        aria-pressed={fav}
        aria-label={t('home.favAdd', { name })}
        onClick={() => toggleFavorite(feed.id)}
      >
        <span className="heart-dot">
          <Icon name={fav ? 'heart' : 'heartOutline'} size={26} />
        </span>
      </button>
    </>
  );
}
