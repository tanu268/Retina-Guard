const sqlite = require("sqlite3").verbose();
const crypto = require("crypto");

const db = new sqlite.Database(
    "./database/sqlite/retinaguard.db",
    (err) => {
        if (err) {
            console.error("SQLite connection failed:", err.message);
        } else {
            console.log("SQLite connected for Sync Manager");
        }
    }
);

function addPatient(patient) {
    const patientId = patient.id || crypto.randomUUID();
    const now = new Date().toISOString();

    const insertPatientSQL = `
        INSERT INTO patients
        (id, name, age, gender, phone, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
        insertPatientSQL,
        [
            patientId,
            patient.name,
            patient.age,
            patient.gender,
            patient.phone,
            now,
            now
        ],
        function (err) {
            if (err) {
                console.error("Failed to insert patient:", err.message);
                return;
            }

            console.log("Patient saved in SQLite:", patientId);

            addToSyncQueue(
                "patients",
                patientId,
                "INSERT"
            );
        }
    );
}

function addToSyncQueue(tableName, recordId, operation) {
    const queueId = crypto.randomUUID();
    const now = new Date().toISOString();

    const sql = `
        INSERT INTO sync_queue
        (id, table_name, record_id, operation, status, retry_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'PENDING', 0, ?, ?)
    `;

    db.run(
        sql,
        [
            queueId,
            tableName,
            recordId,
            operation,
            now,
            now
        ],
        function (err) {
            if (err) {
                console.error("Failed to add sync queue:", err.message);
                return;
            }

            console.log("Added to sync queue:", queueId);
        }
    );
}

module.exports = {
    addPatient,
    addToSyncQueue
};