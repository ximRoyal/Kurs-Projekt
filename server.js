const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');
const querystring = require('querystring');
const axios = require('axios');

// Middleware hinzufügen
app.use(express.json());
app.use(cors());

// Middleware zum Parsen von JSON-Daten
app.use(express.urlencoded({ extended: true }));

// Statische Dateien aus dem aktuellen Verzeichnis bereitstellen
app.use(express.static(__dirname));

// Verbindung zur SQLite-Datenbank herstellen
const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Fehler beim Verbinden mit der SQLite-Datenbank:', err.message);
  } else {
    console.log('Verbunden mit der SQLite-Datenbank.');
  }
});

// Tabelle erstellen, falls sie nicht existiert
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT
)`, (err) => {
  if (err) {
    console.error('Fehler beim Erstellen der Tabelle:', err.message);
  } else {
    console.log('Tabelle "users" erstellt oder bereits vorhanden.');
  }
});

// Aktualisiere die Benutzertabelle, um die Spotify-ID zu speichern
db.run(`ALTER TABLE users ADD COLUMN spotify_id TEXT UNIQUE`, (err) => {
  if (err && !err.message.includes('duplicate column name')) {
    console.error('Fehler beim Hinzufügen der Spotify-ID-Spalte:', err.message);
  }
});

// Spotify API Konfiguration
const client_id = '98621f9004dd40ddb39e47dab58dc971'; // Ersetze durch deine Spotify Client ID
const client_secret = '1c3e31bb5fdf46a3b4939aee80a6b8cc'; // Ersetze durch deinen Spotify Client Secret
const redirect_uri = 'http://localhost:5000/callback'; // Ersetze durch deine Redirect URI

// Hilfsfunktion zum Generieren eines zufälligen Strings
function generateRandomString(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for ( let i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

// Route zum Starten des Authentifizierungsprozesses
app.get('/login', (req, res) => {
  const state = generateRandomString(16);
  const scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

// Callback-Route nach erfolgreicher Authentifizierung
app.get('/callback', (req, res) => {
  const code = req.query.code || null;
  const error = req.query.error;

  if (error) {
    // Bei Fehler zur Hauptseite umleiten und Fehlermeldung übergeben
    return res.redirect('/?error=auth_failed');
  }
  
  const authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    method: 'POST',
    params: {
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code'
    },
    headers: {
      'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };
  
  axios(authOptions)
    .then(response => {
      const access_token = response.data.access_token;
      
      // Benutzerdaten abrufen
      return axios.get('https://api.spotify.com/v1/me', {
        headers: { 'Authorization': 'Bearer ' + access_token }
      });
    })
    .then(response => {
      const user = response.data;
      const { id: spotify_id, display_name: username, email } = user;
      
      // Benutzerdaten in die Datenbank speichern
      db.run(`INSERT OR IGNORE INTO users (spotify_id, username, email) VALUES (?, ?, ?)`, [spotify_id, username, email], function(err) {
        if (err) {
          console.error('Fehler beim Speichern des Benutzers:', err.message);
          return res.status(500).send('Serverfehler beim Speichern des Benutzers.');
        }
        console.log('Benutzer erfolgreich gespeichert:', username);
        res.redirect('/'); // Weiterleitung zur Startseite
      });
    })
    .catch(err => {
      console.error('Fehler bei der Spotify Authentifizierung:', err.message);
      // Bei Fehler zur Hauptseite umleiten und Fehlermeldung übergeben
      res.redirect('/?error=auth_failed');
    });
});

// Registrierungs-Endpunkt
app.post('/register', (req, res) => {
  console.log('Empfangene Daten:', req.body);
  const { username, email, password } = req.body;

  // Eingabedaten validieren
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Bitte alle Felder ausfüllen.' });
  }

  // Passwort hashen
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error('Fehler beim Hashen des Passworts:', err.message);
      return res.status(500).json({ message: 'Serverfehler beim Hashen des Passworts.' });
    }

    // Benutzer in die Datenbank einfügen
    db.run(`INSERT INTO users (username, email, password) VALUES (?, ?, ?)`, [username, email, hash], function(err) {
      if (err) {
        console.error('Fehler beim Einfügen in die Datenbank:', err.message);
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ message: 'Benutzername oder E-Mail bereits vergeben.' });
        }
        return res.status(500).json({ message: 'Serverfehler beim Speichern des Benutzers.' });
      }
      console.log('Neuer Benutzer mit ID', this.lastID, 'wurde registriert.');
      res.status(201).json({ message: 'Registrierung erfolgreich!' });
    });
  });
});

// Passe die Root-Route an, um index.html zu senden
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '', 'index.html'));
});

// Alle Middleware und Routen hier

// Server starten
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
