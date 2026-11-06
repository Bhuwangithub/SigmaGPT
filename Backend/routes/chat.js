import express from "express";
import getOpenAIAPIResponse, { verifyApiKey, setCustomApiKey, getActiveApiKey } from "../utils/openai.js";
import getGeminiAPIResponse, { verifyGeminiKey, setCustomGeminiKey, getActiveGeminiKey } from "../utils/gemini.js";
import { storage } from "../utils/storage.js";

const router = express.Router();

// Get all threads (supports search via ?q=)
router.get("/thread", async (req, res) => {
    try {
        const query = req.query.q;
        let threads;
        if (query) {
            threads = await storage.searchThreads(query);
        } else {
            threads = await storage.getAllThreads();
        }
        res.json(threads || []);
    } catch (err) {
        console.error("Error fetching threads:", err);
        res.status(500).json({ error: "Failed to fetch threads", details: err.message });
    }
});

// Search threads endpoint
router.get("/search", async (req, res) => {
    try {
        const query = req.query.q || "";
        const results = await storage.searchThreads(query);
        res.json(results || []);
    } catch (err) {
        console.error("Search error:", err);
        res.status(500).json({ error: "Failed to perform search" });
    }
});

// Get a single thread by ID
router.get("/thread/:threadId", async (req, res) => {
    const { threadId } = req.params;
    try {
        const messages = await storage.getThread(threadId);
        if (!messages) {
            return res.status(404).json({ error: "Thread not found" });
        }
        res.json(messages);
    } catch (err) {
        console.error("Error fetching thread messages:", err);
        res.status(500).json({ error: "Failed to fetch chat" });
    }
});

// Rename thread
router.patch("/thread/:threadId", async (req, res) => {
    const { threadId } = req.params;
    const { title } = req.body;
    if (!title || !title.trim()) {
        return res.status(400).json({ error: "Title is required" });
    }
    try {
        const success = await storage.updateTitle(threadId, title.trim());
        if (!success) {
            return res.status(404).json({ error: "Thread not found" });
        }
        res.json({ success: true, message: "Thread renamed successfully" });
    } catch (err) {
        console.error("Error renaming thread:", err);
        res.status(500).json({ error: "Failed to rename thread" });
    }
});

// Delete a single thread
router.delete("/thread/:threadId", async (req, res) => {
    const { threadId } = req.params;
    try {
        const success = await storage.deleteThread(threadId);
        if (!success) {
            return res.status(404).json({ error: "Thread not found" });
        }
        res.status(200).json({ success: "Thread deleted successfully" });
    } catch (err) {
        console.error("Error deleting thread:", err);
        res.status(500).json({ error: "Failed to delete thread" });
    }
});

// Clear all threads
router.delete("/threads", async (req, res) => {
    try {
        await storage.clearAllThreads();
        res.json({ success: true, message: "All history cleared" });
    } catch (err) {
        console.error("Error clearing threads:", err);
        res.status(500).json({ error: "Failed to clear history" });
    }
});

// Chat completion endpoint (Supports Gemini & OpenAI)
router.post("/chat", async (req, res) => {
    const { threadId, message, model, webSearch = false, provider } = req.body;

    if (!threadId || !message || !message.trim()) {
        return res.status(400).json({ error: "missing required fields" });
    }

    try {
        // Fetch existing messages to construct conversation context
        const existingMessages = (await storage.getThread(threadId)) || [];
        const conversationHistory = existingMessages.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        conversationHistory.push({ role: "user", content: message });

        let assistantReply = null;

        // 1. Try Gemini first (Free, fast, intelligent)
        if (getActiveGeminiKey() && (!provider || provider === "gemini")) {
            try {
                assistantReply = await getGeminiAPIResponse(conversationHistory, model || "gemini-3.8-flash");
            } catch (geminiErr) {
                console.warn("Gemini call failed, attempting fallback:", geminiErr.message);
            }
        }

        // 2. Try OpenAI if Gemini didn't reply or wasn't used
        if (!assistantReply && getActiveApiKey() && (!provider || provider === "openai")) {
            try {
                assistantReply = await getOpenAIAPIResponse(conversationHistory, model || "gpt-4o-mini", webSearch);
            } catch (openaiErr) {
                console.warn("OpenAI call failed, attempting fallback:", openaiErr.message);
            }
        }

        // 3. Fallback to smart offline response if live APIs are exhausted or down
        if (!assistantReply) {
            assistantReply = await getOpenAIAPIResponse(conversationHistory, "gpt-4o-mini", webSearch);
        }

        // Persist both user message and assistant reply to MySQL
        await storage.saveMessage(threadId, message, assistantReply);

        res.json({ reply: assistantReply, provider: getActiveGeminiKey() ? "Gemini 3.8 Flash" : "OpenAI" });
    } catch (err) {
        console.error("Error processing chat message:", err);
        const fallbackReply = `I received your message: "${message}". However, an unexpected error occurred while processing the full response. Please try again.`;
        try {
            await storage.saveMessage(threadId, message, fallbackReply);
        } catch (saveErr) {
            console.error("Failed to save fallback message:", saveErr);
        }
        res.json({ reply: fallbackReply });
    }
});

// Settings & API key configuration
router.get("/settings", async (req, res) => {
    const geminiKey = getActiveGeminiKey();
    const openaiKey = getActiveApiKey();
    res.json({
        storageMode: storage.getMode(),
        activeProvider: geminiKey ? "Google Gemini (Free Tier)" : (openaiKey ? "OpenAI" : "Offline Assistant"),
        hasGeminiKey: Boolean(geminiKey),
        geminiKeyMasked: geminiKey ? `${geminiKey.slice(0, 6)}...${geminiKey.slice(-4)}` : "None configured",
        hasOpenAIKey: Boolean(openaiKey),
        openaiKeyMasked: openaiKey ? `${openaiKey.slice(0, 7)}...${openaiKey.slice(-4)}` : "None configured"
    });
});

router.post("/settings/key", async (req, res) => {
    const { apiKey, geminiKey } = req.body;

    if (geminiKey) {
        const verification = await verifyGeminiKey(geminiKey);
        if (!verification.valid) {
            setCustomGeminiKey(geminiKey);
            return res.json({
                success: true,
                warning: verification.message,
                message: "Gemini key saved, but verification noted: " + verification.message
            });
        }
        setCustomGeminiKey(geminiKey);
        return res.json({
            success: true,
            message: "Gemini API key verified and updated successfully!"
        });
    }

    if (apiKey) {
        const verification = await verifyApiKey(apiKey);
        if (!verification.valid) {
            setCustomApiKey(apiKey);
            return res.json({
                success: true,
                warning: verification.message,
                message: "OpenAI key saved, but verification noted: " + verification.message
            });
        }
        setCustomApiKey(apiKey);
        return res.json({
            success: true,
            message: "OpenAI API key verified and updated successfully!"
        });
    }

    return res.status(400).json({ error: "No API key provided." });
});

export default router;