import { useTranslation } from 'react-i18next';
import { LANGS, setLang, type Lang } from '../i18n';

const FLAGS: Record<Lang, string> = { de: '🇩🇪', es: '🇪🇸' };

export function LangToggle({ big = false }: { big?: boolean }) {
  const { t, i18n } = useTranslation();
  return (
    <div className={big ? 'lang-toggle lang-toggle-big' : 'lang-toggle'} role="radiogroup" aria-label={t('lang.switch')}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={i18n.language === l}
          lang={l}
          className="lang-option"
          onClick={() => setLang(l)}
        >
          <span className="flag" aria-hidden="true">
            {FLAGS[l]}
          </span>
          <span className={big ? '' : 'sr-only'}>{t(`lang.${l}`)}</span>
        </button>
      ))}
    </div>
  );
}
