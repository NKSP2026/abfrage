// Firebase-Konfiguration
// In Firebase: Projekteinstellungen -> Deine Apps -> Web-App -> SDK-Konfiguration
// Die apiKey/authDomain/storageBucket/messagingSenderId/appId-Werte unten ersetzen.

export const firebaseConfig = {
  apiKey: "HIER_API_KEY_EINFUEGEN",
  authDomain: "abfrage-50be7.firebaseapp.com",
  databaseURL: "https://abfrage-50be7-default-rtdb.firebaseio.com",
  projectId: "abfrage-50be7",
  storageBucket: "abfrage-50be7.firebasestorage.app",
  messagingSenderId: "HIER_MESSAGING_SENDER_ID_EINFUEGEN",
  appId: "HIER_APP_ID_EINFUEGEN"
};

// Nach dem Anlegen deines Administrators dessen Firebase Authentication UID hier eintragen.
export const ADMIN_UID = "HIER_DEINE_ADMIN_UID_EINFUEGEN";
