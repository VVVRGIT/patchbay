import { useTranslation } from 'react-i18next';
import { LANGS, setLang, type Lang } from '../i18n';
import { Icon } from './Icon';

export const FLAGS: Record<Lang, string> = { de: '🇩🇪', es: '🇪🇸' };

/**
 * Sprache der Oberfläche. Groß (Elternbereich) mit Flaggen und Namen; klein (Startseite)
 * mit Sprechblase und Kürzel, damit es nicht mit dem Flaggen-Filter der Sendungen verwechselt wird.
 */
export function LangToggle({ big = false }: { big?: boolean }) {
  const { t, i18n } = useTranslation();
  return (
    <div className={big ? 'lang-toggle lang-toggle-big' : 'lang-toggle'} role="radiogroup" aria-label={t('lang.switch')}>
      {!big && (
        <span className="lang-icon" aria-hidden="true">
          <Icon name="speech" size={24} />
        </span>
      )}
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={i18n.language === l}
          aria-label={t(`lang.${l}`)}
          lang={l}
          className="lang-option"
          onClick={() => setLang(l)}
        >
          {big ? (
            <>
              <span className="flag" aria-hidden="true">
                {FLAGS[l]}
              </span>
              <span>{t(`lang.${l}`)}</span>
            </>
          ) : (
            <span className="lang-code" aria-hidden="true">
              {l.toUpperCase()}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
