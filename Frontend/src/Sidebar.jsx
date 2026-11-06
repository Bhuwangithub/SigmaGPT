import "./Sidebar.css";
import { useContext, useEffect, useState } from "react";
import { MyContext } from "./MyContext.jsx";
import { v1 as uuidv1 } from "uuid";
import { API_BASE_URL } from "./config.js";

function Sidebar() {
    const { allThreads, setAllThreads, currThreadId, setNewChat, setPrompt, setReply, setCurrThreadId, setPrevChats } = useContext(MyContext);
    const [searchTerm, setSearchTerm] = useState("");

    const getAllThreads = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/thread`);
            const res = await response.json();
            if (Array.isArray(res)) {
                const filteredData = res.map(thread => ({
                    threadId: thread.threadId,
                    title: thread.title || "New Conversation"
                }));
                setAllThreads(filteredData);
            }
        } catch (err) {
            console.error("Failed to load threads from backend:", err);
        }
    };

    useEffect(() => {
        getAllThreads();
    }, [currThreadId]);

    const createNewChat = () => {
        setNewChat(true);
        setPrompt("");
        setReply(null);
        setCurrThreadId(uuidv1());
        setPrevChats([]);
    };

    const changeThread = async (newThreadId) => {
        if (newThreadId === currThreadId) return;
        setCurrThreadId(newThreadId);

        try {
            const response = await fetch(`${API_BASE_URL}/api/thread/${newThreadId}`);
            const res = await response.json();
            if (Array.isArray(res)) {
                setPrevChats(res);
                setNewChat(false);
                setReply(null);
            }
        } catch (err) {
            console.error("Failed to fetch thread messages:", err);
        }
    };

    const deleteThread = async (threadId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/thread/${threadId}`, { method: "DELETE" });
            const res = await response.json();

            setAllThreads(prev => prev.filter(thread => thread.threadId !== threadId));

            if (threadId === currThreadId) {
                createNewChat();
            }
        } catch (err) {
            console.error("Failed to delete thread:", err);
        }
    };

    const displayedThreads = allThreads.filter(thread =>
        (thread.title || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <section className="sidebar">
            <div>
                <button className="newChatBtn" onClick={createNewChat}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="starCircle" title="AI Assistant">
                            <i className="fa-solid fa-star"></i>
                        </div>
                        <span>New Chat</span>
                    </div>
                    <span><i className="fa-solid fa-pen-to-square"></i></span>
                </button>

                <div className="searchBox">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                        type="text"
                        placeholder="Search chats..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <i
                            className="fa-solid fa-xmark"
                            style={{ cursor: "pointer", marginLeft: "6px" }}
                            onClick={() => setSearchTerm("")}
                        ></i>
                    )}
                </div>
            </div>

            <div className="historyContainer">
                <ul className="history">
                    {displayedThreads.length === 0 ? (
                        <li style={{ color: "#86868b", textAlign: "center", cursor: "default", padding: "16px 0" }}>
                            {searchTerm ? "No matching chats" : "No chats yet"}
                        </li>
                    ) : (
                        displayedThreads.map((thread) => (
                            <li
                                key={thread.threadId}
                                onClick={() => changeThread(thread.threadId)}
                                className={thread.threadId === currThreadId ? "highlighted" : ""}
                            >
                                <span className="threadTitle">{thread.title}</span>
                                <i
                                    className="fa-solid fa-trash"
                                    title="Delete chat"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteThread(thread.threadId);
                                    }}
                                ></i>
                            </li>
                        ))
                    )}
                </ul>
            </div>

            <div className="sign">
                <p>Made with &hearts; by Ayushi &amp; Bhuwan</p>
            </div>
        </section>
    );
}

export default Sidebar;