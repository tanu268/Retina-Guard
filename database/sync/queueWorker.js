const sqlite = require("sqlite3").verbose();
const pool = require("../postgres/supabase.service");

const db = new sqlite.Database(
    "./database/sqlite/retinaguard.db",
    (err) => {
        if (err) {
            console.error("SQLite connection failed:", err.message);
        } else {
            console.log("SQLite connected for Queue Worker");
        }
    }
);

const MAX_RETRIES = 3;

function processQueue() {
    const sql = `
        SELECT *
        FROM sync_queue
        WHERE status = 'PENDING'
        AND retry_count < ?
        ORDER BY created_at ASC
        LIMIT 10
    `;

    db.all(sql, [MAX_RETRIES], async (err, rows) => {
        if (err) {
            console.error("Failed to read sync queue:", err.message);
            return;
        }

        if (rows.length === 0) {
            console.log("No pending records in sync queue.");
            return;
        }

        console.log(`Found ${rows.length} pending record(s).`);

        for (const item of rows) {
            try {
                await syncRecord(item);

                updateQueueStatus(item.id, "SYNCED");

            } catch (error) {
                console.error(
                    `Failed to sync record ${item.record_id}:`,
                    error.message
                );

                handleRetry(item);
            }
        }
    });
}

function getPatient(patientId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT *
            FROM patients
            WHERE id = ?
        `;

        db.get(sql, [patientId], (err, row) => {
            if (err) {
                reject(err);
                return;
            }

            if (!row) {
                reject(new Error("Patient not found in SQLite"));
                return;
            }

            resolve(row);
        });
    });
}

async function syncRecord(item) {
    console.log(
        `Syncing ${item.operation} on ${item.table_name} (${item.record_id})`
    );

    if (item.table_name === "patients" && item.operation === "INSERT") {
        const patient = await getPatient(item.record_id);

        const sql = `
            INSERT INTO patients
            (id, name, age, gender, phone, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (id)
            DO UPDATE SET
                name = EXCLUDED.name,
                age = EXCLUDED.age,
                gender = EXCLUDED.gender,
                phone = EXCLUDED.phone,
                updated_at = EXCLUDED.updated_at
        `;

        await pool.query(sql, [
            patient.id,
            patient.name,
            patient.age,
            patient.gender,
            patient.phone,
            patient.created_at,
            patient.updated_at
        ]);

        console.log(
            "Patient uploaded to PostgreSQL:",
            patient.id
        );

        return;
    }

    throw new Error(
        `Unsupported sync operation: ${item.operation} on ${item.table_name}`
    );
}

function handleRetry(item) {
    const newRetryCount = item.retry_count + 1;
    const now = new Date().toISOString();

    let newStatus = "PENDING";

    if (newRetryCount >= MAX_RETRIES) {
        newStatus = "FAILED";
    }

    const sql = `
        UPDATE sync_queue
        SET status = ?,
            retry_count = ?,
            updated_at = ?
        WHERE id = ?
    `;

    db.run(
        sql,
        [
            newStatus,
            newRetryCount,
            now,
            item.id
        ],
        (err) => {
            if (err) {
                console.error(
                    `Failed to update retry information for ${item.id}:`,
                    err.message
                );
                return;
            }

            console.log(
                `Queue item ${item.id} → ${newStatus} (retry ${newRetryCount}/${MAX_RETRIES})`
            );
        }
    );
}

function updateQueueStatus(queueId, status) {
    const sql = `
        UPDATE sync_queue
        SET status = ?,
            updated_at = ?
        WHERE id = ?
    `;

    const now = new Date().toISOString();

    db.run(
        sql,
        [status, now, queueId],
        (err) => {
            if (err) {
                console.error(
                    `Failed to update queue status for ${queueId}:`,
                    err.message
                );
                return;
            }

            console.log(
                `Queue item ${queueId} → ${status}`
            );
        }
    );
}

processQueue();

module.exports = {
    processQueue
};