# Patchbay

Offenes Protokoll, mit dem kleine Web-Kreativ-Tools Bilder, Vektoren, Animationen, Audio und Daten verlustfrei **samt kompletter Bearbeitungs- und Prompt-Historie** aneinander weitergeben. Diese Demo ist ein **Node-Editor**: Tools laufen in abgeschotteten Frames und werden als frei verschiebbare Nodes verkabelt. Neu gerechnet wird nur, was sich geändert hat (Cache über Inhalts-Hashes). Die Kette zur Ausgabe wird zur Historie im Paket.

Live: https://patchbay-pi.vercel.app · Status: Spezifikation v0.1, Arbeitstitel „Patchbay“.

## Bedienung

- **Deck:** Nodes am Kopf verschieben, leere Fläche mit der Maus ziehen, Strg/⌘ + Mausrad oder Pinch zum Zoomen, Klick auf die Prozentzahl passt alles ein.
- **Werkzeugleiste:** Neues Tool (eingebaute, eingebundene und Brücken-Tools, Tool per URL, Presets), Notiz, Stift (Esc beendet), **UI: Einheitlich / Original**, Zoom, Ausgabe-Panel.
- **Kabel** vom rechten zum linken Anschluss ziehen; ein Kabel antippen trennt es.
- Anordnung, Notizen, Striche und eingebundene Tools speichert der Browser (localStorage).

### UI-Modi

| Modus | Wer zeichnet die Oberfläche? | Wann sinnvoll |
| --- | --- | --- |
| Einheitlich | Der Host, allein aus dem Parameter-Schema | Ruhiges, einheitliches Deck; funktioniert mit jedem Tool |
| Original | Das Tool selbst, eingebettet im Node | Tools mit eigener Gestaltung oder Bedienelementen, die ein Schema nicht abbildet |

Rechnen, Kabel, Cache und Historie bleiben in beiden Modi beim Host. Tools ohne `embedded` im Manifest erscheinen immer einheitlich.

## Eigenes Tool einbinden

1. Manifest `patchbay.json` neben dein Tool legen und per CORS freigeben (`Access-Control-Allow-Origin: *`):

```json
{
  "patchbay": "0.1",
  "id": "com.example.invert",
  "name": "Invert",
  "version": "1.0.0",
  "description": "Farben umkehren",
  "entry": "./",
  "accepts": ["image/*"],
  "produces": ["image/png"],
  "modes": ["headless", "embedded"],
  "deterministic": true,
  "repro": "exact",
  "color": "#0E8C8C",
  "params": [
    { "id": "amount", "type": "number", "label": "Stärke", "min": 0, "max": 100, "default": 100 }
  ]
}
```

2. Auf der Tool-Seite das SDK laden und `render` liefern:

```html
<script src="https://patchbay-pi.vercel.app/sdk/patchbay.js"></script>
<script>
  fetch('patchbay.json').then(r => r.json()).then(manifest => {
    Patchbay.tool({
      manifest,
      render(input, params) {            // ImageData | null → ImageData
        const out = new ImageData(input.width, input.height), s = input.data, d = out.data, k = params.amount / 100;
        for (let i = 0; i < s.length; i += 4) {
          d[i] = s[i] + (255 - 2 * s[i]) * k; d[i+1] = s[i+1] + (255 - 2 * s[i+1]) * k; d[i+2] = s[i+2] + (255 - 2 * s[i+2]) * k; d[i+3] = s[i+3];
        }
        return out;
      },
      ui(pb) { /* optional: eigene Oberfläche, pb.setParams({...}), pb.onState(s => ...) */ }
    });
  });
</script>
```

3. Im Deck: **Neues Tool → Tool per URL einbinden** → Adresse des Manifests eintragen.

Parameter-Typen: `int`, `number`, `bool`, `enum` (mit `options`, optional `labels`), `color`, `string`, `prompt`, `seed`.
Beispiele mit eigener Gestaltung: [`tools/halbton`](tools/halbton) (live: `/tools/halbton/`) und [`tools/dsprsn`](tools/dsprsn) (live: `/tools/dsprsn/`, Effekt ursprünglich mit Brik erstellt und als reine, reproduzierbare `render`-Funktion portiert; Phase und Seed ersetzen Animation und Zufall).

### Web-Tools ohne Patchbay

Tools, die das Protokoll nicht sprechen (z. B. Jinero Image Flow), werden über einen **Brücken-Node** eingebunden: Eingangsbild kopieren, im Tool bearbeiten, Ergebnis per Ablegen, Einfügen oder Dateiauswahl zurückholen. Der Schritt landet als `repro: opaque` in der Historie.

## Struktur

| Pfad | Zweck |
| --- | --- |
| `index.html` | Host: Node-Editor, ohne Build-Schritt |
| `sdk/patchbay.js` | SDK für Tool-Macher (Modi headless, embedded, standalone) |
| `tools/halbton/` | Beispiel-Tool mit eigenem Look und Manifest |
| `registry.json` | Tool-Register (CORS offen) |
| `vercel.json` | Saubere URLs, CORS-Header für Manifeste und SDK |

## Sicherheit

Eingebundene Tools laufen in Sandbox-iframes. Der Host prüft bei jeder Verbindung die Herkunft (`origin`) gegen das Manifest und die gemeldete Tool-ID. Tools sehen weder das Deck noch andere Tools, nur die Pakete, die der Host ihnen gibt.

## Lizenz

MIT – siehe `LICENSE`.
