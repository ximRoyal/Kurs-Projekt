const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cors = require('cors');

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

// **GET-Route für die Registrierungsseite hinzufügen**
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, '', 'register.html'));
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

// Root-Route
app.get('/', (req, res) => {
  res.send('Willkommen auf der Startseite!');
});

// Alle Middleware und Routen hier

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
