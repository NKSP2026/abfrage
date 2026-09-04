# Einsatzabfrage – fertige GitHub + Firebase Version

## Fertig eingetragen
- Firebase Projekt: `abfrage-50be7`
- Realtime Database URL
- Firebase Web-App-Konfiguration
- Administrator-UID: `SrRHH7RgmDRXOCKcHy2mOQANrTk1`

## Dateien
- `index.html`
- `style.css`
- `app.js`
- `firebase-config.js`
- `database.rules.json`
- `README.md`

## WICHTIG – Firebase noch aktivieren
### Authentication
Unter Firebase -> Authentication -> Sign-in method aktivieren:
1. **Anonym** – für normale Nutzer ohne sichtbare Anmeldung.
2. **E-Mail/Passwort** – für die geschützte Verwaltung.

## Realtime Database Rules
Den vollständigen Inhalt von `database.rules.json` in:
Firebase -> Realtime Database -> Rules
einfügen und veröffentlichen.

## GitHub
Alle Dateien in dein Repository hochladen und GitHub Pages verwenden.

## Nutzung
- Seite öffnen -> keine Anmeldung.
- Kategorie auswählen -> Abfrage starten.
- Antworten -> Folgefragen und Auswertung.
- Abfrage -> bei aktivierter anonymer Authentication unter Firebase speichern.
- Verwaltung -> Anmeldung erforderlich.
- Nur die hinterlegte Administrator-UID darf Fragen und Regeln verändern.

## Hinweis
Die medizinischen Fragen, Notarztregeln und Einsatzmittelvorschläge sind technische Startdaten. Für reale Notrufdisposition müssen Inhalte und Regeln durch die zuständige Leitstelle bzw. fachlich verantwortliche Stelle geprüft und freigegeben werden.


## Fehlerbehebung Version 3
- Die Administratorprüfung verwendet jetzt direkt die UID aus der erfolgreichen Firebase-Anmeldung.
- Damit wird ein Timing-Fehler zwischen `signInWithEmailAndPassword()` und `onAuthStateChanged()` verhindert.
- Ein Fehler beim ersten Laden der Datenbankdaten wird nicht mehr fälschlich als vollständiger Firebase-Verbindungsfehler angezeigt.
- `app.js?v=3` sorgt dafür, dass GitHub Pages und der Browser die neue JavaScript-Datei laden.
