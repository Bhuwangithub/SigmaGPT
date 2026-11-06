import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Thread from "../models/Thread.js";
import mongoose from "mongoose";
import { getMySQLPool, isMySQLConnected } from "./mysql.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "..", "data");
const DATA_FILE = path.join(DATA_DIR, "threads.json");

// Ensure local data directory and file exist as ultimate fallback
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), "utf8");
}

const isMongoConnected = () => {
    return mongoose.connection && mongoose.connection.readyState === 1;
};

// Helper for local file storage
const readLocalThreads = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) return [];
        const content = fs.readFileSync(DATA_FILE, "utf8");
        return JSON.parse(content || "[]");
    } catch (err) {
        console.error("Error reading local threads:", err);
        return [];
    }
};

const writeLocalThreads = (threads) => {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(threads, null, 2), "utf8");
    } catch (err) {
        console.error("Error writing local threads:", err);
    }
};

export const storage = {
    isMySQL: isMySQLConnected,
    isMongo: isMongoConnected,

    getMode() {
        if (isMySQLConnected()) return "MySQL (MySQL Workbench)";
        if (isMongoConnected()) return "MongoDB";
        return "Local JSON File (Persistent)";
    },

    async getAllThreads() {
        if (isMySQLConnected()) {
            try {
                const pool = getMySQLPool();
                const [rows] = await pool.query(
                    "SELECT threadId, title, createdAt, updatedAt FROM threads ORDER BY updatedAt DESC"
                );
                return rows;
            } catch (err) {
                console.warn("MySQL getAllThreads failed, falling back to local file:", err.message);
            }
        }

        if (isMongoConnected()) {
            try {
                return await Thread.find({}).sort({ updatedAt: -1 });
            } catch (err) {
                console.warn("MongoDB query failed, falling back to local file:", err.message);
            }
        }

        const threads = readLocalThreads();
        return threads.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    },

    async getThread(threadId) {
        if (isMySQLConnected()) {
            try {
                const pool = getMySQLPool();
                const [threadRows] = await pool.query("SELECT threadId FROM threads WHERE threadId = ?", [threadId]);
                if (threadRows.length === 0) return null;

                const [msgRows] = await pool.query(
                    "SELECT role, content, createdAt as timestamp FROM messages WHERE threadId = ? ORDER BY id ASC",
                    [threadId]
                );
                return msgRows;
            } catch (err) {
                console.warn("MySQL getThread failed, falling back to local file:", err.message);
            }
        }

        if (isMongoConnected()) {
            try {
                const thread = await Thread.findOne({ threadId });
                return thread ? thread.messages : null;
            } catch (err) {
                console.warn("MongoDB findOne failed, falling back to local file:", err.message);
            }
        }

        const threads = readLocalThreads();
        const found = threads.find(t => t.threadId === threadId);
        return found ? found.messages : null;
    },

    async saveMessage(threadId, userMessage, assistantReply) {
        const now = new Date();
        const title = userMessage.length > 40 ? userMessage.slice(0, 37) + "..." : userMessage;

        if (isMySQLConnected()) {
            try {
                const pool = getMySQLPool();
                await pool.query(
                    `INSERT INTO threads (threadId, title, createdAt, updatedAt)
                     VALUES (?, ?, NOW(), NOW())
                     ON DUPLICATE KEY UPDATE updatedAt = NOW()`,
                    [threadId, title]
                );

                await pool.query(
                    `INSERT INTO messages (threadId, role, content)
                     VALUES (?, 'user', ?), (?, 'assistant', ?)`,
                    [threadId, userMessage, threadId, assistantReply]
                );

                return {
                    threadId,
                    title,
                    messages: [
                        { role: "user", content: userMessage, timestamp: now },
                        { role: "assistant", content: assistantReply, timestamp: now }
                    ]
                };
            } catch (err) {
                console.warn("MySQL save failed, falling back to local file:", err.message);
            }
        }

        if (isMongoConnected()) {
            try {
                let thread = await Thread.findOne({ threadId });
                if (!thread) {
                    thread = new Thread({
                        threadId,
                        title,
                        messages: [
                            { role: "user", content: userMessage, timestamp: now },
                            { role: "assistant", content: assistantReply, timestamp: now }
                        ],
                        createdAt: now,
                        updatedAt: now
                    });
                } else {
                    thread.messages.push({ role: "user", content: userMessage, timestamp: now });
                    thread.messages.push({ role: "assistant", content: assistantReply, timestamp: now });
                    thread.updatedAt = now;
                }
                await thread.save();
                return thread;
            } catch (err) {
                console.warn("MongoDB save failed, falling back to local file:", err.message);
            }
        }

        // Local storage fallback
        const threads = readLocalThreads();
        let thread = threads.find(t => t.threadId === threadId);
        if (!thread) {
            thread = {
                threadId,
                title,
                messages: [
                    { role: "user", content: userMessage, timestamp: now.toISOString() },
                    { role: "assistant", content: assistantReply, timestamp: now.toISOString() }
                ],
                createdAt: now.toISOString(),
                updatedAt: now.toISOString()
            };
            threads.unshift(thread);
        } else {
            thread.messages.push({ role: "user", content: userMessage, timestamp: now.toISOString() });
            thread.messages.push({ role: "assistant", content: assistantReply, timestamp: now.toISOString() });
            thread.updatedAt = now.toISOString();
        }
        writeLocalThreads(threads);
        return thread;
    },

    async deleteThread(threadId) {
        let deleted = false;

        if (isMySQLConnected()) {
            try {
                const pool = getMySQLPool();
                const [res] = await pool.query("DELETE FROM threads WHERE threadId = ?", [threadId]);
                if (res.affectedRows > 0) deleted = true;
            } catch (err) {
                console.warn("MySQL delete failed, falling back:", err.message);
            }
        }

        if (isMongoConnected()) {
            try {
                const res = await Thread.findOneAndDelete({ threadId });
                if (res) deleted = true;
            } catch (err) {
                console.warn("MongoDB delete failed:", err.message);
            }
        }

        const threads = readLocalThreads();
        const initialLength = threads.length;
        const filtered = threads.filter(t => t.threadId !== threadId);
        if (filtered.length !== initialLength) {
            writeLocalThreads(filtered);
            deleted = true;
        }
        return deleted;
    },

    async updateTitle(threadId, newTitle) {
        if (isMySQLConnected()) {
            try {
                const pool = getMySQLPool();
                const [res] = await pool.query(
                    "UPDATE threads SET title = ?, updatedAt = NOW() WHERE threadId = ?",
                    [newTitle, threadId]
                );
                if (res.affectedRows > 0) return true;
            } catch (err) {
                console.warn("MySQL updateTitle failed:", err.message);
            }
        }

        if (isMongoConnected()) {
            try {
                await Thread.findOneAndUpdate({ threadId }, { title: newTitle, updatedAt: new Date() });
            } catch (err) {
                console.warn("MongoDB updateTitle failed:", err.message);
            }
        }

        const threads = readLocalThreads();
        const thread = threads.find(t => t.threadId === threadId);
        if (thread) {
            thread.title = newTitle;
            thread.updatedAt = new Date().toISOString();
            writeLocalThreads(threads);
            return true;
        }
        return false;
    },

    async searchThreads(query) {
        const q = (query || "").toLowerCase().trim();
        if (!q) return this.getAllThreads();

        if (isMySQLConnected()) {
            try {
                const pool = getMySQLPool();
                const term = `%${q}%`;
                const [rows] = await pool.query(
                    `SELECT DISTINCT t.threadId, t.title, t.createdAt, t.updatedAt
                     FROM threads t
                     LEFT JOIN messages m ON t.threadId = m.threadId
                     WHERE t.title LIKE ? OR m.content LIKE ?
                     ORDER BY t.updatedAt DESC`,
                    [term, term]
                );
                return rows;
            } catch (err) {
                console.warn("MySQL search failed, falling back:", err.message);
            }
        }

        const all = await this.getAllThreads();
        return all.filter(t => {
            const matchTitle = (t.title || "").toLowerCase().includes(q);
            const matchMessage = (t.messages || []).some(m => (m.content || "").toLowerCase().includes(q));
            return matchTitle || matchMessage;
        });
    },

    async clearAllThreads() {
        if (isMySQLConnected()) {
            try {
                const pool = getMySQLPool();
                await pool.query("DELETE FROM messages");
                await pool.query("DELETE FROM threads");
            } catch (err) {
                console.warn("MySQL clearAll failed:", err.message);
            }
        }

        if (isMongoConnected()) {
            try {
                await Thread.deleteMany({});
            } catch (err) {
                console.warn("MongoDB clearAll failed:", err.message);
            }
        }

        writeLocalThreads([]);
        return true;
    }
};
