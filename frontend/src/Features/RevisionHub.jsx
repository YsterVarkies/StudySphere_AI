import {  useEffect, useState } from "react";  // React hooks, useState- stores changing data and useEffect- run code when things happen, like the component first loads.
import "./RevisionHub.css"; // imports the CSS file for this component

const API_URL = "http://localhost:5000/api"; // base URL for Backend API


/* Session Helpers */

// Read the user's saved login/session information
function getSession() {
    try {
        // data stored as strings
        const raw = localStorage.getItem("studysphere_session");

        // if ther is no saved session, return an empty session
        if (!raw) {
            return {
                token: "",
                user: null,
            };
        }

        // Convert the JSON string back into a JavaScript object
        const session = JSON.parse(raw);

        //return only the needed information
        // ||-Fallback value
        // ?-optional chaining
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
//Get the user's ID from the session
function getUserId() {
    return getSession()?.user?.user_id || "";
}
//Get the authentication token from the session
function getToken() {
    return getSession()?.token || "";
}

/* Main Component */
function RevisionHub() {

    //State
    const [documents, setDocuments] = useState([]); //Stores document loaded from backend
    const [selectedDocument, setSelectedDocument] = useState(""); //Stores ID of document selected in the dropdown 
    const [number, setNumber] = useState(5); // number questions/cards the user wants 
    const [difficulty, setDifficulty] = useState("medium"); //selected difficulty
    const [mode, setMode] = useState(null); // stores the type of revision quiz/ flashcard
    const [content, setContent] = useState(null); // stores quiz/flashcard data returned by the backend 
    const [currentQuestion, setCurrentQuestion] = useState(0); //keep track of question/card the user is viewing 
    const [selectedAnswer, setSelectedAnswer] = useState({}); //stores the answers
    const [showAnswer, setShowAnswer] = useState(false); //controls whether the answer should be displayed
    const [loading, setLoading] = useState(false); //used while API request is running. true = currently loading, false = not loading
    const [error, setError] = useState(""); //stores an error message 

    /* Load Documents when Component Starts */
    useEffect(() => {
        loadDocuments(); //when user opens RevisionHub load the documents.
    }, []);

    /* Load Documents From Backend */
    async function loadDocuments() {
        try {
            setError(""); // clear previous error

            // get information from the logged-in session
            const userId = getUserId();
            const token = getToken();
            const response = await fetch(
                `${API_URL}/documents${userId ? `?userid=${encodeURIComponent(userId)}` : ""}`,
                {
                    headers: {
                        Authorization: token ? `Bearer ${token}` : "", // send the authentication token to the backend 
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Could not load documents (${response.status})`);
            }

            //convert the JSON response from the backend into a JavaScript object 
            const data = await response.json();

            //different backend response formats
            const list =
                data.documents ||
                data.data ||
                (Array.isArray(data) ? data : []);

            setDocuments(list); // store the documents in React state
        } catch (error) {
            console.error("Load documents error:", error);

            setError(error.message || "Could not load study materials.");
        }
    }

    /* Document Helper Functions */

    function getDocumentId(document) {
        return document.document_id || document.id;
    }

    //Gets document's display name 
    function getDocumentName(document) {
        return (
            document.name ||
            document.file_name ||
            document.fileName ||
            document.title ||
            "Document"
        );
    }

    //Gets module ID associated with the document
    function getDocumentModuleId(document) {
        return (
            document.module_id ||
            document.moduleId
        );
    }

    // Find the document object that match ID selected 
    function getSelectedDocument() {
        return documents.find(
            (document) => String(getDocumentId(document)) === String(selectedDocument)
        );
    }

    /* Generate Quiz or flashcards */
    async function generate(type) {
        setError(""); //clear error 

        // make sure the user selects a document 
        if (!selectedDocument) {
            setError("Please select a document.");
            return;
        }
        const document = getSelectedDocument(); // find the document object 

        // the ID selected does not match a document
        if (!document) {
            setError("The selected document could not be found.");
            return;
        }
        //get document ID and module ID 
        const documentId = getDocumentId(document);
        const moduleId = getDocumentModuleId(document);

        // check if the document has an ID
        if (!documentId) {
            setError("The selected document does not have a document ID.");
            return;
        }
        // check is document has a module ID 
        if (!moduleId) {
            setError("The selected document does not have a module ID.");
            return;
        }
        // convert number input into JavaScript number 
        const requestedNumber = Number(number);

        // check if the number is valid whole number 
        if (!Number.isInteger(requestedNumber) || requestedNumber < 1) {
            setError("Please enter a valid number greater than 0.");
            return;
        }

        /* Prepare UI For Generation */
        setLoading(true);
        setContent(null);
        setMode(type);
        setCurrentQuestion(0);
        setSelectedAnswer({});
        setShowAnswer(false);

        /* Choose API Endpoint */
        const endpoint =
            type === "quiz"
                ? `${API_URL}/quizzes/generate`
                : `${API_URL}/flashcards/generate`;

        try {
            const token = getToken();

            /* Create Request Body */
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

            /* Send Request to backend */
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: token ? `Bearer ${token}` : "",
                },
                body: JSON.stringify(requestBody), //convert object into JSON text
            });

            const data = await response.json().catch(() => ({})); //read the JSON response

            console.log(`${type} response:`, data);

            /* Handle HTTP Errors */
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

            /* Find Generated Content */
            const generated =
                data.data ||
                data.quiz ||
                data.flashcards ||
                data.questions ||
                data.cards ||
                data;

            setContent(generated); // store content in React state
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

    /* Extract Quiz Questions */
    function getQuestions() {
        if (Array.isArray(content)) return content;
        if (content?.questions) return content.questions;
        if (content?.quiz) return content.quiz;
        if (content?.data?.questions) return content.data.questions;
        return [];
    }

    /* Extract Flashcards */
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

    /* Current Content */
    const questions = getQuestions();
    const cards = getCards();
    const currentQuizQuestion = questions[currentQuestion];
    const currentCard = cards[currentQuestion];

    /* Quiz Helper Functions */

    // Get hte text of a question
    function getQuestionText(question) {
        return (
            question?.question ||
            question?.text ||
            question?.prompt ||
            `Question ${currentQuestion + 1}`
        );
    }

    // Get the answer options
    function getQuestionOptions(question) {
        return (
            question?.options ||
            question?.choices ||
            question?.answers ||
            []
        );
    }

    // Get correct answer vlaue
    function getCorrectAnswer(question) {
        return (
            question?.correct_answer ||
            question?.correctAnswer ||
            question?.correct_option ||
            question?.correctOption ||
            question?.answer
        );
    }

    // Convert option into text
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

    /*  Convert A/B/C/D into an Array index */
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

    // Get the actual option that is correct
    function getCorrectOption(question) {
        const options = getQuestionOptions(question);
        const correctIndex = getCorrectOptionIndex(question);

        if (correctIndex < 0 || correctIndex >= options.length) {
            return null;
        }
        return options[correctIndex];
    }


    // check selected option is correct
    function isAnswerCorrect(question, optionIndex) {
        return optionIndex === getCorrectOptionIndex(question);
    }


    /* Quiz Navigation */
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

    /* Flashcard Navigation */
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

    /* Reset Revision Content */
    function resetRevisionContent() {
        setContent(null);
        setMode(null);
        setCurrentQuestion(0);
        setSelectedAnswer({});
        setShowAnswer(false);
        setError("");
    }

    /* USER Interface */
    return (
        <main className="revision-hub-page">
            {/* PAGE HEADING */}
            <header className="revision-hub-page__header">
                <h1>Revision Hub</h1>
                <p>Generate quizzes and flashcards from your study materials.</p>
            </header>
            {/* CONTROLS */}
            <section className="revision-hub-page__controls">
                {/* DOCUMENT SELECTOR */}
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
                {/* NUMBER INPUT */}
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
                {/* DIFFICULTY */}
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
                {/* GENERATE BUTTONS */}
                <div className="revision-hub-page__buttons">
                    {/* QUIZ BUTTON */}
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
                    {/* FLASHCARD BUTTON */}
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
            {/* ERROR MESSAGE */}
            {error && (
                <div className="revision-hub-page__error">
                    {error}
                </div>
            )}
            {/* QUIZ */}
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
                    {/* QUESTION */}
                    <article className="revision-hub-page__question">
                        <h3>
                            {getQuestionText(currentQuizQuestion)}
                        </h3>
                        {/* ANSWER OPTIONS */}
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
                        {/* SHOW CORRECT ANSWER */}
                        {showAnswer && (
                            <div className="revision-hub-page__correct-answer" >
                                <strong>Answer</strong>
                                <p>
                                    {getOptionText(getCorrectOption(currentQuizQuestion)) || "The correct answer is unavailable."}
                                </p>
                            </div>
                        )}
                    </article>
                    {/* QUIZ NAVIGATION */}
                    <div className="revision-hub-page__quiz-actions" >
                        <button
                            type="button"
                            className="revision-hub-page__secondary-button"
                            onClick={previousQuestion}
                            disabled={currentQuestion === 0}
                        >
                            Previous
                        </button>
                        {/* TOGGLE ANSWER BETWEEN VISIBLE AND HIDDEN */}
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
            {/* FLASHCARDS */}
            {mode === "flashcards" && cards.length > 0 && currentCard && (
                <section className="revision-hub-page__flashcards">
                    <div className="revision-hub-page__flashcards-header">
                        <div>
                            <h2>Flashcards</h2>
                            <p>Click the card to reveal the answer.</p>
                        </div>

                        <span> Card {currentQuestion + 1} of {" "} {cards.length} </span>
                    </div>
                    {/* FLASHCARD PROGRESS */}
                    <div className="revision-hub-page__progress">
                        <div className="revision-hub-page__progress-bar"
                            style={{
                                width: `${((currentQuestion + 1) / cards.length) * 100}%`,
                            }}
                        />
                    </div>
                    {/* FLASHCARD */}
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

                    {/* FLASHCARD NAVIGATION */}
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
            {/* EMPTY STATE */}
            {!loading && mode && questions.length === 0 && cards.length === 0 && !error && (
                <div className="revision-hub-page__empty">
                    No revision content was returned.
                </div>
            )}
        </main>
    );
}
export default RevisionHub;