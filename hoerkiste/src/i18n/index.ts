import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './de.json';
import es from './es.json';
import { load, save } from '../lib/storage';

export type Lang = 'de' | 'es';
export const LANGS: Lang[] = ['de', 'es'];

function initialLang(): Lang {
  const stored = load<string | null>('lang', null);
  if (stored === 'de' || stored === 'es') return stored;
  const browser = typeof navigator !== 'undefined' ? navigator.language || '' : '';
  return browser.toLowerCase().startsWith('es') ? 'es' : 'de';
}

void i18n.use(initReactI18next).init({
  resources: { de: { translation: de }, es: { translation: es } },
  lng: initialLang(),
  fallbackLng: 'de',
  interpolation: { escapeValue: false },
});

function applyLang(lng: string) {
  document.documentElement.lang = lng;
  document.title = i18n.t('app.name');
}
applyLang(i18n.language);
i18n.on('languageChanged', applyLang);

export function setLang(lang: Lang) {
  save('lang', lang);
  void i18n.changeLanguage(lang);
}

export default i18n;
