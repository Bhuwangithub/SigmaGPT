import "dotenv/config";

let activeGeminiKey = process.env.GEMINI_API_KEY || "";

export const setCustomGeminiKey = (key) => {
    activeGeminiKey = key ? key.trim() : "";
};

export const getActiveGeminiKey = () => activeGeminiKey;

// Primary and fallback models for high availability
const CANDIDATE_MODELS = [
    "gemini-flash-latest",
    "gemini-2.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash"
];

// Verify Gemini API key
export const verifyGeminiKey = async (key) => {
    const testKey = key || activeGeminiKey;
    if (!testKey) {
        return { valid: false, message: "No Gemini API key provided." };
    }
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${testKey}`
        );
        const data = await response.json();
        if (!response.ok) {
            return {
                valid: false,
                message: data.error?.message || "Invalid Gemini API key."
            };
        }
        return { valid: true, message: "Gemini API key is valid and active!" };
    } catch (err) {
        return { valid: false, message: "Network error checking Gemini key: " + err.message };
    }
};

export const getGeminiAPIResponse = async (messages, preferredModel = null) => {
    const apiKey = activeGeminiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("No Gemini API key configured.");
    }

    // Convert conversation history ({role: 'user'|'assistant', content: string})
    // into Gemini contents format ({role: 'user'|'model', parts: [{text: string}]})
    // Also filter out any previous offline notice messages so they don't confuse the AI
    const cleanedMessages = (messages || []).filter(msg => {
        return !msg.content.includes("OpenAI API credit quota exhausted");
    });

    const contents = cleanedMessages.map(msg => ({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }]
    }));

    // Ensure valid non-empty conversation
    if (contents.length === 0) {
        contents.push({ role: "user", parts: [{ text: "Hello" }] });
    }

    const modelsToTry = preferredModel
        ? [preferredModel, ...CANDIDATE_MODELS.filter(m => m !== preferredModel)]
        : CANDIDATE_MODELS;

    let lastError = null;

    for (const model of modelsToTry) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ contents })
            });

            const data = await response.json();

            if (!response.ok) {
                console.warn(`Gemini model ${model} returned ${response.status}:`, data.error?.message);
                lastError = new Error(data.error?.message || `Status ${response.status}`);
                continue; // Try next model in fallback list
            }

            const candidate = data.candidates?.[0];
            const replyText = candidate?.content?.parts?.[0]?.text;

            if (replyText) {
                return replyText;
            }
        } catch (err) {
            console.warn(`Gemini model ${model} network error:`, err.message);
            lastError = err;
        }
    }

    throw lastError || new Error("All Gemini models failed to return a response.");
};

export default getGeminiAPIResponse;
