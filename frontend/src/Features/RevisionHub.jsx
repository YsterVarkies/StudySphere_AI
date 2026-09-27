import { useEffect, useState } from "react";
import "./RevisionHub.css";

const API_URL = "http://localhost:5000/api";

function getSession() {
    try {
        const rawToken = localStorage.getItem("token") || localStorage.getItem("accessToken");

        if (rawToken) {
            return {
                token: rawToken,
            };
        }
        const sessionStr = localStorage.getItem("studysphere_session") || localStorage.getItem("user");

        if (!sessionStr) {
            return null;
        }

        if (!sessionStr.startsWith("{") && !sessionStr.startsWith("[")) {
            return {
                token: sessionStr,
            };
        }
        const parsed = JSON.parse(sessionStr);

        if (typeof parsed === "string") {
            return {
                token: parsed,
            };
        }
        return parsed;
    } catch (error) {
        console.error("Error reading session: ", error);
        return null;
    }
}

function getUserId() {
    const user = getSession();
    return (user?.user_id || user?.id || user?.studentNumber || user?.email || "");
}

function getToken() {
    const session = getSession();
    return (session?.token || session?.accessToken || localStorage.getItem("token") || "");
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
        try {
            setError("");

            const userId = getUserId();
            const token = getToken();
            const response = await fetch(
                `${API_URL}/documents${userId ? `?userid=${encodeURIComponent(userId)}` : ""}`,
                {
                    headers: {
                        Authorization: token ? `Bearer ${token}` : "",
                    },
                }
            );

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
            console.error("Load documents error:", error);

            setError(error.message || "Could not load study materials.");
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

    function getDocumentModuleId(document) {
        return (
            document.module_id ||
            document.moduleId
        );
    }

    function getSelectedDocument() {
        return documents.find(
            (document) => String(getDocumentId(document)) === String(selectedDocument)
        );
    }

    async function generate(type) {
        setError("");

        if (!selectedDocument) {
            setError("Please select a document.");
            return;
        }
        const document = getSelectedDocument();

        if (!document) {
            setError("The selected document could not be found.");
            return;
        }
        const documentId = getDocumentId(document);

        const moduleId = getDocumentModuleId(document);

        if (!documentId) {
            setError("The selected document does not have a document ID.");
            return;
        }

        if (!moduleId) {
            setError("The selected document does not have a module ID.");
            return;
        }

        const requestedNumber = Number(number);

        if (!Number.isInteger(requestedNumber) || requestedNumber < 1) {
            setError("Please enter a valid number greater than 0.");
            return;
        }

        setLoading(true);
        setContent(null);
        setMode(type);
        setCurrentQuestion(0);
        setSelectedAnswer(null);
        setShowAnswer(false);

        const endpoint =
            type === "quiz"
                ? `${API_URL}/quizzes/generate`
                : `${API_URL}/flashcards/generate`;

        try {
            const token = getToken();

            const requestBody = type === "quiz" ? {
                userId: getUserId(),
                documentId: Number(documentId),
                moduleId: Number(moduleId),
                numberOfQuestions: requestedNumber,
                title: `Quiz - ${getDocumentName(document)}`,
            }
                : {
                    userId: getUserId(),
                    documentId: Number(documentId),
                    moduleId: Number(moduleId),
                    numberOfCards: requestedNumber,
                    title: `Flashcards - ${getDocumentName(document)}`,
                };
            console.log(`Generating ${type}:`, requestBody);

            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token ? `Bearer ${token}` : "",
                },
                body: JSON.stringify(requestBody),
            });

            const data = await response.json().catch(() => ({}));

            console.log(`${type} response:`, data);

            if (!response.ok) {
                throw new Error(
                    data.message || `Could not generate ${type}.`
                );
            }

            const generated =
                data.data ||
                data.quiz ||
                data.flashcards ||
                data.questions ||
                data.cards ||
                data;

            setContent(generated);
        } catch (error) {
            console.error(`Generate ${type} error:`, error);
            setError(error.message || `Could not generate ${type}.`);
        } finally {
            setLoading(false);
        }
    }

    function getQuestions() {
        if (Array.isArray(content)) return content;
        if (content?.questions) return content.questions;
        if (content?.quiz) return content.quiz;
        if (content?.data?.questions) return content.data.questions;
        return [];
    }

    function getCards() {
        if (Array.isArray(content)) {
            return content;
        }

        if (content?.flashcards) {
            return content.flashcards;
        }

        if (content?.cards) {
            return content.cards;
        }

        if (content?.data?.flashcards) {
            return content.data.flashcards;
        }

        if (content?.data?.cards) {
            return content.data.cards;
        }
        return [];
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
                        onChange={(event) => {
                            setSelectedDocument(event.target.value);
                            setContent(null);
                            setMode(null);
                            setError("");
                            setCurrentQuestion(0);
                            setSelectedAnswer(null);
                            setShowAnswer(false);
                        }}
                    >
                        <option
                            value="">
                            Select a document
                        </option>
                        {documents.map((document) => {
                            const id = getDocumentId(document);
                            if (!id) {
                                return null;
                            }

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
                        max="50"
                        value={number}
                        onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            setNumber(Number.isNaN(nextValue) ? 1 : nextValue);
                        }}
                    />
                </label>

                <div className="revision-hub-page__buttons">
                    <button
                        type="button"
                        onClick={() => generate("quiz")}
                        disabled={loading || !selectedDocument}
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
                        disabled={loading || !selectedDocument}
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

                        const correctAnswer =
                            question.answer ||
                            question.correctAnswer ||
                            question.correct_option ||
                            question.correctOption;

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
                                                className={
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

                                {showAnswer && (
                                    <p className="revision-hub-page__correct-answer">
                                        <strong>
                                            Answer:
                                        </strong>{" "}
                                        {correctAnswer ||
                                            "Answer provided by backend."}
                                    </p>
                                )}
                            </article>
                        );
                    })}

                    <button
                        type="button"
                        className="revision-hub-page__answer-button"
                        onClick={() => setShowAnswer(!showAnswer)}
                    >
                        {showAnswer ? "Hide answers" : "Show answers"}
                    </button>
                </section>
            )}


            {mode === "flashcards" && cards.length > 0 && (
                <section className="revision-hub-page__flashcards">
                    <h2>Flashcards</h2>

                    {cards.map((card, index) => {
                        const isShowingAnswer = showAnswer && currentQuestion === index;
                        return (
                            <button
                                type="button"
                                className="revision-hub-page__flashcard"
                                key={index}
                                onClick={() => {
                                    setCurrentQuestion(index);
                                    setShowAnswer(isShowingAnswer ? false : true);
                                }}
                            >
                                {!isShowingAnswer ? (
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
                        );
                    }
                    )}
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