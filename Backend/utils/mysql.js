import mysql from "mysql2/promise";
import "dotenv/config";

let pool = null;
let isConnected = false;

export const initMySQL = async () => {
    try {
        const host = process.env.MYSQL_HOST || "localhost";
        const port = Number(process.env.MYSQL_PORT) || 3306;
        const user = process.env.MYSQL_USER || "root";
        const password = process.env.MYSQL_PASSWORD || "";
        const database = process.env.MYSQL_DATABASE || "sigmagpt";

        // First connect to MySQL server without database to ensure database exists
        const rootConnection = await mysql.createConnection({
            host,
            port,
            user,
            password
        });

        await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
        await rootConnection.end();

        // Create connection pool targeting the database
        pool = mysql.createPool({
            host,
            port,
            user,
            password,
            database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Initialize tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS threads (
                threadId VARCHAR(100) PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id INT AUTO_INCREMENT PRIMARY KEY,
                threadId VARCHAR(100) NOT NULL,
                role VARCHAR(20) NOT NULL,
                content LONGTEXT NOT NULL,
                createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (threadId) REFERENCES threads(threadId) ON DELETE CASCADE
            );
        `);

        isConnected = true;
        console.log(`🐬 Connected to MySQL Database "${database}" successfully! (Viewable in MySQL Workbench)`);
        return true;
    } catch (err) {
        console.warn("⚠️ MySQL connection failed:", err.message);
        isConnected = false;
        return false;
    }
};

export const getMySQLPool = () => pool;
export const isMySQLConnected = () => isConnected;
