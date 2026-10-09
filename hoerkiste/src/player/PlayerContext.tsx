import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Episode } from '../lib/feeds';
import { episodeKey, getProgress, markDone, setProgress } from '../lib/progress';
import { getSettings } from '../lib/settings';

export interface NowPlaying {
  feedId: string;
  feedName: string;
  color: string;
  cover: string | null;
  episode: Episode;
  /** Folgenliste in Anzeigereihenfolge, für optionales Autoplay */
  queue: Episode[];
}

interface PlayerState {
  current: NowPlaying | null;
  playing: boolean;
  loading: boolean;
  error: boolean;
  time: number;
  duration: number;
  sleepEndsAt: number | null;
}

interface PlayerApi extends PlayerState {
  start: (np: NowPlaying) => void;
  toggle: () => void;
  play: () => void;
  pause: () => void;
  skip: (delta: number) => void;
  seek: (t: number) => void;
  setSleep: (minutes: number | null) => void;
}

const Ctx = createContext<PlayerApi | null>(null);

export const SAVE_INTERVAL_MS = 5000;
export const SKIP_SECONDS = 15;

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  if (!audioRef.current && typeof Audio !== 'undefined') {
    const a = new Audio();
    a.preload = 'metadata';
    audioRef.current = a;
  }
  const audio = audioRef.current!;

  const [current, setCurrent] = useState<NowPlaying | null>(null);
  const currentRef = useRef<NowPlaying | null>(null);
  currentRef.current = current;

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [sleepEndsAt, setSleepEndsAt] = useState<number | null>(null);

  const persist = useCallback(() => {
    const np = currentRef.current;
    if (!np) return;
    const d = Number.isFinite(audio.duration) ? audio.duration : np.episode.duration ?? 0;
    if (audio.currentTime > 0) setProgress(episodeKey(np.feedId, np.episode.id), audio.currentTime, d);
  }, [audio]);

  const play = useCallback(() => {
    setError(false);
    audio.play().catch((e: unknown) => {
      // AbortError entsteht beim schnellen Wechsel der Quelle und ist harmlos
      if (!(e instanceof DOMException && e.name === 'AbortError')) setError(true);
    });
  }, [audio]);

  const pause = useCallback(() => audio.pause(), [audio]);

  const start = useCallback(
    (np: NowPlaying) => {
      const prev = currentRef.current;
      if (prev && prev.feedId === np.feedId && prev.episode.id === np.episode.id) {
        setCurrent(np);
        if (audio.paused) play();
        return;
      }
      persist();
      setCurrent(np);
      currentRef.current = np;
      setTime(0);
      setDuration(np.episode.duration ?? 0);
      setError(false);
      setLoading(true);
      audio.src = np.episode.audioUrl;
      const saved = getProgress(episodeKey(np.feedId, np.episode.id));
      const d = saved?.d || np.episode.duration || 0;
      // Weiter an derselben Stelle; fertig gehörte Folgen beginnen von vorn
      const resumeAt = saved && !saved.done && (!d || saved.t < d - 5) ? saved.t : 0;
      if (resumeAt > 0) {
        setTime(resumeAt);
        const onMeta = () => {
          audio.currentTime = resumeAt;
          audio.removeEventListener('loadedmetadata', onMeta);
        };
        audio.addEventListener('loadedmetadata', onMeta);
      }
      play();
    },
    [audio, persist, play],
  );

  const toggle = useCallback(() => (audio.paused ? play() : pause()), [audio, play, pause]);

  const seek = useCallback(
    (t: number) => {
      const max = Number.isFinite(audio.duration) ? audio.duration : duration;
      const clamped = Math.max(0, max ? Math.min(t, max) : t);
      audio.currentTime = clamped;
      setTime(clamped);
      persist();
    },
    [audio, duration, persist],
  );

  const skip = useCallback((delta: number) => seek(audio.currentTime + delta), [audio, seek]);

  // Audio-Events
  useEffect(() => {
    const onPlay = () => setPlaying(true);
    const onPause = () => {
      setPlaying(false);
      persist();
    };
    const onTime = () => setTime(audio.currentTime);
    const onDur = () => Number.isFinite(audio.duration) && setDuration(audio.duration);
    const onWaiting = () => setLoading(true);
    const onReady = () => setLoading(false);
    const onError = () => {
      setLoading(false);
      setPlaying(false);
      if (audio.src) setError(true);
    };
    const onEnded = () => {
      const np = currentRef.current;
      setPlaying(false);
      if (!np) return;
      markDone(episodeKey(np.feedId, np.episode.id), audio.duration || np.episode.duration || 0);
      if (getSettings().autoplayNext) {
        const idx = np.queue.findIndex((e) => e.id === np.episode.id);
        const next = idx >= 0 ? np.queue[idx + 1] : undefined;
        if (next) start({ ...np, episode: next });
      }
    };
    const events: [string, () => void][] = [
      ['play', onPlay],
      ['pause', onPause],
      ['timeupdate', onTime],
      ['durationchange', onDur],
      ['loadedmetadata', onDur],
      ['waiting', onWaiting],
      ['playing', onReady],
      ['canplay', onReady],
      ['error', onError],
      ['ended', onEnded],
    ];
    events.forEach(([n, f]) => audio.addEventListener(n, f));
    return () => events.forEach(([n, f]) => audio.removeEventListener(n, f));
  }, [audio, persist, start]);

  // Fortschritt alle 5 s und beim Verlassen der Seite sichern
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(persist, SAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [playing, persist]);

  useEffect(() => {
    const onHide = () => persist();
    window.addEventListener('pagehide', onHide);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [persist]);

  // Sleep-Timer
  const setSleep = useCallback((minutes: number | null) => {
    setSleepEndsAt(minutes ? Date.now() + minutes * 60_000 : null);
  }, []);

  useEffect(() => {
    if (!sleepEndsAt) return;
    const id = window.setTimeout(() => {
      audio.pause();
      setSleepEndsAt(null);
    }, Math.max(0, sleepEndsAt - Date.now()));
    return () => window.clearTimeout(id);
  }, [audio, sleepEndsAt]);

  // Media Session: Sperrbildschirm, Kopfhörertasten, Auto-Bluetooth
  useEffect(() => {
    if (!('mediaSession' in navigator) || !current) return;
    const art = current.episode.image ?? current.cover;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.episode.title,
      artist: current.feedName,
      album: current.feedName,
      artwork: art
        ? [96, 192, 512].map((s) => ({ src: art, sizes: `${s}x${s}` }))
        : [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
  }, [current]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const ms = navigator.mediaSession;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => play()],
      ['pause', () => pause()],
      ['stop', () => pause()],
      ['seekbackward', (d) => skip(-(d.seekOffset ?? SKIP_SECONDS))],
      ['seekforward', (d) => skip(d.seekOffset ?? SKIP_SECONDS)],
      ['seekto', (d) => d.seekTime != null && seek(d.seekTime)],
    ];
    for (const [action, h] of handlers) {
      try {
        ms.setActionHandler(action, h);
      } catch {
        /* Aktion vom Browser nicht unterstützt */
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          ms.setActionHandler(action, null);
        } catch {
          /* ignorieren */
        }
      }
    };
  }, [play, pause, skip, seek]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = current ? (playing ? 'playing' : 'paused') : 'none';
  }, [current, playing]);

  const lastPosUpdate = useRef(0);
  useEffect(() => {
    if (!('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) return;
    const now = Date.now();
    if (now - lastPosUpdate.current < 1000 && playing) return;
    lastPosUpdate.current = now;
    if (duration > 0 && time <= duration) {
      try {
        navigator.mediaSession.setPositionState({ duration, position: time, playbackRate: audio.playbackRate || 1 });
      } catch {
        /* ungültige Werte während des Ladens */
      }
    }
  }, [audio, time, duration, playing]);

  const value = useMemo<PlayerApi>(
    () => ({ current, playing, loading, error, time, duration, sleepEndsAt, start, toggle, play, pause, skip, seek, setSleep }),
    [current, playing, loading, error, time, duration, sleepEndsAt, start, toggle, play, pause, skip, seek, setSleep],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer(): PlayerApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('usePlayer outside PlayerProvider');
  return v;
}
