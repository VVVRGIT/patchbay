import { useTranslation } from 'react-i18next';
import { navigate } from '../lib/router';
import { usePlayer } from '../player/PlayerContext';
import { Icon } from './Icon';
import { Cover } from './States';

export function MiniPlayer() {
  const { t } = useTranslation();
  const p = usePlayer();
  if (!p.current) return null;
  const { episode, cover, color } = p.current;
  const pct = p.duration ? (p.time / p.duration) * 100 : 0;
  return (
    <aside className="mini" style={{ ['--feed' as string]: color }}>
      <span className="mini-progress" style={{ width: `${pct}%` }} />
      <button type="button" className="mini-open" aria-label={`${t('player.open')}: ${episode.title}`} onClick={() => navigate({ name: 'player' })}>
        <Cover src={episode.image ?? cover} color={color} size={64} />
        <span className="mini-title">{episode.title}</span>
      </button>
      <button type="button" className="mini-play" aria-label={p.playing ? t('player.pause') : t('player.play')} onClick={p.toggle}>
        <Icon name={p.playing ? 'pause' : 'play'} size={40} />
      </button>
    </aside>
  );
}
