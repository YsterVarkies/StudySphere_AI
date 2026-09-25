import { useEffect, useState } from "react"; // 
import "./AIChat.css"; // 

const API_URL = "http://localhost:5000/api";

function getSession() {
    try {
        return JSON.parse(localStorage.getItem("studysphere_session") || "null");
    } catch {
        return null;
    }
}

function getUserId() {
    const user = getSession();
    return user?.user_id || user?.studentNumber || user?.email || 1;
}

function AIChat() {
    const [documents, setDocuments] = useState([]);
    const [selectedDocuments, setSelectedDocuments] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [question, setQuestion] = useState("");
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        loadDocuments();
    }, []);

    //whenever selected documents change, ensure we have an active chat session
    useEffect(() => {
       getOrCreateSession();
    }, [selectedDocuments, documents]);

    async function loadDocuments() {
        try{
            const userId = getUserId();
            const response = await fetch (
                `${API_URL}/documents${userId ? `?user_id=${encodeURIComponent(userId)}` : ""}`
            );

            if (!response.ok) return;

            const data = await response.json();

            setDocuments(
                data.documents ||
                data.data ||
                (Array.isArray(data) ? data : [])
            );
        } catch {
            // the chat can still be displayed if documents cannot load
        }
    }

    async function getOrCreateSession() {
        try {
            const userId = getUserId();
            const documentId = selectedDocuments.length > 0 ? selectedDocuments[0] : null;
            const moduleId = 1; // defualt module if not explicitly tracked here

            //check existing sessions
            const res = await fetch(`${API_URL}/chat/sessions?userId=${userId}`);
            const data = await res.json();
            const sessions = data.data || [];

            if (sessions.length > 0) {
                //use the first available session
                setSessionId(sessions[0].session_id || sessions[0].id);
            } else {
                //create a new session if none exist
                const createRes = await fetch(`${API_URL}/chat/sessions`, {
                    method: "POST",
                    headers: {"Content-Type" : "application/json"},
                    body: JSON.stringify({ userId, moduleId, documentId, title: "Study session" })
                });
                const createData = await createRes.json();
                if(createData.success && createData.data) {
                    setSessionId(createData.data.session_id || createData.data.id);
                }
            }
        } catch (err) {
            console.error("Session error: ", err);
        }
    }

    function getDocumentId(document) {
        return document.document_id || document.id;
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

    function toggleDocument(id) {
        setSelectedDocuments((current) =>
            current.includes(id)
                ? current.filter((item) => item !== id)
                : [...current, id]
        );
    }

    async function sendQuestion(event) {
        event.preventDefault();

        if (!question.trim() || loading) return;

        const currentQuestion = question.trim();

        setQuestion("");
        setError("");

        setMessages((current) => [
            ...current,
            {
                role: "user",
                content: currentQuestion,
            },
        ]);

        setLoading(true);

        try{
            //ensure we have a session before sending
            let activeSessionId = sessionId;
            if(!activeSessionId){
                await getOrCreateSession();
                activeSessionId = sessionId;
            }

            const response = await fetch(`${API_URL}/chat/message`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    user_id: getUserId(),
                    sessionId: activeSessionId,
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
        }catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className = "ai-chat-page">
            <header className= "ai-chat-page__header">
                <h1>AI Chat Assistant</h1>
                <p>Ask questions about your selected study materials.</p>
            </header>

            <section className= "ai-chat-page__documents">
                <h2>Study Materials</h2>
                {documents.length === 0 ? (
                    <p>No documents available.</p>
                ) : (
                    <div className= "ai-chat-page__document-list">
                        {documents.map((document) => {
                            const id = getDocumentId(document);
                            return (
                                <button
                                    type= "button"
                                    key={id}
                                    className= {
                                        selectedDocuments.includes(id)
                                        ? "ai-chat-page__document ai-chat-page__document--selected"
                                        : "ai-chat-page__document"
                                    }
                                    onClick={() => toggleDocument(id)}
                                >
                                    📄 {getDocumentName(document)}
                                </button>
                            );
                        } ) }
                    </div>
                )}
            </section>

            <section className="ai-chat-page__chat">
                <div className="ai-chat-page__messages">
                    {messages.length === 0 && (
                        <div className="ai-chat-page__empty">
                            Ask a question to get started.
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

                            <p>{message.content}</p>

                            {
                                message.sources?.length > 0 && (
                                    <div className="ai-chat-page__sources">
                                        <strong>Sources</strong>

                                        {message.sources.map((source, sourceIndex) => (
                                            <span key={sourceIndex}>
                                                {
                                                    typeof source === "string"
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

                    {loading && (
                        <div className="ai-chat-page__message ai-chat-page__message--assistant">
                            Thinking...
                        </div>
                    )}
                    </div>

                    {error && (
                        <div className="ai-chat-page__error">
                            {error}
                        </div>
                    )}

                    <form  className="ai-chat-page__form"
                    onSubmit={sendQuestion}
                    >
                        <input
                        type="text"
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        placeholder="Ask a question..."
                        disabled={loading}
                        />

                        <button type="submit" disabled={loading || !question.trim()}>
                            {loading ? "Sending... " : "Send"}
                        </button>
                    </form>
            </section>
        </main>
    );
}

export default AIChat;