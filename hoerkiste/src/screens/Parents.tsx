import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '../components/Icon';
import { LangToggle } from '../components/LangToggle';
import { FEEDS, feedName, fetchFeed, isFeedVisible, type FeedConfig } from '../lib/feeds';
import { lockParents, parentsUnlocked } from '../lib/gate';
import { resetAllProgress } from '../lib/progress';
import { navigate } from '../lib/router';
import { updateSettings, useSettings } from '../lib/settings';

type Check = { status: 'checking' } | { status: 'ok'; count: number } | { status: 'fail' };

export function Parents() {
  const { t, i18n } = useTranslation();
  const settings = useSettings();
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const [resetDone, setResetDone] = useState(false);
  const allowed = parentsUnlocked();

  useEffect(() => {
    if (!allowed) navigate({ name: 'home' }, true);
  }, [allowed]);

  const check = (f: FeedConfig, force: boolean) => {
    setChecks((c) => ({ ...c, [f.id]: { status: 'checking' } }));
    fetchFeed(f, force).then(
      (d) => setChecks((c) => ({ ...c, [f.id]: { status: 'ok', count: d.episodes.length } })),
      () => setChecks((c) => ({ ...c, [f.id]: { status: 'fail' } })),
    );
  };

  useEffect(() => {
    if (allowed) FEEDS.forEach((f) => check(f, false));
  }, [allowed]);

  if (!allowed) return null;

  const close = () => {
    lockParents();
    navigate({ name: 'home' }, true);
  };

  const toggleFeed = (f: FeedConfig, on: boolean) =>
    updateSettings({ feedVisibility: { ...settings.feedVisibility, [f.id]: on } });

  return (
    <main className="screen parents">
      <header className="topbar">
        <h1>{t('parents.title')}</h1>
        <button type="button" className="round-btn" aria-label={t('parents.close')} onClick={close}>
          <Icon name="close" size={32} />
        </button>
      </header>

      <section className="card">
        <h2>{t('parents.language')}</h2>
        <LangToggle big />
        <p className="note">{t('parents.languageNote')}</p>
      </section>

      <section className="card">
        <h2>{t('parents.feeds')}</h2>
        <p className="note">{t('parents.feedsNote')}</p>
        <ul className="feed-admin">
          {FEEDS.map((f) => {
            const c = checks[f.id];
            const name = feedName(f, i18n.language);
            return (
              <li key={f.id}>
                <span className="swatch" style={{ background: f.color }} aria-hidden="true" />
                <span className="feed-admin-body">
                  <strong>{name}</strong>
                  <span className="note">
                    {f.language.toUpperCase()}
                    {f.verified === false && <> · <em>{t('parents.unverified')}</em></>}
                    {c && <> · <span className={`status-${c.status}`}>{c.status === 'ok' ? t('parents.status.ok', { count: c.count }) : t(`parents.status.${c.status}`)}</span></>}
                  </span>
                </span>
                <button type="button" className="btn btn-small" onClick={() => check(f, true)}>
                  {t('parents.check')}
                </button>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={isFeedVisible(f, settings)}
                    onChange={(e) => toggleFeed(f, e.target.checked)}
                    aria-label={t('parents.show', { name })}
                  />
                  <span aria-hidden="true" />
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <h2>{t('parents.playback')}</h2>
        <label className="row-switch">
          <span>{t('parents.autoplay')}</span>
          <span className="switch">
            <input type="checkbox" checked={settings.autoplayNext} onChange={(e) => updateSettings({ autoplayNext: e.target.checked })} />
            <span aria-hidden="true" />
          </span>
        </label>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            if (window.confirm(t('parents.resetConfirm'))) {
              resetAllProgress();
              setResetDone(true);
            }
          }}
        >
          {t('parents.reset')}
        </button>
        {resetDone && <p className="note" role="status">{t('parents.resetDone')}</p>}
      </section>

      <section className="card">
        <h2>{t('parents.sources')}</h2>
        <p>{t('parents.sourcesText')}</p>
        <ul className="sources">
          {FEEDS.map((f) => (
            <li key={f.id}>
              {feedName(f, i18n.language)}: <code>{f.feedUrl}</code>
            </li>
          ))}
        </ul>
        <p className="note">{t('parents.version', { version: __APP_VERSION__ })}</p>
      </section>
    </main>
  );
}
