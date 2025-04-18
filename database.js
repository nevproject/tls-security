const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./checkin.db');

function initDB() {
  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        checkpoint TEXT,
        time TEXT,
        image TEXT
      )`,
      (err) => (err ? reject(err) : resolve())
    );
  });
}

function saveCheckin({ userId, checkpoint, time, image }) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO checkins (userId, checkpoint, time, image) VALUES (?, ?, ?, ?)`,
      [userId, checkpoint, time, image],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

module.exports = { initDB, saveCheckin };
