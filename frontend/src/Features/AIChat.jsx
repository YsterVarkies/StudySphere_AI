import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./AIChat.css";

const API_URL = "http://localhost:5000/api";

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

function getUserId() {
    return getSession()?.user?.user_id || "";
}

function getToken() {
    return getSession()?.token || "";
}

function AIChat({ initialDocument }) {
    const initialDocumentId = initialDocument ? initialDocument.document_id || initialDocument.id : null;
    const initialisedDocumentRef = useRef(null);
    const sessionInitialisingRef  = useRef(false);
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
        if (selectedDocuments.length === 0) {
            setSessionId(null);
            setMessages([]);
            initialisedDocumentRef.current = null;
            return;
        }

        // Wait until the document list has loaded,
        // unless the initial document already contains its module ID.
        if (
            documents.length === 0 &&
            !initialDocument?.module_id &&
            !initialDocument?.moduleId
        ) {
            return;
        }

        const documentId = selectedDocuments[0];

        //don't initialise another session for the same document.
        if (initialisedDocumentRef.current === documentId) {
            return;
        }

        //don't start another session while one is already being created.
        if (sessionInitialisingRef.current) {
            return;
        }

        initialisedDocumentRef.current = documentId;
        initialiseSession();
    }, [selectedDocuments, documents, initialDocument]);

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
        if (selectedDocuments.length === 0) {
            return null;
        }

        if (sessionInitialisingRef.current) {
            return null;
        }

        const documentId = selectedDocuments[0];

        const selectedDocument = documents.find(
            (document) => String(getDocumentId(document)) === String(documentId)
        );
        /**
         * when opened directly from studyMaterials, the 
         * initialDocument already contains module_id.
         */
        const moduleId =
            selectedDocument?.module_id ||
            selectedDocument?.moduleId ||
            initialDocument?.module_id ||
            initialDocument?.moduleId;

        if (!moduleId) {
            setError("The selected document does not have a module ID.");
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
                        moduleId: Number(moduleId),
                        documentId: Number(documentId),
                        title: `Study Session - ${getDocumentName(selectedDocument || initialDocument || {})}`,
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

            /**
             * start a fresh conversation whenever the document changes.
             */
            setMessages([]);

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

    function toggleDocument(id) {
        setSelectedDocuments((current) => {
            if (current.includes(id)) {
                return current.filter((item) => item !== id
                );
            }
            return [id];
        });
    }

    async function sendQuestion(event) {
        event.preventDefault();

        if (!question.trim() || loading) {
            return;
        }

        if (selectedDocuments.length === 0) {
            setError("Please select a document first.");
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

    return (
        <main className="ai-chat-page">
            <header className="ai-chat-page__header">
                <h1>AI Chat Assistant</h1>
                <p>Ask questions about your selected study materials.</p>
            </header>

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

            <section className="ai-chat-page__chat">
                <div className="ai-chat-page__messages">
                    {messages.length === 0 && (
                        <div className="ai-chat-page__empty">
                            {initialisingSession ? "Preparing your AI Study Session..." : "Ask a question to get started."}
                        </div>
                    )}

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

                            <div className="ai-chat-page__message-content">
                                {message.role === "assistant" ? (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {message.content}
                                    </ReactMarkdown>
                                ) : (
                                    <span>{message.content}</span>
                                )}
                            </div>

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

                    {(loading || initialisingSession) && (
                        <div className="ai-chat-page__message ai-chat-page__message--assistant">
                            {initialisingSession ? "Preparing session..." : "Thinking..."}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="ai-chat-page__error">
                        {error}
                    </div>
                )}

                <form className="ai-chat-page__form" onSubmit={sendQuestion}>
                    <input
                        type="text"
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        placeholder="Ask a question..."
                        disabled={loading || initialisingSession}
                    />
                    <button type="submit" disabled={loading || initialisingSession || !question.trim() || selectedDocuments.length === 0}>
                        {loading ? "Sending..." : "Send"}
                    </button>
                </form>
            </section>
        </main>
    );
}

export default AIChat;