const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.query("SELECT NOW()", (err, result) => {
    if (err) {
        console.error("PostgreSQL connection failed:");
        console.error(err.message);
        return;
    }

    console.log("PostgreSQL connected successfully!");
    console.log("Database time:", result.rows[0].now);
});

module.exports = pool;