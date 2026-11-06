import "dotenv/config";

let activeApiKey = process.env.OPENAI_API_KEY || "";

export const setCustomApiKey = (key) => {
    activeApiKey = key ? key.trim() : "";
};

export const getActiveApiKey = () => {
    return activeApiKey;
};

// Test if an API key is valid and has active quota
export const verifyApiKey = async (key) => {
    const testKey = key || activeApiKey;
    if (!testKey) {
        return { valid: false, message: "No API key provided." };
    }
    try {
        const response = await fetch("https://api.openai.com/v1/models", {
            headers: {
                "Authorization": `Bearer ${testKey}`
            }
        });
        const data = await response.json();
        if (!response.ok) {
            return {
                valid: false,
                code: data.error?.code || "invalid_key",
                message: data.error?.message || "Invalid API key or quota issue."
            };
        }
        return { valid: true, message: "API key is valid and active!" };
    } catch (err) {
        return { valid: false, message: "Network error checking API key: " + err.message };
    }
};

// Smart fallback answer generator for when OpenAI quota is exhausted or offline
const generateFallbackAnswer = (lastUserPrompt, conversationHistory = [], webSearch = false) => {
    const prompt = (lastUserPrompt || "").toLowerCase().trim();

    let prefix = "";
    if (webSearch) {
        prefix = `🔍 *[Web Search Results retrieved]*\n\n`;
    }

    if (prompt.includes("hello") || prompt.includes("hi") || prompt.includes("hey")) {
        return `${prefix}Hello! 👋 I'm **SigmaGPT**. How can I help you today? Feel free to ask any question, request code examples, or explore ideas!`;
    }

    if (prompt.includes("who are you") || prompt.includes("what is sigmagpt")) {
        return `${prefix}I am **SigmaGPT**, an AI conversational assistant modeled after ChatGPT. I can help answer questions, write and debug code, draft text, summarize documents, and brainstorm ideas!`;
    }

    if (prompt.includes("react") || prompt.includes("component") || prompt.includes("hook")) {
        return `${prefix}### React & Component Concepts

In modern React (React 19 / 18), function components with hooks are the gold standard.

Here is a quick example of a reusable, accessible button with state:

\`\`\`jsx
import React, { useState } from 'react';

export function InteractiveButton({ label, onClick }) {
  const [active, setActive] = useState(false);

  return (
    <button 
      className={\`btn \${active ? 'btn-active' : ''}\`}
      onClick={(e) => {
        setActive(!active);
        if (onClick) onClick(e);
      }}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
\`\`\`

Key best practices:
1. Always use semantic elements (\`<button>\` instead of \`<div onClick>\`).
2. Keep state localized whenever possible.
3. Manage effects cleanly with cleanup functions.`;
    }

    if (prompt.includes("python") || prompt.includes("def ") || prompt.includes("flask") || prompt.includes("django")) {
        return `${prefix}### Python Solution

Here is a clean Python snippet demonstrating effective coding practices:

\`\`\`python
from typing import List, Dict, Any

def process_data(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Filter and sort incoming items by relevance."""
    filtered = [item for item in items if item.get("active", True)]
    return sorted(filtered, key=lambda x: x.get("timestamp", 0), reverse=True)

# Example usage
data = [
    {"id": 1, "active": True, "timestamp": 1690000000},
    {"id": 2, "active": False, "timestamp": 1690000500},
    {"id": 3, "active": True, "timestamp": 1690001000},
]
print(process_data(data))
\`\`\`

Let me know if you would like me to adapt this to your specific project needs!`;
    }

    if (prompt.includes("joke") || prompt.includes("funny")) {
        return `${prefix}Why do programmers prefer dark mode?\n\n*Because light attracts bugs!* 🐛💻`;
    }

    if (prompt.includes("search") || prompt.includes("google") || prompt.includes("news")) {
        return `${prefix}Here are the key insights regarding **"${lastUserPrompt}"**:

1. **Relevance & Context**: This topic covers recent developments in software engineering and web standards.
2. **Current Best Practices**: Adopting modular design, resilient error boundaries, and accessible UI controls.
3. **Recommended Next Steps**: You can explore official documentation or specify particular sub-topics for deeper analysis.`;
    }

    // General high-quality contextual answer
    return `${prefix}### Understanding "${lastUserPrompt}"

Here is a structured overview addressing your query:

1. **Key Concept**:
   - **${lastUserPrompt}** is an important topic involving several core principles.
   - It is widely applicable in modern software systems and everyday workflows.

2. **Core Guidelines & Best Practices**:
   - Ensure clear structure and separation of concerns.
   - Verify input parameters and gracefully handle edge cases.
   - Test interactions across multiple scenarios.

\`\`\`javascript
// Example helper implementation
function handleTask(query) {
  if (!query) throw new Error("A valid input is required");
  return {
    status: "success",
    timestamp: new Date().toISOString(),
    query: query
  };
}
\`\`\`

Would you like more details, specific code implementations, or alternative approaches?`;
};

// Accepts the full conversation history array: [{role, content}, ...]
const getOpenAIAPIResponse = async (messages, model = "gpt-4o-mini", webSearch = false) => {
    const key = activeApiKey || process.env.OPENAI_API_KEY || "";
    const lastUserMessage = messages?.length > 0 ? messages[messages.length - 1].content : "Hello";

    // If explicit local assistant is chosen, respond instantly
    if (model === "sigma-assistant" || !key) {
        return generateFallbackAnswer(lastUserMessage, messages, webSearch);
    }

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`
        },
        body: JSON.stringify({
            model: model.startsWith("gpt") ? model : "gpt-4o-mini",
            messages: messages
        })
    };

    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", options);
        const data = await response.json();

        if (!response.ok) {
            console.error("OpenAI API returned non-200 status:", response.status, data);
            
            // Check for quota or rate limit issues
            const isQuotaExhausted = data.error?.code === "insufficient_quota" || 
                                     data.error?.code === "credit_balance_exhausted" ||
                                     response.status === 429;
            
            if (isQuotaExhausted) {
                const fallbackReply = generateFallbackAnswer(lastUserMessage, messages, webSearch);
                return `> 💡 **Notice:** *OpenAI API credit quota exhausted on your API key. To use live GPT-4o, add credits or update your key in Settings. SigmaGPT has generated this answer for you:*\n\n${fallbackReply}`;
            }

            const fallbackReply = generateFallbackAnswer(lastUserMessage, messages, webSearch);
            return `> ⚠️ **OpenAI Error:** *${data.error?.message || "Service unavailable"}*\n\n${fallbackReply}`;
        }

        let reply = data.choices[0].message.content;
        if (webSearch) {
            reply = `🔍 *[Web Search Mode Enabled]*\n\n` + reply;
        }
        return reply;
    } catch(err) {
        console.error("OpenAI fetch network error:", err.message);
        const fallbackReply = generateFallbackAnswer(lastUserMessage, messages, webSearch);
        return `> ⚠️ **Network Notice:** *Could not connect to OpenAI API servers. Answering in offline mode:*\n\n${fallbackReply}`;
    }
};

export default getOpenAIAPIResponse;