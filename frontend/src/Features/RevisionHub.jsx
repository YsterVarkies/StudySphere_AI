import { useEffect, useState } from "react";
import "./RevisionHub.css";

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

function RevisionHub() {
    const [documents, setDocuments] = useState([]);
    const [selectedDocument, setSelectedDocument] = useState("");
    const [number, setNumber] = useState(5);
    const [difficulty, setDifficulty] = useState("medium");
    const [mode, setMode] = useState(null);
    const [content, setContent] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState({});
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
        setSelectedAnswer({});
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
                difficulty: difficulty,
                title: `Quiz - ${getDocumentName(document)}`,
            }
                : {
                    userId: getUserId(),
                    documentId: Number(documentId),
                    moduleId: Number(moduleId),
                    numberOfCards: requestedNumber,
                    difficulty: difficulty,
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
                if (response.status === 502) {
                    throw new Error(
                        `The AI service is temporarily unavailable. Please try generating the ${type} again in a moment.`
                    );
                }

                if (response.status === 503) {
                    throw new Error(
                        `The AI service is currently unavailable. Please try again shortly.`
                    );
                }

                throw new Error(
                    data.message || `Could not generate ${type}. Please try again.`
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
            setContent(null);
            setError(
                error.message ||
                `Could not generate ${type}. Please try again.`
            );
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
    const currentQuizQuestion = questions[currentQuestion];
    const currentCard = cards[currentQuestion];

    function getQuestionText(question) {
        return (
            question?.question ||
            question?.text ||
            question?.prompt ||
            `Question ${currentQuestion + 1}`
        );
    }

    function getQuestionOptions(question) {
        return (
            question?.options ||
            question?.choices ||
            question?.answers ||
            []
        );
    }

    function getCorrectAnswer(question) {
        return (
            question?.correct_answer ||
            question?.correctAnswer ||
            question?.correct_option ||
            question?.correctOption ||
            question?.answer
        );
    }

    function getOptionText(option) {
        if (typeof option === "string") {
            return option;
        }
        return (
            option?.text ||
            option?.answer ||
            option?.option ||
            option?.label ||
            ""
        );
    }

    function getCorrectOptionIndex(question) {
        const correctAnswer = getCorrectAnswer(question);

        if (typeof correctAnswer !== "string") {
            return -1;
        }

        const answer = correctAnswer.trim().toUpperCase();

        if (answer.length !== 1) {
            return -1;
        }

        return answer.charCodeAt(0) - "A".charCodeAt(0);
    }

    function getCorrectOption(question) {
        const options = getQuestionOptions(question);
        const correctIndex = getCorrectOptionIndex(question);

        if (correctIndex < 0 || correctIndex >= options.length) {
            return null;
        }
        return options[correctIndex];
    }

    function isAnswerCorrect(question, optionIndex) {
        return optionIndex === getCorrectOptionIndex(question);
    }
        

    function nextQuestion() {
        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion((current) => current + 1);
            setShowAnswer(false);
        }
    }

    function previousQuestion() {
        if (currentQuestion > 0) {
            setCurrentQuestion((current) => current - 1);
            setShowAnswer(false);
        }
    }

    function nextCard() {
        if (currentQuestion < cards.length - 1) {
            setCurrentQuestion((current) => current + 1);
            setShowAnswer(false);
        }
    }

    function previousCard() {
        if (currentQuestion > 0) {
            setCurrentQuestion((current) => current - 1);
            setShowAnswer(false);
        }
    }

    function resetRevisionContent() {
        setContent(null);
        setMode(null);
        setCurrentQuestion(0);
        setSelectedAnswer({});
        setShowAnswer(false);
        setError("");
    }

    return (
        <main className="revision-hub-page">
            <header className="revision-hub-page__header">
                <h1>Revision Hub</h1>
                <p>Generate quizzes and flashcards from your study materials.</p>
            </header>

            <section className="revision-hub-page__controls">
                <label>Study Materials
                    <select
                        value={selectedDocument}
                        onChange={(event) => {
                            setSelectedDocument(event.target.value);
                            resetRevisionContent();
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
                        value={number}
                        onChange={(event) => {
                            const nextValue = Number(event.target.value);
                            setNumber(Number.isNaN(nextValue) || nextValue < 1 ? 1 : nextValue);
                        }}
                    />
                </label>

                <label>
                    Difficulty

                    <select
                        value={difficulty}
                        onChange={(event) => setDifficulty(event.target.value)}
                    >
                        <option value="easy">
                            Easy - Recall
                        </option>

                        <option value="medium">
                            Medium - Apply
                        </option>

                        <option value="hard">
                            Hard - Analyse
                        </option>
                    </select>
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
                                : "Generate Quiz"
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

            {mode === "quiz" && questions.length > 0 && currentQuizQuestion && (
                <section className="revision-hub-page__content">
                    <div className="revision-hub-page__quiz-header">
                        <div>
                            <h2>Quiz</h2>

                            <p>
                                {difficulty.charAt(0).toUpperCase() +
                                    difficulty.slice(1)}{" "}
                                difficulty
                            </p>
                        </div>
                        <span>
                            Question {currentQuestion + 1} of {""}
                            {questions.length}
                        </span>
                    </div>

                    <div className="revision-hub-page__progress">
                        <div className="revision-hub-page__progress-bar"
                            style={{
                                width: `${((currentQuestion + 1) /
                                    questions.length) *
                                    100
                                    }%`,
                            }}
                        />
                    </div>

                    <article className="revision-hub-page__question">
                        <h3>
                            {getQuestionText(currentQuizQuestion)}
                        </h3>

                        <div>
                            {getQuestionOptions(currentQuizQuestion).map((option, optionIndex) => {
                                const value = getOptionText(option);

                                const isSelected =
                                    selectedAnswer[currentQuestion] === optionIndex;

                                const isCorrect = isAnswerCorrect(
                                    currentQuizQuestion,
                                    optionIndex
                                );

                                let optionClass = "revision-hub-page__option";

                                if (isSelected && isCorrect) {
                                    optionClass += " revision-hub-page__option--correct";
                                } else if (isSelected && !isCorrect) {
                                    optionClass += " revision-hub-page__option--wrong";
                                }

                                return (
                                    <button
                                        type="button"
                                        key={optionIndex}
                                        className={optionClass}
                                        onClick={() => {
                                            setSelectedAnswer((previous) => ({
                                                ...previous,
                                                [currentQuestion]: optionIndex,
                                            }));

                                            setShowAnswer(true);
                                        }}
                                    >
                                        <span>{value}</span>

                                        {isSelected && (
                                            <span className="revision-hub-page__option-result">
                                                {isCorrect ? "✓ Correct" : "✕ Incorrect"}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {getQuestionOptions(currentQuizQuestion).length === 0 && (
                            <p className="revision-hub-page__no-options">
                                This question does not have multiple-choice options.
                            </p>
                        )}

                        {showAnswer && (
                            <div className="revision-hub-page__correct-answer" >
                                <strong>Answer</strong>
                                <p>
                                    {getOptionText(getCorrectOption(currentQuizQuestion)) || "The correct answer is unavailable."}
                                </p>
                            </div>
                        )}
                    </article>

                    <div className="revision-hub-page__quiz-actions" >
                        <button
                            type="button"
                            className="revision-hub-page__secondary-button"
                            onClick={previousQuestion}
                            disabled={currentQuestion === 0}
                        >
                            Previous
                        </button>

                        <button
                            type="button"
                            className="revision-hub-page__answer-button"
                            onClick={() =>
                                setShowAnswer((current) => !current)
                            }
                        >
                            {showAnswer
                                ? "Hide answer"
                                : "Show answer"}
                        </button>

                        <button
                            type="button"
                            className="revision-hub-page__next-button"
                            onClick={nextQuestion}
                            disabled={
                                currentQuestion ===
                                questions.length - 1
                            }
                        >
                            Next
                        </button>
                    </div>
                </section>
            )}

            {mode === "flashcards" && cards.length > 0 && currentCard && (
                <section className="revision-hub-page__flashcards">
                    <div className="revision-hub-page__flashcards-header">
                        <div>
                            <h2>Flashcards</h2>
                            <p>Click the card to reveal the answer.</p>
                        </div>

                        <span> Card {currentQuestion + 1} of {" "} {cards.length} </span>
                    </div>

                    <div className="revision-hub-page__progress">
                        <div className="revision-hub-page__progress-bar"
                            style={{
                                width: `${((currentQuestion + 1) / cards.length) * 100}%`,
                            }}
                        />
                    </div>

                    <button
                        type="button"
                        className="revision-hub-page__flashcard"
                        onClick={() =>
                            setShowAnswer((current) => !current)
                        }
                    >
                        <span> {showAnswer ? "Answer" : "Question"} </span>

                        <strong>
                            {!showAnswer
                                ? currentCard.front_text ||
                                currentCard.question ||
                                currentCard.front ||
                                currentCard.term ||
                                "Question"
                                : currentCard.back_text ||
                                currentCard.answer ||
                                currentCard.back ||
                                currentCard.definition ||
                                "Answer"}
                        </strong>
                        <small>
                            {showAnswer
                                ? "Click to see the question"
                                : "Click to reveal the answer"}
                        </small>
                    </button>
                    <div className="revision-hub-page__flashcard-actions">
                        <button
                            type="button"
                            className="revision-hub-page__secondary-button"
                            onClick={previousCard}
                            disabled={currentQuestion === 0}
                        >
                            Previous
                        </button>

                        <button
                            type="button"
                            className="revision-hub-page__next-button"
                            onClick={nextCard}
                            disabled={currentQuestion === cards.length - 1}
                        >
                            Next
                        </button>
                    </div>
                </section>
            )}
            {!loading && mode && questions.length === 0 && cards.length === 0 && !error && (
                <div className="revision-hub-page__empty">
                    No revision content was returned.
                </div>
            )}
        </main>
    );
}
export default RevisionHub;