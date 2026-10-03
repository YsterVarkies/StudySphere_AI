import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./AIChat.css";

/* GLOBAL CONFIGURATION */
const API_URL = "http://localhost:5000/api";

/* SESSION HELPERS */
function getSession() {
    try {
        const raw = localStorage.getItem("studysphere_session");

        if (!raw) {
            return {
                token: "",
                user: null,
            };
        }

        const session = JSON.parse(raw);

        return {
            token: session?.token || "",
            user: session?.user || null,
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
    return getSession()?.user?.user_id || "";
}
//GET AUTHENTICATION TOKEN
function getToken() {
    return getSession()?.token || "";
}

/* MAIN COMPONENT */
function AIChat({ initialDocument }) {
    const initialDocumentId = initialDocument ? initialDocument.document_id || initialDocument.id : null;
    const sessionInitialisingRef = useRef(false);
    const [documents, setDocuments] = useState([]);
    const [selectedDocuments, setSelectedDocuments] = useState(initialDocumentId ? [initialDocumentId] : []);
    const [sessionId, setSessionId] = useState(null);
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [initialisingSession, setInitialisingSession] = useState(false);
    const [error, setError] = useState("");


    useEffect(() => {
        loadDocuments(); // load the user's documents
    }, []);

    /**
     * if studymaterials opened AI chat with a specific document,
     * make sure that document is selected
     */
    useEffect(() => {
        if (!initialDocument) {
            return;
        }
        const docId = initialDocument.document_id || initialDocument.id;

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

            setError("The AI service is temporarily unavailable. Please try again in a moment.");
        }
        finally {
            setLoading(false);
        }
    }

    /*  USER INTERFACE */
    return (
        <main className="ai-chat-page">
            {/* PAGE HEADER */}
            <header className="ai-chat-page__header">
                <h1>AI Chat Assistant</h1>
                <p>Ask questions about your selected study materials.</p>
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
            {/* CHAT AREA */}
            <section className="ai-chat-page__chat">
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
        </main>
    );
}

export default AIChat;