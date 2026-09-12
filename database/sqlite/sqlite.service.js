const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "retinaguard.db");
const schemaPath = path.join(__dirname, "schema.sql");

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("❌ SQLite database connection failed:", err.message);
        return;
    }

    console.log("✅ SQLite database connected.");
});

const schema = fs.readFileSync(schemaPath, "utf8");

db.exec(schema, (err) => {
    if (err) {
        console.error("❌ Database schema creation failed:", err.message);
        return;
    }

    console.log("✅ All SQLite tables created successfully.");
});

module.exports = db;