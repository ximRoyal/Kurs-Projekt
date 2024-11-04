const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Middleware zum Parsen von JSON-Daten
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Statische Dateien aus dem "public"-Ordner bereitstellen
app.use(express.static(path.join(__dirname, 'public')));

// Verbindung zur SQLite-Datenbank herstellen
const db = new sqlite3.Database('./users.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Verbunden mit der SQLite-Datenbank.');
});

// Tabelle erstellen, falls sie nicht existiert
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  email TEXT UNIQUE,
  password TEXT
)`);

// **GET-Route für die Registrierungsseite hinzufügen**
app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// Registrierungs-Endpunkt
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  // Eingabedaten validieren
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Bitte alle Felder ausfüllen.' });
  }

  // Passwort hashen
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error(err.message);
      return res.status(500).json({ message: 'Serverfehler beim Hashen des Passworts.' });
    }

    // Benutzer in die Datenbank einfügen
    db.run(`INSERT INTO users (username, email, password) VALUES (?, ?, ?)`, [username, email, hash], function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ message: 'Benutzername oder E-Mail bereits vergeben.' });
        }
        return res.status(500).json({ message: 'Serverfehler beim Speichern des Benutzers.' });
      }
      res.status(200).json({ message: 'Registrierung erfolgreich!' });
    });
  });
});

// Root-Route
app.get('/', (req, res) => {
  res.send('Willkommen auf der Startseite!');
});

// Server starten
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server läuft auf Port ${PORT}`);
});
