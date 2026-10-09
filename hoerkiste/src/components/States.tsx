import { useTranslation } from 'react-i18next';
import { Icon } from './Icon';

export function ErrorState({ onRetry, message }: { onRetry: () => void; message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="error-state" role="alert">
      <span className="error-face">
        <Icon name="sad" size={88} />
      </span>
      <p>{message ?? t('error.title')}</p>
      <button type="button" className="btn btn-retry" onClick={onRetry}>
        <Icon name="retry" size={36} />
        <span>{t('error.retry')}</span>
      </button>
    </div>
  );
}

export function Cover({ src, color, size }: { src: string | null; color: string; size?: number }) {
  return (
    <span className="cover" style={{ background: color, width: size, height: size }}>
      {src ? <img src={src} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} /> : <Icon name="headphones" size={(size ?? 96) / 2} />}
    </span>
  );
}
