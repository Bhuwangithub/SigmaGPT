import "./ChatWindow.css";
import Chat from "./Chat.jsx";
import { MyContext } from "./MyContext.jsx";
import { useContext, useState } from "react";
import { ScaleLoader } from "react-spinners";
import { API_BASE_URL } from "./config.js";

function ChatWindow() {
    const { prompt, setPrompt, setReply, currThreadId, setPrevChats, setNewChat } = useContext(MyContext);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);

    const getReply = async () => {
        if (!prompt.trim() || loading) return;

        const userMessage = prompt.trim();
        setPrompt(""); // Immediately clear input
        setLoading(true);
        setNewChat(false);

        // Instantly display user's question in chat window
        setPrevChats(prev => [...prev, { role: "user", content: userMessage }]);

        try {
            const response = await fetch(`${API_BASE_URL}/api/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMessage,
                    threadId: currThreadId
                })
            });

            const res = await response.json();

            if (res.reply) {
                setReply(res.reply);
                setPrevChats(prev => [...prev, { role: "assistant", content: res.reply }]);
            } else {
                setPrevChats(prev => [
                    ...prev,
                    { role: "assistant", content: "⚠️ Unexpected response format received from server." }
                ]);
            }
        } catch (err) {
            console.error("Chat error:", err);
            setPrevChats(prev => [
                ...prev,
                { role: "assistant", content: "⚠️ Could not connect to backend server. Please verify the backend is running on `http://localhost:8080`." }
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chatWindow">
            <div className="navbar">
                <span className="brandTitle">
                    <div className="starCircle" title="SigmaGPT">
                        <i className="fa-solid fa-star"></i>
                    </div>
                    SigmaGPT <span className="geminiBadge">Gemini 3.8</span>
                </span>
                <div className="userIconDiv" onClick={() => setIsOpen(!isOpen)}>
                    <span className="userIcon"><i className="fa-solid fa-user"></i></span>
                </div>
            </div>

            {isOpen && (
                <div className="dropDown">
                    <div className="dropDownItem" onClick={() => { setShowSettings(true); setIsOpen(false); }}>
                        <i className="fa-solid fa-sliders"></i> System Status &amp; Settings
                    </div>
                    <div className="dropDownItem" onClick={() => { alert("SigmaGPT — Made with ♥ by Ayushi & Bhuwan\nPowered by Google Gemini & MySQL!"); setIsOpen(false); }}>
                        <i className="fa-solid fa-circle-info"></i> About
                    </div>
                </div>
            )}

            {showSettings && (
                <div className="settingsModalBackdrop" onClick={() => setShowSettings(false)}>
                    <div className="settingsModal" onClick={(e) => e.stopPropagation()}>
                        <div className="modalHeader">
                            <h3><i className="fa-solid fa-sliders"></i> System Configuration</h3>
                            <button className="closeBtn" onClick={() => setShowSettings(false)}>&times;</button>
                        </div>
                        <div className="modalBody">
                            <div className="configRow">
                                <span className="configLabel">AI Model Provider:</span>
                                <span className="configValue activeTag">Google Gemini (Active &amp; Free)</span>
                            </div>
                            <div className="configRow">
                                <span className="configLabel">Database Engine:</span>
                                <span className="configValue activeTag">MySQL Database (sigmagpt)</span>
                            </div>
                            <div className="configRow">
                                <span className="configLabel">Workbench Status:</span>
                                <span className="configValue">Inspect via MySQL Workbench at localhost:3306</span>
                            </div>
                        </div>
                        <div className="modalFooter">
                            <button className="confirmBtn" onClick={() => setShowSettings(false)}>Done</button>
                        </div>
                    </div>
                </div>
            )}

            <Chat />

            {loading && (
                <div style={{ display: "flex", justifyContent: "center", padding: "10px" }}>
                    <ScaleLoader color="#0071e3" height={18} />
                </div>
            )}

            <div className="chatInput">
                <div className="inputBox">
                    <input
                        placeholder="Ask anything..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                getReply();
                            }
                        }}
                    />
                    <div
                        id="submit"
                        className={prompt.trim() ? "submitActive" : ""}
                        onClick={getReply}
                        title="Send message"
                    >
                        <i className="fa-solid fa-arrow-up"></i>
                    </div>
                </div>
                <p className="info">
                    SigmaGPT can make mistakes &bull; Made with &hearts; by Ayushi &amp; Bhuwan
                </p>
            </div>
        </div>
    );
}

export default ChatWindow;