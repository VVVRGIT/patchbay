import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon, SkipIcon } from '../components/Icon';
import { Cover, ErrorState } from '../components/States';
import { formatClock } from '../lib/format';
import { goBack, navigate } from '../lib/router';
import { SKIP_SECONDS, usePlayer } from '../player/PlayerContext';

const SLEEP_OPTIONS = [15, 30, 45];

export function PlayerScreen() {
  const { t } = useTranslation();
  const p = usePlayer();
  const [drag, setDrag] = useState<number | null>(null);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!p.current) navigate({ name: 'home' }, true);
  }, [p.current]);

  // Restzeit des Sleep-Timers jede Minute aktualisieren
  useEffect(() => {
    if (!p.sleepEndsAt) return;
    const id = window.setInterval(() => tick((n) => n + 1), 15_000);
    return () => window.clearInterval(id);
  }, [p.sleepEndsAt]);

  if (!p.current) return null;
  const { episode, color, cover, feedId } = p.current;
  const shown = drag ?? p.time;
  const max = p.duration || episode.duration || 0;
  const commit = () => {
    if (drag != null) p.seek(drag);
    setDrag(null);
  };
  const sleepLeft = p.sleepEndsAt ? Math.max(1, Math.ceil((p.sleepEndsAt - Date.now()) / 60_000)) : 0;

  return (
    <main className="screen player" style={{ ['--feed' as string]: color }}>
      <header className="topbar">
        <button type="button" className="round-btn" aria-label={t('player.close')} onClick={() => goBack({ name: 'feed', feedId })}>
          <Icon name="down" size={36} />
        </button>
        <button
          type="button"
          className={p.sleepEndsAt ? 'round-btn sleep active' : 'round-btn sleep'}
          aria-label={p.sleepEndsAt ? `${t('player.sleep')}: ${t('player.sleepIn', { count: sleepLeft })}` : t('player.sleep')}
          aria-expanded={sleepOpen}
          onClick={() => setSleepOpen((o) => !o)}
        >
          <Icon name="moon" size={30} />
          {p.sleepEndsAt ? <span className="sleep-left" aria-hidden="true">{sleepLeft}</span> : null}
        </button>
      </header>

      {sleepOpen && (
        <div className="sleep-menu" role="group" aria-label={t('player.sleep')}>
          {SLEEP_OPTIONS.map((m) => (
            <button key={m} type="button" className="chip" onClick={() => { p.setSleep(m); setSleepOpen(false); }}>
              <Icon name="moon" size={22} /> {m}
            </button>
          ))}
          <button type="button" className="chip" onClick={() => { p.setSleep(null); setSleepOpen(false); }}>
            {t('player.sleepOff')}
          </button>
        </div>
      )}

      <div className="player-body">
        <div className="player-cover">
          <Cover src={episode.image ?? cover} color={color} />
        </div>

        <div className="player-controls">
          <h1 className="player-title">{episode.title}</h1>

          {p.error ? (
            <ErrorState message={t('error.audio')} onRetry={p.play} />
          ) : (
            <>
              <div className="seek">
                <input
                  type="range"
                  min={0}
                  max={max || 1}
                  step={1}
                  value={Math.min(shown, max || 1)}
                  disabled={!max}
                  aria-label={t('player.seek')}
                  aria-valuetext={`${formatClock(shown)} / ${formatClock(max)}`}
                  style={{ ['--pct' as string]: `${max ? (shown / max) * 100 : 0}%` }}
                  onChange={(e) => setDrag(Number(e.target.value))}
                  onPointerUp={commit}
                  onKeyUp={commit}
                  onBlur={commit}
                />
                <div className="seek-times" aria-hidden="true">
                  <span>{formatClock(shown)}</span>
                  <span>{formatClock(max)}</span>
                </div>
              </div>

              <div className="transport">
                <button type="button" className="skip-btn" aria-label={t('player.back15')} onClick={() => p.skip(-SKIP_SECONDS)}>
                  <SkipIcon dir={-1} />
                </button>
                <button
                  type="button"
                  className={p.loading && p.playing ? 'play-btn loading' : 'play-btn'}
                  aria-label={p.playing ? t('player.pause') : t('player.play')}
                  onClick={p.toggle}
                >
                  <Icon name={p.playing ? 'pause' : 'play'} size={64} />
                </button>
                <button type="button" className="skip-btn" aria-label={t('player.forward15')} onClick={() => p.skip(SKIP_SECONDS)}>
                  <SkipIcon dir={1} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
