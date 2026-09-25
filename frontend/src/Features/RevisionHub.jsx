import { useEffect, useState } from "react"; 
import "./RevisionHub.css";

const API_URL = "http://localhost:5000/api";

function getSession() {
    try {
        return JSON.parse(localStorage.getItem("studysphere_session") || "null");
    }catch {
        return null;
    }
}

function getUserId() {
    const user = getSession();
    return user?.user_id || user?.studentNumber || user?.email || "";
}

function RevisionHub() {
    const [documents, setDocuments] = useState([]);
    const [selectedDocument, setSelectedDocument] = useState("");
    const [number, setNumber] = useState(5);
    const [mode, setMode] = useState(null);
    const [content, setContent] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showAnswer, setShowAnswer] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        loadDocuments();
    }, []);
    
    async function loadDocuments() {
        try{
            const userId = getUserId();
            const response = await fetch(
                `${API_URL}/documents${userId ? `?user_id=${encodeURIComponent(userId)}` : ""}`
            );

            if (!response.ok) return;

            const data = await response.json();

            setDocuments(
                data.documents ||
                data.data ||
                (Array.isArray(data) ? data : [])
            );
        }catch {
            //Documents can be unavailable without preventing the page form loading.
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

    async function generate(type) {
        if (!selectedDocument) {
            setError("Please select a document.");
            return;
        }

        setLoading(true);
        setError("");
        setContent(null);
        setMode(type);
        setCurrentQuestion(0);
        setSelectedAnswer(null);
        setShowAnswer(false);

        const endpoint = 
        type === "quiz"
        ? `${API_URL}/quizzes/generate`
        : `${API_URL}/flashcards/generate`;

        try{
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type" : "application/json",
                },
                body: JSON.stringify({
                    user_id: getUserId(),
                    document_id: selectedDocument,
                    number,
                }),
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok){
                throw new Error(
                    data.message || `Could not generate ${type}.`
                );
            }

            const generated = 
            data.quiz ||
            data.flashcards ||
            data.questions ||
            data.cards ||
            data.data ||
            data;

            setContent(generated);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }

    function getQuestions() {
        if (Array.isArray(content)) return content;
        if (content?.questions) return content.questions;
        if (content?.quiz) return content.quiz;
        return [];
    }

    function getCards() {
        if (Array.isArray(content)) return content;
        if (content?.flashcards) return content.flashcards;
        if (content?.cards) return content.cards;
        return[];
    }

    const questions = getQuestions();
    const cards = getCards();

    return (
        <main className="revision-hub-page">
            <header className="revision-hub-page__header">
                <h1>Revision Hub</h1>
                <p>Generate quizzes and flashcards from your study materials.</p>
            </header>

            <section className="revision-hub-page__controls">
                <label>Study material
                    <select
                    value={selectedDocument}
                    onChange={(event) => 
                        setSelectedDocument(event.target.value)
                    }
                    >
                        <option
                        value="">
                            Select a document
                        </option>
                        {documents.map((document) => {
                            const id = getDocumentId(document);
                            return (
                                <option key={id} value={id}>
                                    {getDocumentName(document)}
                                </option>
                            );
                        })}
                    </select>
                </label>

                <label>
                    Number

                    <input
                    type="number"
                    min="1"
                    value={number}
                    onChange={(event) => 
                        setNumber(Number(event.target.value))
                    }
                    />
                </label>

                <div className="revision-hub-page__buttons">
                    <button
                    type="button"
                    onClick={() => generate("quiz")}
                    disabled={loading}
                    >
                        {
                            loading && mode === "quiz"
                            ? "Generating..."
                            : "Generating Quiz"
                        }
                    </button>

                    <button
                    type="button"
                    onClick={() => generate("flashcards")}
                    disabled={loading}
                    >
                        {
                            loading && mode === "flashcards"
                            ? "Generating..."
                            : "Create Flashcards"
                        }
                    </button>
                </div>
            </section>

            {error && (
                <div className="revision-hub-page__error">
                    {error}
                </div>
            )}

            {mode === "quiz" && questions.length > 0 && (
                <section className="revision-hub-page__content">
                    <h2>Quiz</h2>
                    {questions.map((question, index) => {
                        const text = 
                        question.question ||
                        question.text ||
                        question.prompt ||
                        `Question ${index + 1}`;

                        const options = 
                        question.options ||
                        question.choices ||
                        question.answers ||
                        [];

                        return (
                            <article
                            className="revision-hub-page__question"
                            key={index} 
                            >
                                <h3>
                                    {index + 1}.{text}
                                </h3>

                                <div>
                                    {options.map((option, optionIndex) => {
                                        const value = 
                                        typeof option === "string"
                                        ? option
                                        : option.text || option.answer || "";

                                        return (
                                            <button
                                            type="button"
                                            key={optionIndex}
                                            className= {
                                                selectedAnswer === optionIndex
                                                ? "revision-hub-page__option revision-hub-page__option--selected"
                                                : "revision-hub-page__option"
                                            } 
                                            onClick={() => {
                                                setCurrentQuestion(index);
                                                setSelectedAnswer(optionIndex);
                                            }}
                                            >
                                                {value}
                                            </button>
                                        );
                                    })}
                                </div>
                            </article>
                        );
                    })}

                    <button
                    type="button"
                    className="revision-hub-page__answer-button"
                    onClick={() => setShowAnswer(!showAnswer)}
                    >
                        {showAnswer ? "Hide answers": "Show answers"}
                    </button>

                    {showAnswer && (
                        <div className="revision-hub-page__answers">
                            {questions.map((question, index) => (
                                <p key={index}>
                                    <strong>{index + 1}:</strong>{" "}
                                    {question.answer ||
                                        question.correctAnswer ||
                                        question.correct_option ||
                                        "Answer provided by backend."}
                                </p>
                            ))}
                        </div>
                    )}
                </section>
            )}

            {mode === "flashcards" && cards.length > 0 && (
                <section className="revision-hub-page__flashcards">
                    <h2>Flashcards</h2>

                    {cards.map((card, index) => (
                        <button
                        type="button"
                        className="revision-hub-page__flashcard"
                        key={index}
                        onClick={() => {
                            setCurrentQuestion(index);
                            setShowAnswer(!showAnswer);
                        }}
                        >
                            {!showAnswer || currentQuestion !== index ? (
                                <>
                                <span>Question</span>
                                <strong>
                                    {card.question ||
                                    card.front ||
                                    card.term ||
                                    "Question"}
                                </strong>
                                </>
                            ) : (
                                <>
                                <span>Answer</span>
                                <strong>
                                    {card.answer ||
                                    card.back ||
                                    card.definition ||
                                    "Answer"}
                                </strong>
                                </>
                            )}
                        </button>
                    ))}
                </section>
            )}

            {!loading &&
            mode &&
            questions.length === 0 &&
            cards.length === 0 &&
            !error && (
                <div className="revision-hub-page__empty">
                    No revision content was returned.
                </div>
            )}
        </main>
    );
} 

export default RevisionHub;