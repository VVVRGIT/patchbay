# Hörkiste

Ein Podcast-Player für Kinder (ca. 5–10 Jahre) als installierbare Web-App (PWA). Kinder wählen einen Sender, starten eine Folge und pausieren sie, ohne lesen zu können. Es gibt keine Werbung, keine Empfehlungen, keine Suche und keine Konten, und nichts wird getrackt. Die Oberfläche lässt sich zwischen **Deutsch und Spanisch** umschalten. Die Sendungen bleiben dabei in ihrer Originalsprache.

**Stack:** Vite, React, TypeScript, `vite-plugin-pwa`, `react-i18next`, außerdem eine Vercel Serverless Function als RSS-Proxy (`fast-xml-parser`).

## Setup

```bash
cd hoerkiste
npm install
npm run dev          # http://localhost:5173, /api/feed läuft im Dev-Server mit
npm test             # Proxy-Tests (Parser, Whitelist, Fehlerfälle)
npm run build        # Typecheck + Produktions-Build nach dist/
npm run preview      # Build lokal ansehen, inkl. Service Worker und /api/feed
```

Ohne Internet: `HK_FIXTURES=1 npm run dev` liefert Testfeeds für CheckPod, Betthupferl und Cráneo aus `test/fixtures/` mit einem kurzen Testton als Audio. Alle anderen Feeds gelten dann als „nicht erreichbar“.

## Aufbau

| Pfad | Inhalt |
| --- | --- |
| `src/config/feeds.json` | Senderliste und zugleich die Whitelist des Proxys |
| `api/feed.ts` | Vercel Function `GET /api/feed?url=…` |
| `api/_lib/feed.ts` | Whitelist-Prüfung, Abruf (10 s Timeout, max. 15 MB), RSS → JSON |
| `src/i18n/de.json`, `es.json` | Alle UI-Texte |
| `src/player/PlayerContext.tsx` | Audio, Fortschritt, Media Session, Sleep-Timer |
| `src/screens/` | Startseite, Folgenliste, Player, Elternbereich |
| `scripts/make-icons.mjs` | Erzeugt die PWA-Icons in `public/icons/` (`npm run icons`) |

### Proxy

`/api/feed?url=<feedUrl>` liefert:

```json
{ "title": "…", "image": "…", "episodes": [{ "id": "…", "title": "…", "date": "ISO", "duration": 1450, "audioUrl": "…", "image": "…" }] }
```

- Der Proxy akzeptiert nur Feed-URLs, die **exakt** so in `feeds.json` stehen. Alle anderen URLs bekommen `403` und werden nicht abgerufen.
- Bei Erfolg setzt er `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.
- Ist ein Feed nicht erreichbar, kaputt oder leer, antwortet er mit `502` (kurz gecacht). Die App blendet den Sender dann aus.
- Das Audio wird direkt beim Anbieter gestreamt. Unser Server leitet es nicht weiter und speichert es nicht.

## Neue Feeds hinzufügen

Für einen neuen Feed trägst du in `src/config/feeds.json` einen Eintrag ein:

```json
{
  "id": "eindeutige-id",
  "name": { "de": "Name auf Deutsch", "es": "Nombre en español" },
  "feedUrl": "https://…/feed.xml",
  "color": "#8ECAE6",
  "language": "de",
  "verified": false
}
```

`language` (`de` oder `es`) steuert den Flaggen-Filter auf der Startseite.

1. Bei unsicherer Adresse den Eintrag mit `"verified": false` anlegen. Kinder sehen den Sender dann nicht.
2. Deployen, im **Elternbereich** auf „Testen“ tippen und prüfen, ob „erreichbar · N Folgen“ erscheint. Dann eine Folge probehören.
3. Passt alles, entweder dort den Schalter einschalten (gilt nur für dieses Gerät) oder `"verified": false` entfernen (gilt für alle).

`feedUrl` ist gleichzeitig der Whitelist-Eintrag. Ändert ein Anbieter die URL, muss sie hier angepasst werden.

### Stand der Senderliste

Insgesamt 26 Sender, 17 deutsche und 9 spanische. Keiner der Feeds wurde aus der Entwicklungsumgebung abgerufen, weil sie keine Feed-Hosts erreicht. Die Adressen stammen aus Podcast-Verzeichnissen (Podchaser, podcast.de, Podnews u. a.) und der Liste von mupibox.de.

| Status | Sender |
| --- | --- |
| Sichtbar (Adresse aus Verzeichnissen) | CheckPod, Betthupferl, Kakadu, Ohrenbär, Mikado, MausZoom, Gute Nacht mit der Maus, Figarinos Fahrradladen, Mikado Zeitreise, Eric erforscht, Lachlabor, Anna und die wilden Tiere, Mikado macht schlau · Cráneo, Camaleón, Buenas noches Cráneo, Sapiensantes, Contando cuentos, Cuentos Increíbles, Sueñacuentos |
| `verified: false` (Adresse geraten oder schwach) | Die Maus zum Hören, Kakadu Hörspiel, Había una vez, Cuentos infantiles |
| `verified: false` (mögliche Werbeeinblendungen über Megaphone/Podigee, erst anhören) | WAS IST WAS, Flipsi findet's raus |
| Nicht aufgenommen | WDR 5 Kinderhörspiel (keine Feed-Adresse gefunden), Wirklich wahr! (kein offener Feed), radioMikro, Do Re Mikro, Rikes Laberbuch, Krümel-Geschichten (Feed-Adresse nicht gefunden), ECHT?! (KI-Stimmen) |

Hinweise:
- Sender, deren Feed nicht lädt, blendet die Startseite automatisch aus.
- Mikado Zeitreise und Eric erforscht bekommen keine neuen Folgen mehr, das Archiv bleibt hörbar.
- Für Buenas noches, Cráneo gibt es eine zweite Adresse: `https://rss.buzzsprout.com/2635354.rss`.
- RTVE/RNE (Sapiensantes, Contando cuentos) blockiert seit 2025 manche fremden Player. Ob unsere App betroffen ist, zeigt nur ein Test.

## Deployment auf Vercel

Die App liegt im Unterordner `hoerkiste/` des Repos.

1. In Vercel **New Project** wählen und dieses Repo importieren.
2. **Root Directory:** `hoerkiste`. Als Framework wird Vite erkannt, Build: `npm run build`, Output: `dist`.
3. Deployen. `api/feed.ts` wird automatisch zur Serverless Function, `vercel.json` leitet alle übrigen Pfade auf die SPA um.

Es werden keine Umgebungsvariablen benötigt. Alternativ per CLI: `cd hoerkiste && npx vercel` (beim ersten Mal das Projekt verknüpfen).

## Bedienung

- **Startseite:** große Senderkacheln (2 Spalten am Phone, 3–4 am Tablet). Oben links sitzt der kleine Schalter für die Sprache der Oberfläche (💬 DE/ES), oben rechts das Zahnrad.
- **Filter der Sendungen:** 🌍 alle · 🇩🇪 deutsche · 🇪🇸 spanische · ♥ Lieblinge. Jede Kachel zeigt die Sprache der Sendung als Flagge. Der Filter bleibt gespeichert.
- **Herz:** Das Herz auf jeder Kachel markiert einen Lieblingssender. Lieblinge stehen immer vorn.
- **Playlist:** In der Folgenliste setzt ➕ eine Folge auf die eigene Playlist (Kachel „Meine Playlist“ auf der Startseite). Dort kann man Folgen nach oben schieben, entfernen und mit ▶ alles abspielen. Die Playlist läuft am Stück durch, auch über verschiedene Sender hinweg. Im Player erscheinen dann ⏮/⏭, auf dem Sperrbildschirm „Vor/Zurück“. „Alle abspielen“ beginnt bei der ersten noch nicht gehörten Folge. Höchstens 100 Folgen, gespeichert auf dem Gerät.
- **Folgenliste:** neueste Folge oben mit ★, gehörte Folgen mit ✓ und ausgegraut, Fortschrittsbalken pro Folge.
- **Player:** Play/Pause (128 px), ±15 s (88 px), Fortschrittsbalken mit großem Griff, 🌙-Sleep-Timer (15/30/45 min). Beim Zurücknavigieren bleibt ein Mini-Player am unteren Rand.
- **Elternbereich:** Zahnrad **2 s gedrückt halten** oder kurz antippen und die Rechenaufgabe lösen. Die Sperre gilt bis zum Schließen bzw. Neuladen. Dort gibt es den Sprachschalter, Sender ein- und ausblenden, Autoplay (Standard: aus), „Gehört-Status zurücksetzen“ und Infos zu den Datenquellen.

## Wiedergabe-Logik

- Der Fortschritt wird alle 5 s gespeichert, außerdem bei Pause, beim Spulen und beim Verlassen der Seite. Beim nächsten Öffnen geht es an derselben Stelle weiter.
- Ab 95 % gilt eine Folge als gehört. Eine gehörte Folge beginnt beim nächsten Start von vorn.
- Am Ende einer Folge startet keine weitere, außer Autoplay ist im Elternbereich eingeschaltet. Ausnahme ist die Playlist, die immer weiterspielt.
- Alle Daten (Sprache, Fortschritt, Filter, Lieblinge, Playlist, Einstellungen) liegen in `localStorage` unter `hk.*`. Jeder Zugriff ist mit try/catch abgesichert, sodass die App auch ohne Speicher läuft.
- Die Media Session API liefert Titel, Sender und Cover für den Sperrbildschirm. Play/Pause, ±15 s und Spulen funktionieren dort sowie über Kopfhörertasten und Bluetooth im Auto.
- Offline zeigt die App die zuletzt geladenen Folgenlisten und Cover aus dem Service-Worker-Cache. Audio wird nicht gecacht (Offline-Download kommt in Phase 2).

## Bekannte Einschränkungen (iOS und andere)

- **Hintergrund-Audio unter iOS:** In Safari und in der installierten PWA läuft Audio bei gesperrtem Bildschirm meist weiter. iOS kann eine Home-Screen-PWA im Hintergrund aber nach einiger Zeit beenden, besonders bei wenig Speicher. Dann muss man die App wieder öffnen. Der Fortschritt ist gespeichert. Sperrbildschirm-Steuerung gibt es ab iOS 15. Je nach iOS-Version zeigt der Sperrbildschirm „Vor/Zurück“ statt ±15 s.
- **Speicherlimits unter iOS:** Safari kann `localStorage` und Caches einer Website nach rund 7 Tagen ohne Nutzung löschen, wenn die App nicht installiert ist. Als Home-Screen-App ist das deutlich seltener.
- **Autoplay:** Der Browser erlaubt Audio erst nach einem Tippen. Das ist bei jedem Folgenstart gegeben.
- **Feeds können wegfallen:** Die ARD stellt RSS-Feeds nur auf Wunsch der Redaktion bereit. Ein Sender, dessen Feed nicht lädt, verschwindet automatisch von der Startseite. Neue CheckPod-Folgen erscheinen zuerst eine Woche exklusiv in ARD Sounds und kommen erst danach im Feed an.
- Das Verhalten auf echten iOS- und Android-Geräten (Sperrbildschirm, Bluetooth, Hintergrund) muss von Hand geprüft werden.
