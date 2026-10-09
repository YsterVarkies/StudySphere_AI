import { useEffect, useRef, useState } from "react"; // import React from "react";
import ReactMarkdown from "react-markdown"; // import remarkGfm from "remark-gfm";
import remarkGfm from "remark-gfm"; // import the remark-gfm plugin for GitHub Flavored Markdown
import "./AIChat.css"; // import the CSS file for styling the AIChat component

/* GLOBAL CONFIGURATION */
const API_URL = "http://localhost:5000/api"; // the base URL for the backend API

/* SESSION HELPERS */
function getSession() {
    try {
        const raw = localStorage.getItem("studysphere_session"); // retrieve the session from local storage

        if (!raw) {
            return {
                token: "",
                user: null, // return an empty session if no session is found
            };
        }

        const session = JSON.parse(raw); // parse the session JSON string into an object

        return {
            token: session?.token || "", // return the token or an empty string if not found
            user: session?.user || null, // return the user object or null if not found
        };
    } catch (error) {
        console.error("Could not read stored session:", error);

        return {
            token: "",
            user: null,
        };
    }
}

//GET USER ID
function getUserId() {
    return getSession()?.user?.user_id || ""; // returns an empty string if no user id is found
}
//GET AUTHENTICATION TOKEN
function getToken() {
    return getSession()?.token || ""; // returns an empty string if no token is found
}

/* MAIN COMPONENT */
function AIChat({ initialDocument }) {
    const initialDocumentId = initialDocument ? initialDocument.document_id || initialDocument.id : null; // if the component is opened from studyMaterials, we may have an initial document to select
    const sessionInitialisingRef = useRef(false); // to prevent multiple simultaneous session initialisation requests
    const [documents, setDocuments] = useState([]); // list of documents available to the user
    const [selectedDocuments, setSelectedDocuments] = useState(initialDocumentId ? [initialDocumentId] : []); // list of selected documents (only one document can be selected at a time)
    const [sessionId, setSessionId] = useState(null);// the current chat session id
    const [question, setQuestion] = useState("");// the current question being typed by the user
    const [messages, setMessages] = useState([]);// the list of messages in the current chat session
    const [loading, setLoading] = useState(false); // whether a question is being sent to the AI and we are waiting for a response
    const [initialisingSession, setInitialisingSession] = useState(false); // whether a new chat session is being created
    const [error, setError] = useState(""); // any error message to display to the user
    const [previousChats, setPreviousChats] = useState([]);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [chatSearch, setChatSearch] = useState("");
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState("");
    const [openingChat, setOpeningChat] = useState(false);

    const skipDocumentResetRef = useRef(false);

    useEffect(() => {
        loadDocuments(); // load the user's documents
        loadPreviousChats();
    }, []);

    /**
     * if studymaterials opened AI chat with a specific document,
     * make sure that document is selected
     */
    useEffect(() => {
        if (!initialDocument) {
            return;
        }
        const docId = initialDocument.document_id || initialDocument.id; // 

        if (!docId) {
            return;
        }
        setSelectedDocuments([docId]);
    }, [initialDocument]);

    /**
     * whenever the selected docuemnt changes, create a new
     * chat session for that docuement.
     */
    useEffect(() => {
        if (skipDocumentResetRef.current) {
            skipDocumentResetRef.current = false;
            return;
        }
        setSessionId(null);
        setMessages([]);
        setError("");
    }, [selectedDocuments]);


    /* LOAD DOCUMENTS */
    async function loadDocuments() {
        try {

            const token = getToken();
            const response = await fetch(`${API_URL}/documents`, {

                headers: {
                    Authorization: token ? `Bearer ${token}` : "",
                },
            });

            if (!response.ok) {
                throw new Error(`Could not load documents (${response.status})`);
            }

            const data = await response.json();

            const list =
                data.documents ||
                data.data ||
                (Array.isArray(data) ? data : []);

            setDocuments(list);
        } catch (error) {
            console.error("Load documents error: ", error);

            setError(
                error.message || "Could not load study materials."
            );
        }
    }

    /* LOAD PREVIOUS CHAT SESSIONs */
    async function loadPreviousChats() {
        setHistoryLoading(true);
        setHistoryError("");

        try {
            const token = getToken();

            if (!token) {
                throw new Error("Please log in to view previous chats.");
            }

            const response = await fetch(`${API_URL}/chat/sessions`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Could not load previous chats (Status: ${response.status})`);
            }

            const data = await response.json();

            if (!Array.isArray(data.data)) {
                throw new Error("Unexpected chat history response.");
            }


            // Keep only conversations containing a saved AI reply.
            const checkedChats = await Promise.all(
                data.data.map(async (chat) => {
                    try {
                        const messagesResponse = await fetch(
                            `${API_URL}/chat/sessions/${chat.chat_session_id}/messages`,
                            {
                                headers: {
                                    Authorization: `Bearer ${token}`,
                                },
                            }
                        );

                        if (!messagesResponse.ok) {
                            return null;
                        }

                        const messagesData = await messagesResponse.json();

                        const hasAIResponse =
                            Array.isArray(messagesData.data) &&
                            messagesData.data.some(
                                (message) =>
                                    message.sender === "ai" &&
                                    String(message.message_text || "").trim() !== ""
                            );

                        return hasAIResponse ? chat : null;
                    } catch (error) {
                        console.error(
                            "Could not check chat:",
                            chat.chat_session_id,
                            error
                        );
                        return null;
                    }
                })
            );

            setPreviousChats(checkedChats.filter(Boolean));

        } catch (error) {
            console.error("Load previous chats error:", error);
            setHistoryError(error.message || "Could not load previous chats.");
        } finally {
            setHistoryLoading(false);
        }
    }


    /* OPEN A SAVED CONVERSATION */
    async function openPreviousChat(chat) {
        if (loading || initialisingSession || openingChat) return;

        setOpeningChat(true);
        setHistoryError("");

        try {
            const token = getToken();

            if (!token) {
                throw new Error("Please log in to open this conversation.");
            }

            const response = await fetch(
                `${API_URL}/chat/sessions/${chat.chat_session_id}/messages`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message || "Could not open this conversation."
                );
            }

            if (!Array.isArray(data.data)) {
                throw new Error("Unexpected saved messages response.");
            }

            const restoredMessages = data.data.map((message) => ({
                role: message.sender === "ai" ? "assistant" : "user",
                content: message.message_text,
            }));

            // Restore the document associated with this conversation.
            const restoredDocument = chat.document_id
                ? [chat.document_id]
                : [];

            const documentChanged =
                restoredDocument.length !== selectedDocuments.length ||
                restoredDocument.some(
                    (id, index) =>
                        String(id) !== String(selectedDocuments[index])
                );

            if (documentChanged) {
                skipDocumentResetRef.current = true;
                setSelectedDocuments(restoredDocument);
            }

            setSessionId(chat.chat_session_id);
            setMessages(restoredMessages);
            setQuestion("");
            setError("");
        } catch (error) {
            console.error("Open previous chat error:", error);
            setHistoryError(
                error.message || "Could not open this conversation."
            );
        } finally {
            setOpeningChat(false);
        }
    }

    /* START A FRESH CONVERSATION */
    function startNewChat() {
        if (loading || initialisingSession || openingChat) return;

        setSessionId(null);
        setMessages([]);
        setQuestion("");
        setError("");
    }


    /* DOCUMENT HELPER FUNCTIONS */
    function getDocumentId(document) {
        return (document.document_id || document.id);
    }

    function getDocumentName(document) {
        return (
            document.name ||
            document.file_name ||
            document.fileName ||
            document.title ||
            "Document"
        );
    }

    function getDocumentModuleId(document) {
        return (document.module_id || document.moduleId);
    }

    /**
     * Create a new chat session and return the session id. 
     */
    async function initialiseSession() {

        if (sessionInitialisingRef.current) {
            return null;
        }

        const documentId = selectedDocuments.length > 0 ? selectedDocuments[0] : null;

        const selectedDocument = documentId ? documents.find((document) => String(getDocumentId(document)) === String(documentId)) : null;
        /**
         * when opened directly from studyMaterials, the 
         * initialDocument already contains module_id.
         */
        const moduleId = documentId ? (selectedDocument?.module_id || selectedDocument?.moduleId || initialDocument?.module_id || initialDocument?.moduleId || null) : null;

        if (documentId && !moduleId) {
            setError("Could not determine the module for the selected document.");
            return null;
        }

        sessionInitialisingRef.current = true;
        try {
            setInitialisingSession(true);
            setError("");

            const userId = getUserId();
            const token = getToken();

            const response = await fetch(`${API_URL}/chat/sessions`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: token ? `Bearer ${token}` : "",
                    },
                    body: JSON.stringify({
                        userId: userId,
                        moduleId: moduleId ? Number(moduleId) : null,
                        documentId: documentId ? Number(documentId) : null,
                        title: documentId
                            ? `Study Session - ${getDocumentName(selectedDocument || initialDocument || {})}`
                            : "General AI Chat Session",
                    }),
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || "Could not create chat session.");
            }
            const newSession = data.data || data;

            const newSessionId =
                newSession.chat_session_id ||
                newSession.session_id ||
                newSession.id ||
                newSession.insertId;

            if (!newSessionId) {
                throw new Error("The server created a chat session but did not return its ID.");
            }
            setSessionId(newSessionId);

            return newSessionId;
        } catch (error) {
            console.error("Session initialisation error: ", error);

            setSessionId(null);

            setError(error.message || "Could not initialise the AI chat.");
            return null;
        } finally {
            sessionInitialisingRef.current = false;
            setInitialisingSession(false);
        }
    }

    /* SELECT/DESELECT DOCUMENT */
    function toggleDocument(id) {
        setSelectedDocuments((current) => {
            if (current.includes(id)) {
                return current.filter((item) => item !== id
                );
            }
            return [id];
        });
    }

    /* SEND QUESTION TO AI */
    async function sendQuestion(event) {
        event.preventDefault();

        if (!question.trim() || loading) {
            return;
        }

        const currentQuestion = question.trim();
        setQuestion("");
        setError("");

        /**
         * Immediately display the user's question.
         */
        setMessages((current) => [
            ...current,
            {
                role: "user",
                content: currentQuestion,
            },
        ]);

        setLoading(true);

        try {
            //make sure we have a valid session
            let activeSessionId = sessionId;

            if (!activeSessionId) {
                activeSessionId = await initialiseSession();
            }

            if (!activeSessionId) {
                throw new Error("Could not create a chat session.");
            }

            /* SEND THE QUESTION TO THE BACKEND */
            const token = getToken();
            const response = await fetch(`${API_URL}/chat/message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token ? `Bearer ${token}` : "",
                },
                body: JSON.stringify({
                    userId: getUserId(),
                    sessionId: Number(activeSessionId),
                    message: currentQuestion,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message || "The AI request could not be completed."
                );
            }

            /* FIND THE AI RESPONSE */
            const answer =
                data.data?.aiReply ||
                data.aiReply ||
                data.answer ||
                data.response ||
                data.message ||
                data.content ||
                "No response was returned.";

            setMessages((current) => [
                ...current,
                {
                    role: "assistant",
                    content: answer,
                    sources: data.sources || data.citations || [],
                },
            ]);
        } catch (error) {
            console.error("AI chat error:", error);

            //Remove the user's message if the request fialed.
            setMessages((current) => {
                if (
                    current.length > 0 && current[current.length - 1].role === "user"
                ) {
                    return current.slice(0, -1);
                }
                return current;
            });
            setQuestion(currentQuestion);

            setError(error.message || "The AI service is temporarily unavailable. Please try again in a moment.");
        }
        finally {
            setLoading(false);
        }
    }

    /*FILTERS PREVIOUS CHATS */
    const filteredChats = previousChats.filter((chat) => {
        const search = chatSearch.trim().toLowerCase();

        return (
            String(chat.title || "").toLowerCase().includes(search) || String(chat.document_title || "").toLowerCase().includes(search)
        );
    });

    /*  USER INTERFACE */
    return (
        <main className="ai-chat-page">
            {/* PAGE HEADER */}
            <header className="ai-chat-page__header">
                <h1>AI Chat Assistant</h1>
                <p>Ask a general question or select a study material for additional context.</p>
            </header>
            {/* DOCUMENT SELECTION */}
            <section className="ai-chat-page__documents">
                <h2>Study Materials</h2>
                {documents.length === 0 ? (
                    <p>No documents available.</p>
                ) : (
                    <div className="ai-chat-page__document-list">
                        {documents.map((document) => {
                            const id = getDocumentId(document);
                            return (
                                <button
                                    type="button"
                                    key={id}
                                    className={
                                        selectedDocuments.includes(id)
                                            ? "ai-chat-page__document ai-chat-page__document--selected"
                                            : "ai-chat-page__document"
                                    }
                                    onClick={() => toggleDocument(id)}
                                >
                                    📄 {" "} {getDocumentName(document)}
                                </button>
                            );
                        })}
                    </div>
                )}
            </section>
            {/* CHAT AREA WITH PREVIOUS CHATS */}
            <div className={`ai-chat-page__layout ${historyOpen ? "ai-chat-page__layout--with-history" : ""}`}>

                {historyOpen && (
                    <aside className="ai-chat-page__history">
                        <div className="ai-chat-page__history-header">
                            <h2>Previous Chats</h2>
                            <button
                                type="button"
                                onClick={() => setHistoryOpen(false)}
                                aria-label="Close previous chats"
                            >
                                ✕
                            </button>
                        </div>

                        <input
                            type="search"
                            className="ai-chat-page__history-search"
                            placeholder="Search conversations..."
                            value={chatSearch}
                            onChange={(event) => setChatSearch(event.target.value)}
                        />

                        <button
                            type="button"
                            className="ai-chat-page__history-refresh"
                            onClick={loadPreviousChats}
                            disabled={historyLoading}
                        >
                            {historyLoading ? "Refreshing..." : "Refresh Chats"}
                        </button>

                        {historyError && (
                            <p className="ai-chat-page__history-error">
                                {historyError}
                            </p>
                        )}

                        <div className="ai-chat-page__history-list">
                            {historyLoading ? (
                                <p>Loading conversations...</p>
                            ) : filteredChats.length === 0 ? (
                                <p>No previous conversations found.</p>
                            ) : (
                                filteredChats.map((chat) => (
                                    <button
                                        key={chat.chat_session_id}
                                        type="button"
                                        className="ai-chat-page__history-item"
                                        onClick={() => openPreviousChat(chat)}
                                        disabled={
                                            openingChat ||
                                            loading ||
                                            initialisingSession
                                        }
                                    >
                                        <strong>{chat.title || "Untitled Chat"}</strong>
                                        {chat.document_title && (
                                            <span>{chat.document_title}</span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </aside>
                )}


                <section className="ai-chat-page__chat">

                    <div className="ai-chat-page__toolbar">
                        <button
                            type="button"
                            onClick={() => setHistoryOpen((current) => !current)}
                        >
                            {historyOpen ? "Hide Previous Chats" : "Previous Chats"}
                        </button>

                        <button
                            type="button"
                            onClick={startNewChat}
                            disabled={loading || initialisingSession || openingChat}
                        >
                            + New Chat
                        </button>
                    </div>

                    <div className="ai-chat-page__messages">
                        {/* EMPTY CHAT MESSAGE */}
                        {messages.length === 0 && (
                            <div className="ai-chat-page__empty">
                                {initialisingSession ? "Preparing your AI Study Session..." : "Ask a question to get started."}
                            </div>
                        )}
                        {/* MESSAGE LIST */}
                        {messages.map((message, index) => (
                            <div
                                key={index}
                                className={
                                    message.role === "user"
                                        ? "ai-chat-page__message ai-chat-page__message--user"
                                        : "ai-chat-page__message ai-chat-page__message--assistant"
                                }
                            >
                                <strong>
                                    {message.role === "user" ? "You" : "AI Assistant"}
                                </strong>
                                {/* MESSAGE CONTENT */}
                                <div className="ai-chat-page__message-content">
                                    {message.role === "assistant" ? (
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {message.content}
                                        </ReactMarkdown>
                                    ) : (
                                        <span>{message.content}</span>
                                    )}
                                </div>
                                {/* SOURCES */}
                                {message.sources?.length > 0 && (
                                    <div className="ai-chat-page__sources">
                                        <strong>Sources</strong>
                                        {message.sources.map((source, sourceIndex) => (
                                            <span key={sourceIndex}>
                                                {typeof source === "string"
                                                    ? source
                                                    : source.file_name ||
                                                    source.name ||
                                                    source.title ||
                                                    `Source ${sourceIndex + 1}`}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                        {/* LOADING INDICATOR  */}
                        {(loading || initialisingSession) && (
                            <div className="ai-chat-page__message ai-chat-page__message--assistant">
                                {initialisingSession ? "Preparing session..." : "Thinking..."}
                            </div>
                        )}
                    </div>
                    {/* ERROR MESSAGE */}
                    {error && (
                        <div className="ai-chat-page__error">
                            {error}
                        </div>
                    )}
                    {/* QUESTION FORM  */}
                    <form className="ai-chat-page__form" onSubmit={sendQuestion}>
                        <input
                            type="text"
                            value={question}
                            onChange={(event) => setQuestion(event.target.value)}
                            placeholder="Ask a question..."
                            disabled={loading || initialisingSession}
                        />
                        <button type="submit" disabled={loading || initialisingSession || !question.trim()}>
                            {loading ? "Sending..." : "Send"}
                        </button>
                    </form>
                </section>
            </div>
        </main>
    );
}

export default AIChat;