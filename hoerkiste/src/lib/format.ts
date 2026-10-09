export function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const s = Math.floor(sec % 60);
  const m = Math.floor((sec / 60) % 60);
  const h = Math.floor(sec / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

const dateFormats = new Map<string, Intl.DateTimeFormat>();

export function formatDate(iso: string | null, lang: string): string {
  if (!iso) return '';
  let f = dateFormats.get(lang);
  if (!f) {
    f = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric' });
    dateFormats.set(lang, f);
  }
  return f.format(new Date(iso));
}
