import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';
import { Cover, ErrorState } from '../components/States';
import { feedById, feedName, useFeed, type Episode, type FeedConfig, type FeedData } from '../lib/feeds';
import { formatDate } from '../lib/format';
import { addToPlaylist, removeFromPlaylist, usePlaylist, type QueueItem } from '../lib/playlist';
import { episodeKey, useProgressStore, type Progress } from '../lib/progress';
import { goBack, navigate } from '../lib/router';
import { usePlayer } from '../player/PlayerContext';

export function toQueueItem(f: FeedConfig, data: FeedData, ep: Episode, lang: string): QueueItem {
  return { feedId: f.id, feedName: feedName(f, lang), color: f.color, cover: data.image, episode: ep };
}

export function progressPercent(p: Progress | undefined, duration: number | null): number {
  const d = p?.d || duration || 0;
  if (p?.done) return 100;
  return d ? Math.min(100, Math.round(((p?.t ?? 0) / d) * 100)) : 0;
}

export function EpisodeList({ feedId }: { feedId: string }) {
  const { t, i18n } = useTranslation();
  const feed = feedById(feedId);
  const [state, retry] = useFeed(feed);
  const progress = useProgressStore();
  const playlist = usePlaylist();
  const player = usePlayer();

  const open = (f: FeedConfig, data: FeedData, ep: Episode) => {
    player.start({
      ...toQueueItem(f, data, ep, i18n.language),
      queue: data.episodes.map((e) => toQueueItem(f, data, e, i18n.language)),
      source: 'feed',
    });
    navigate({ name: 'player' });
  };

  return (
    <main className="screen list" style={{ ['--feed' as string]: feed?.color ?? '#FFB703' }}>
      <header className="topbar list-head">
        <button type="button" className="round-btn" aria-label={t('list.back')} onClick={() => goBack({ name: 'home' })}>
          <Icon name="back" size={36} />
        </button>
        <h1>{feed ? feedName(feed, i18n.language) : ''}</h1>
      </header>

      {state.status === 'loading' && (
        <ul className="episodes" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="episode skeleton" aria-hidden="true">
              <span className="cover shimmer" />
              <span className="shimmer-text" />
            </li>
          ))}
        </ul>
      )}

      {state.status === 'error' && <ErrorState onRetry={retry} />}

      {state.status === 'ok' && feed && (
        <ul className="episodes">
          {state.data.episodes.map((ep, i) => {
            const p = progress[episodeKey(feed.id, ep.id)];
            const pct = progressPercent(p, ep.duration);
            const isCurrent = player.current?.feedId === feed.id && player.current.episode.id === ep.id;
            const listed = playlist.some((x) => x.feedId === feed.id && x.episode.id === ep.id);
            return (
              <li key={ep.id} className={`episode-row${p?.done ? ' done' : ''}${isCurrent ? ' current' : ''}`}>
                <button type="button" className="episode" onClick={() => open(feed, state.data, ep)}>
                  <Cover src={ep.image ?? state.data.image} color={feed.color} />
                  <span className="episode-body">
                    <span className="episode-title">{ep.title}</span>
                    <span className="episode-meta">
                      {formatDate(ep.date, i18n.language)}
                      {ep.duration ? ` · ${t('list.minutes', { count: Math.max(1, Math.round(ep.duration / 60)) })}` : ''}
                    </span>
                    <span className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t('list.progress', { percent: pct })}>
                      <span style={{ width: `${pct}%` }} />
                    </span>
                  </span>
                  {i === 0 && !p?.done && (
                    <span className="badge-new" title={t('list.new')}>
                      <Icon name="star" size={30} />
                      <span className="sr-only">{t('list.new')}</span>
                    </span>
                  )}
                  {p?.done && (
                    <span className="badge-done" title={t('list.heard')}>
                      <Icon name="check" size={30} />
                      <span className="sr-only">{t('list.heard')}</span>
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className={listed ? 'add-btn on' : 'add-btn'}
                  aria-pressed={listed}
                  aria-label={listed ? t('playlist.remove') : t('playlist.add')}
                  onClick={() =>
                    listed ? removeFromPlaylist(feed.id, ep.id) : addToPlaylist(toQueueItem(feed, state.data, ep, i18n.language))
                  }
                >
                  <Icon name={listed ? 'listCheck' : 'listAdd'} size={32} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
