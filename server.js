// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();

// --- Einstellungen ---
const PORT = process.env.PORT || 3000;
// counter.json liegt im Projekt-Root
const COUNTER_FILE = path.join(__dirname, 'counter.json');

// Body-Parser für JSON (falls du später mehr brauchst)
app.use(express.json());

// Static Files (deine AR-Seite)
app.use(express.static(path.join(__dirname, 'public')));

// --- Helper-Funktionen für Counter ---

function readStoneCount() {
  try {
    const raw = fs.readFileSync(COUNTER_FILE, 'utf8');
    const data = JSON.parse(raw);
    if (typeof data.stoneCount === 'number') {
      return data.stoneCount;
    }
    return 60; // Fallback
  } catch (err) {
    // Datei existiert nicht oder ist kaputt → neu bei 60 starten
    console.warn('Konnte counter.json nicht lesen, starte bei 60:', err.message);
    return 60;
  }
}

function writeStoneCount(value) {
  const data = { stoneCount: value };
  fs.writeFileSync(COUNTER_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// --- API-Routen ---

// Aktuellen Wert abfragen (optional, z.B. fürs Debuggen)
app.get('/api/stone-count', (req, res) => {
  const stoneCount = readStoneCount();
  res.json({ stoneCount });
});

// Wert um 1 erhöhen, neuen Wert zurückgeben
app.post('/api/increment-stone-count', (req, res) => {
  let stoneCount = readStoneCount();
  stoneCount += 5;
  writeStoneCount(stoneCount);
  console.log('stoneCount erhöht auf:', stoneCount);
  res.json({ stoneCount });
});

// Fallback: index.html für alles andere (Single-Page-Style)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Server starten ---
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});

