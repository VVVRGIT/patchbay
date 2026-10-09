import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';
import { Cover } from '../components/States';
import { moveInPlaylist, removeFromPlaylist, sameItem, usePlaylist, type QueueItem } from '../lib/playlist';
import { episodeKey, useProgressStore } from '../lib/progress';
import { goBack, navigate } from '../lib/router';
import { usePlayer } from '../player/PlayerContext';
import { progressPercent } from './EpisodeList';

export function Playlist() {
  const { t } = useTranslation();
  const items = usePlaylist();
  const progress = useProgressStore();
  const player = usePlayer();

  const playFrom = (item: QueueItem) => {
    player.start({ ...item, queue: items, source: 'playlist' });
    navigate({ name: 'player' });
  };

  // „Alle abspielen“ beginnt bei der ersten noch nicht gehörten Folge
  const firstOpen = items.find((i) => !progress[episodeKey(i.feedId, i.episode.id)]?.done) ?? items[0];

  return (
    <main className="screen list playlist" style={{ ['--feed' as string]: '#CDB4DB' }}>
      <header className="topbar list-head">
        <button type="button" className="round-btn" aria-label={t('list.back')} onClick={() => goBack({ name: 'home' })}>
          <Icon name="back" size={36} />
        </button>
        <h1>{t('playlist.title')}</h1>
        {firstOpen && (
          <button type="button" className="round-btn play-all" aria-label={t('playlist.playAll')} onClick={() => playFrom(firstOpen)}>
            <Icon name="play" size={40} />
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="empty empty-playlist">
          <span className="empty-icon" aria-hidden="true">
            <Icon name="listAdd" size={72} />
          </span>
          <p>{t('playlist.empty')}</p>
        </div>
      ) : (
        <ol className="episodes">
          {items.map((item, i) => {
            const p = progress[episodeKey(item.feedId, item.episode.id)];
            const pct = progressPercent(p, item.episode.duration);
            const isCurrent = !!player.current && sameItem(player.current, item);
            return (
              <li key={`${item.feedId}::${item.episode.id}`} className={`episode-row${p?.done ? ' done' : ''}${isCurrent ? ' current' : ''}`}>
                <button type="button" className="episode" onClick={() => playFrom(item)}>
                  <Cover src={item.episode.image ?? item.cover} color={item.color} />
                  <span className="episode-body">
                    <span className="episode-title">{item.episode.title}</span>
                    <span className="episode-meta">{item.feedName}</span>
                    <span className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={t('list.progress', { percent: pct })}>
                      <span style={{ width: `${pct}%` }} />
                    </span>
                  </span>
                  {p?.done && (
                    <span className="badge-done" title={t('list.heard')}>
                      <Icon name="check" size={30} />
                      <span className="sr-only">{t('list.heard')}</span>
                    </span>
                  )}
                </button>
                <div className="row-actions">
                  <button type="button" className="mini-btn" aria-label={t('playlist.up')} disabled={i === 0} onClick={() => moveInPlaylist(i, -1)}>
                    <Icon name="up" size={26} />
                  </button>
                  <button type="button" className="mini-btn" aria-label={t('playlist.remove')} onClick={() => removeFromPlaylist(item.feedId, item.episode.id)}>
                    <Icon name="close" size={24} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}
