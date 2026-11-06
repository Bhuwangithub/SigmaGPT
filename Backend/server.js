import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";
import { initMySQL } from "./utils/mysql.js";

const app = express();
const PORT = process.env.PORT || 8080;


app.use(express.json());
app.use(cors());

app.use("/api", chatRoutes);

const connectDatabases = async () => {
    // 1. Try connecting to MySQL (viewable in MySQL Workbench)
    const mysqlConnected = await initMySQL();
    if (mysqlConnected) {
        console.log("🐬 Storage Engine: MySQL Database (Ready for MySQL Workbench)");
        return;
    }

    // 2. Try MongoDB if MONGODB_URI is provided
    const mongoUri = process.env.MONGODB_URI;
    if (mongoUri) {
        try {
            await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
            console.log("🍃 Storage Engine: MongoDB Database");
            return;
        } catch (err) {
            console.warn("⚠️ MongoDB connection failed:", err.message);
        }
    }

    // 3. Fallback to Local Persistent File
    console.log("📁 Storage Engine: Local Persistent JSON Storage (Backend/data/threads.json)");
};

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    connectDatabases();
});
