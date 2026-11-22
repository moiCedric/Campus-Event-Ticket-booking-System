
const pool = require("./config/db");

async function testConnection() {
    try {
        const connection = await pool.getConnection();

        console.log("Successfully connected to MySQL!");

        const [rows] = await connection.query(
            "SHOW TABLES"
        );

        console.log("Available tables:", rows);

        connection.release();
        await pool.end();

    } catch (error) {
        console.error("Database connection failed:", error.message);
    }
}

testConnection();
