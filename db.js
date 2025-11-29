const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./submissions.db", (err) => {
    if (err) {
        console.error("Error opening SQLite DB:", err.message);
    } else {
        console.log("SQLite Database Connected");
    }
});

// Create table if not exists
db.run(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submissionId TEXT,
    fullName TEXT,
    age INTEGER,
    gender TEXT,
    skills TEXT,
    joinDate TEXT,
    bio TEXT,
    isActive INTEGER,
    createdAt TEXT
  )
`);

module.exports = db;
