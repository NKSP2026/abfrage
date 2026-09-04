# Einsatzabfrage mit GitHub + Firebase Realtime Database

## 1. Firebase Web-App konfigurieren
Firebase -> Zahnrad -> Projekteinstellungen -> Deine Apps -> Web-App.

Die komplette Web-Konfiguration in `firebase-config.js` eintragen.

Die Datenbank-URL ist bereits gesetzt:
`https://abfrage-50be7-default-rtdb.firebaseio.com`

## 2. Anmeldung aktivieren
Firebase -> Authentication -> Sign-in method -> E-Mail/Passwort aktivieren.
Unter Users einen Benutzer für dich erstellen.

Kopiere dessen UID nach:
- `firebase-config.js` bei `ADMIN_UID`
- `database.rules.json` an allen Stellen mit `HIER_DEINE_ADMIN_UID_EINFUEGEN`

## 3. Datenbankregeln
Firebase -> Realtime Database -> Rules.
Den Inhalt von `database.rules.json` einfügen, vorher die UID ersetzen.

## 4. GitHub
Diese Dateien in dein Repository hochladen:
- index.html
- style.css
- app.js
- firebase-config.js

Repository -> Settings -> Pages -> Deploy from branch -> main -> /(root).

## 5. Erste Daten
Auf der Webseite als Administrator anmelden.
Dann erscheint die Verwaltung.
Auf `Grunddaten in Firebase schreiben` klicken.

Danach werden Fragen, Notarztregeln, Einsatzmittelregeln und Vorschläge aus der Realtime Database geladen.

## Datenstruktur
/catalog/<Kategorie>/questions/<Frage-ID>
/notarzt_rules/<Regel-ID>
/resource_rules/<Regel-ID>
/suggestions/<Gruppe>/<ID>
/call_history/<UID>/<Abfrage-ID>

Wichtig: Die mitgelieferten medizinischen und taktischen Regeln sind technische Startbeispiele und kein vollständiger oder verbindlicher Leitstellen-/Notarztindikationskatalog. Vor realem Einsatz müssen sie durch die zuständigen fachlichen Stellen validiert werden.
