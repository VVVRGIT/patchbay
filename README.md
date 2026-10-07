# Patchbay – Demo

Offenes Protokoll, mit dem kleine Web-Kreativ-Tools Bilder, Vektoren, Animationen, Audio und Daten verlustfrei **samt kompletter Bearbeitungs- und Prompt-Historie** aneinander weitergeben. Die Demo ist ein **Node-Editor**: vier Tools laufen in abgeschotteten Frames und werden als frei verschiebbare Nodes verkabelt. Regler kommen aus dem Parameter-Schema der Tools, neu gerechnet wird nur, was sich geändert hat (Cache über Inhalts-Hashes). Die Kette zur Ausgabe wird zur Historie im Paket.

**Bedienung**

- Deck: Nodes am Kopf verschieben, leere Fläche mit der Maus ziehen zum Verschieben, Strg/⌘ + Mausrad oder Pinch zum Zoomen, Klick auf die Prozentzahl passt alles ein.
- Werkzeugleiste unten: **Neues Tool** (Tools, Presets, Anordnen, Zurücksetzen), **Notiz** (Haftnotiz auf dem Deck), **Stift** (direkt aufs Deck zeichnen, Esc beendet), Zoom, **Ausgabe** (Panel rechts).
- Kabel vom rechten zum linken Anschluss ziehen; ein Kabel antippen trennt es.
- Überschrift und Text liegen als bearbeitbarer Text-Node auf dem Deck.
- Anordnung, Notizen und Striche werden im Browser gespeichert (localStorage).

Status: Spezifikation v0.1, Arbeitstitel „Patchbay“.

## Struktur

| Datei | Zweck |
| --- | --- |
| `index.html` | Komplette Demo, ohne Build-Schritt |
| `registry.json` | Tool-Register mit Manifesten (CORS offen, für Verzeichnisse und andere Hosts) |
| `vercel.json` | Saubere URLs, Header |

## Auf Vercel veröffentlichen

**Weg A – GitHub (empfohlen, Auto-Deploy bei jedem Push)**

1. Neues Repository auf GitHub anlegen, z. B. `patchbay`, öffentlich.
2. Inhalt dieses Ordners hochladen („Add file → Upload files“ reicht).
3. Auf [vercel.com/new](https://vercel.com/new) das Repository importieren.
4. Framework Preset: **Other**. Build Command und Output Directory leer lassen. **Deploy**.

**Weg B – Vercel CLI (ohne GitHub, ca. 2 Minuten)**

```bash
cd patchbay-site
npx vercel        # einmalig einloggen, Fragen mit Enter bestätigen
npx vercel --prod # Produktions-URL
```

Lokal testen: `npx serve .` und `http://localhost:3000` öffnen.

## Lizenz

MIT – siehe `LICENSE`.
