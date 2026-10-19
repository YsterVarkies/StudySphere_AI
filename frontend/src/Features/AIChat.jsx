import { useEffect, useRef, useState } from "react"; // import React from "react";
import ReactMarkdown from "react-markdown"; // import remarkGfm from "remark-gfm";
import remarkGfm from "remark-gfm"; // import the remark-gfm plugin for GitHub Flavored Markdown
import "./AIChat.css"; // import the CSS file for styling the AIChat component

/* GLOBAL CONFIGURATION */
const API_URL = "http://localhost:5000/api"; // the base URL for the backend API
const MAX_CHATS = 20; //Max saved chats per student

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
function AIChat({ initialDocument, onQuestionSubmitted }) {
    const initialDocumentId = initialDocument ? initialDocument.document_id || initialDocument.id : null; // if the component is opened from studyMaterials, we may have an initial document to select
    const sessionInitialisingRef = useRef(false); // to prevent multiple simultaneous session initialisation requests
    const sendingQuestionRef = useRef(false);
    const requestIdRef = useRef(null);
    const requestQuestionRef = useRef(null);
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
    const [message, setMessage] = useState(""); //display message
    const [openingChat, setOpeningChat] = useState(false);
    const [deleteChat, setDeleteChat] = useState(null); //stores the selected chat
    const [deletingChat, setDeletingChat] = useState(false); //Tracks deletion 


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
        setMessage(""); //clear success message when chats refresh
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
            setPreviousChats(data.data);

        } catch (error) {
            console.error("Load previous chats error:", error);
            setHistoryError(error.message || "Could not load previous chats.");
        } finally {
            setHistoryLoading(false);
        }
    }

    /* Delete a saved chat converstation */
    async function handleDeleteChat() { //Function for deleting a chat
        if (!deleteChat || deletingChat) return; //prevent deleting without a selected chat

        const chatId = deleteChat.chat_session_id; //gets saved chat's database ID

        if (!chatId) {
            setHistoryError("Could not identify the chat to delete.");
            setDeleteChat(null);
            setMessage(""); //clear an old success message 
            return;
        }

        setDeletingChat(true); //marks the deletion as in progress
        setHistoryError("");

        try {
            const token = getToken(); //gets student's logged-in authentication token

            if (!token) {
                throw new Error("Please log in again to delete a chat.");
            }
            const response = await fetch(
                `${API_URL}/chat/sessions/${chatId}`,
                {
                    method: "DELETE", // asks backend to delete the chat session
                    headers: {
                        Authorization: `Bearer ${token}`, // authenticates the request
                    },
                }
            );
            if (!response.ok) { //detects when backend rejects the deletion.
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || `Unable to delete chat (Status: ${response.status})`);
            }

            //clear the chat if it is currently open
            if (String(sessionId) === String(chatId)) { //checks if the chat being deleted is the current one displayed
                setSessionId(null); //clears chat active session ID
                setMessages([]); // removes the deletion message
                setQuestion(""); //clears any unfinished questions
            }
            await loadPreviousChats(); //reloads the saved chat after successful deletion
            setDeleteChat(null); //closes the confirmation popup on success/ failure
            setMessage("Chat deleted successfully."); //show success message
        } catch (error) {
            console.error("Delete chat error: ", error);
            setHistoryError(error.message || "Unable to delete chat.");
            setDeleteChat(null);
        } finally { // resets the deletion loading state
            setDeletingChat(false);
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

        //Show the storage warning if storage is full
        if (totalChats >= MAX_CHATS) {
            setError(
                `You've reached your limit of ${MAX_CHATS} saved chats. You can continue existing conversations, but you will need to delete a chat before starting a new one. `
            );
            setHistoryOpen(true);
            return;
        }

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

        //prevent student creating a new chat session when storage is full
        if (totalChats >= MAX_CHATS) {
            setError(`You've reached your limit of ${MAX_CHATS} saved chats. You can continue existing conversations, but you will need to delete a chat before starting a new one.`);
            return null;
        }

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

            //refresh chats so the storage counter updates
            await loadPreviousChats();

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

        if (!question.trim() || sendingQuestionRef.current) {
            return;
        }

        sendingQuestionRef.current = true;
        const currentQuestion = question.trim();
        if (!requestIdRef.current || requestQuestionRef.current !== currentQuestion) {
            requestIdRef.current = globalThis.crypto?.randomUUID?.() || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
                const randomValue = Math.random() * 16 | 0;
                return (character === 'x' ? randomValue : (randomValue & 0x3 | 0x8)).toString(16);
            });
            requestQuestionRef.current = currentQuestion;
        }
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
                throw new Error(totalChats >= MAX_CHATS 
                    ? `You've reached your limit of ${MAX_CHATS} saved chats. You can continue existing conversations, but you will need to delete a chat before starting a new one.`
                    : "Could not create a chat session."
                );
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
                    requestId: requestIdRef.current,
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
            requestIdRef.current = null;
            requestQuestionRef.current = null;
            onQuestionSubmitted?.();
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
            sendingQuestionRef.current = false;
            setLoading(false);
        }
    }

    /* Storage count */
    const totalChats = previousChats.length; //count chats returned by backend
    const chatsRemaining = Math.max(MAX_CHATS - totalChats, 0); //calculates how many slots remain
 
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

                        <div className="ai-chat-page__storage-count">
                            <div>Saved Chats: {totalChats} / {MAX_CHATS}</div>
                            <div>{chatsRemaining}{chatsRemaining === 1 ? " slot" : " slots"} remaining</div>

                            {totalChats >= MAX_CHATS && (
                            <p className="ai-chat-page__storage-warning">
                                You've reached your limit of {MAX_CHATS} saved chats.
                                You can continue existing conversations, but you will need to delete a chat before starting a new one.
                            </p>
                        )}
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

                        {message && (
                            <p className="ai-chat-page__success">
                                {message}
                            </p>
                        )}

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
                                    <div
                                        key={chat.chat_session_id} // gives each chat a unique identity in react
                                        className="ai-chat-page__history-row" //create a container for two buttons
                                    >
                                        <button
                                            type="button"
                                            className={`ai-chat-page__history-item ${String(sessionId) === String(chat.chat_session_id)
                                                ? "ai-chat-page__history-item--active" : ""
                                            }`}//preseves the existing button for opening saved chats
                                            onClick={() => openPreviousChat(chat)} //reopen and continue chat
                                            disabled={openingChat || loading || initialisingSession || deletingChat}
                                        >
                                            <strong title={chat.title || "Untitled Chat"}>
                                                {chat.title || "Untitled Chat"}
                                            </strong>
                                            {chat.document_title && (
                                                <span title={chat.document_title}>
                                                    {chat.document_title}
                                                </span>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            className="ai-chat-page__delete-btn"
                                            onClick={() => setDeleteChat(chat)} //remembers selected chat
                                            disabled={loading || initialisingSession || openingChat || deletingChat} //prevents conflicting actions
                                            aria-label={`Delete ${chat.title || "Untitled Chat"}`} // makes icon only button
                                            title="Delete Chat"
                                        >
                                            <svg //Scalable Vector Graphics - starts SVG drawing
                                                width="18" // makes icon 18 pixels wide
                                                height="18" // makes icon 18 pixels tall
                                                viewBox="0 0 24 24" //creates drawing coordinate system measuring 24 units wide and 24 units high, starting at position (0,0)
                                                fill="none" //prevents shapes from being filled with a solid color - only outlines
                                                stroke="currentColor" // makes the icon's lines use the CSS color of the element
                                                strokeWidth="1.8" //controls how thick the lines are
                                                strokeLinecap="round" // rounds the ends of the lines 
                                                strokeLinejoin="round" // rounds the corners
                                                aria-hidden="true" // hides the decorative SVG from screen readers because the surrounding button already has an aria-label
                                            >
                                                {/* the <path> lines draws the trash can */}
                                                <path d="M3 6h18" /> {/* top rim - M3 6 means move to coordinates (3,6). h18 means draw a horizontal line 18 units to the right */}
                                                <path d="M8 6V4h8v2" /> {/* handle on the lid - Start at (8,6), draw upwards to y=4, draw right 8units, then down 2 units */}
                                                <path d="M5 6l1 15h12l1-15" /> {/* body of trash can - start at (5,6), draw diagonally down and right, across the bottom, then diagonally up and right. This creates the container outline */}
                                                <path d="M10 10v7" /> {/* two verical lines inside - draw two vertical lines down 7 units, one starting at (10,10) and the othe at (14,10) */}
                                                <path d="M14 10v7" />
                                            </svg>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </aside>
                )}

                {/* Delete Chat Confirmation Popup */}
                {deleteChat && (
                    <div className="ai-chat-page__modal-backdrop" >
                        <div
                            className="ai-chat-page__delete-modal"
                            role="alertdialog"
                            aria-modal="true"
                            aria-labelledby="delete-chat-title"
                        >
                            <h2 id="delete-chat-title">Delete Chat?</h2>

                            <p>Are you sure you want to delete{" "}
                                <strong>{deleteChat.title || "Untitled Chat"}</strong>?
                            </p>
                            <p className="ai-chat-page__delete-warning">
                                ⚠️ This action cannot be undone.
                            </p>
                            <div className="ai-chat-page__modal-actions">
                                <button
                                    type="button"
                                    className="ai-chat-page__btn-cancel"
                                    onClick={() => setDeleteChat(null)}
                                    disabled={deletingChat}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="ai-chat-page__btn-delete-confirm"
                                    onClick={handleDeleteChat}
                                    disabled={deletingChat}
                                >
                                    {deletingChat ? "Deleting..." : "Yes, Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
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