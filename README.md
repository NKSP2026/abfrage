# Einsatzabfrage – GitHub + Firebase

## Dateien
- `index.html` – Startseite mit Brand, Medizin, VU, ABC, THL usw.
- `style.css` – Darstellung
- `app.js` – Abfrage, Folgefragen, Auswertung und Firebase
- `firebase-config.js` – Firebase-Verbindung und ADMIN_UID
- `database.rules.json` – Realtime-Database-Regeln

## Normale Nutzung: KEINE sichtbare Anmeldung
Beim Öffnen der GitHub-Pages-Seite erscheinen sofort die Einsatzkategorien.

Für die Speicherung einer Abfrage wird Firebase Anonymous Authentication im Hintergrund verwendet. Der Nutzer sieht keine Anmeldung.

In Firebase aktivieren:
Authentication -> Sign-in method -> Anonymous -> Aktivieren

## Verwaltung
Nur die Schaltfläche `🔐 Verwaltung` benötigt eine Anmeldung.

1. Firebase Authentication -> E-Mail/Passwort aktivieren.
2. Deinen Administrator-Benutzer anlegen.
3. Die UID dieses Benutzers in `firebase-config.js` bei `ADMIN_UID` eintragen.
4. Dieselbe UID in `database.rules.json` ersetzen.
5. Den Inhalt von `database.rules.json` in Firebase Realtime Database -> Rules einfügen und veröffentlichen.

## Firebase-Konfiguration
In Firebase:
Projekteinstellungen -> Deine Apps -> Web-App -> SDK-Konfiguration

Die Werte nach `firebaseConfig` in `firebase-config.js` eintragen.

## GitHub Pages
Alle Dateien in dein Repository hochladen.

Repository -> Settings -> Pages
- Source: Deploy from a branch
- Branch: main
- Folder: /(root)

Danach die angezeigte GitHub-Pages-Adresse öffnen.

## Firebase-Datenstruktur
- `/catalog/<kategorie>/<frage>`
- `/notarzt_rules/<regel>`
- `/resource_rules/<regel>`
- `/suggestions/<gruppe>`
- `/call_history/<anonyme-UID>/<abfrage>`

## Hinweis
Die enthaltenen medizinischen Fragen und Regeln sind technische Startdaten für die Anwendung. Sie sind kein vollständiger oder verbindlicher Leitstellen-Standard, kein offizieller Notarztindikationskatalog und kein Ersatz für lokal freigegebene Dispositionsrichtlinien. Für reale Notrufdisposition müssen Fragen, Indikationen und Einsatzmittelregeln durch die zuständige fachliche und organisatorische Stelle geprüft und freigegeben werden.
