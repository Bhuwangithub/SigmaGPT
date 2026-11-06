import "./Chat.css";
import React, { useContext } from "react";
import { MyContext } from "./MyContext";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";

function Chat() {
    const { newChat, prevChats, setPrompt } = useContext(MyContext);

    return (
        <div className="chats">
            {newChat && (!prevChats || prevChats.length === 0) && (
                <div className="welcomeScreen">
                    <div className="welcomeAvatar">
                        <div className="starCircle">
                            <i className="fa-solid fa-star"></i>
                        </div>
                    </div>
                    <h1>What can I help with today?</h1>
                    <p className="welcomeSub">Intelligent AI &bull; Powered by Google Gemini &amp; MySQL</p>
                    <div className="suggestionGrid">
                        <div
                            className="suggestionCard"
                            onClick={() => setPrompt("Write a SQL query to find top 5 customers")}
                        >
                            <span>💡 Write a SQL query</span>
                            <small>Find top 5 customers in MySQL</small>
                        </div>
                        <div
                            className="suggestionCard"
                            onClick={() => setPrompt("Explain how React useState hook works in simple terms")}
                        >
                            <span>⚛️ Explain React useState</span>
                            <small>Simple terms with code example</small>
                        </div>
                        <div
                            className="suggestionCard"
                            onClick={() => setPrompt("Tell me an interesting fact about space exploration")}
                        >
                            <span>🪐 Space exploration fact</span>
                            <small>Cosmic discovery &amp; science</small>
                        </div>
                    </div>
                </div>
            )}

            {prevChats?.map((chat, idx) => (
                <div className={chat.role === "user" ? "userDiv" : "gptDiv"} key={idx}>
                    {chat.role === "user" ? (
                        <p className="userMessage">{chat.content}</p>
                    ) : (
                        <>
                            <div className="starCircle assistantAvatar" title="SigmaGPT">
                                <i className="fa-solid fa-star"></i>
                            </div>
                            <div className="gptMessageContent">
                                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{chat.content}</ReactMarkdown>
                            </div>
                        </>
                    )}
                </div>
            ))}
        </div>
    );
}

export default Chat;