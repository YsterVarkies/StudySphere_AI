import { useEffect, useRef, useState } from "react";
import AIChat from "./AIChat";
import "./StudyMaterials.css"; // Import the CSS file for styling

/* Global configuration constants  */
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api"; // localhost fallback
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB file size limit 
const MAX_DOCUMENTS = 20; // Max documents per student
const MAX_DOC_PER_MODULE = 5; // max documents per module

//Allowed types for uploaded study materials
const ALLOWED_TYPES = {
    pdf: "application/pdf", // .pdf files
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx files
    txt: "text/plain", // .txt files
};

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

function getUserId() {
    return getSession()?.user?.user_id || "";
}

function getToken() {
    return getSession()?.token || "";
}

/**
 * Main component for managing and viewing study materials.
 */
function StudyMaterials({ onDocumentUploaded }) {
    // references and state hooks
    const fileInputRef = useRef(null);
    const uploadingRef = useRef(false);
    const [dragDoc, setDragDoc] = useState(false);//drag docs to upload area
    const [documents, setDocuments] = useState([]); //list of all loaded docuemnts
    const [modules, setModules] = useState([]); // list of available modules
    const [modulesLoading, setModulesLoading] = useState(false); // loading state for module fetch
    const [modulesError, setModulesError] = useState(""); // error message for module fetch
    const [selectedModule, setSelectedModule] = useState(""); // filter selection for module view
    const [searchTerm, setSearchTerm] = useState(""); //search input filter
    const [selectedFile, setSelectedFile] = useState(null); // file staged for upload
    const [moduleId, setModuleId] = useState(""); // target module for upload modal
    const [moduleSearch, setModuleSearch] = useState(""); // search term for module dropdown
    const [title, setTitle] = useState(""); // custom title for document upload
    const [loading, setLoading] = useState(false); // loading state for doucent fetch
    const [uploading, setUploading] = useState(false); // upload network request state
    const [deleteDoc, setDeleteDoc] = useState(null);//remeber which document is selected for deletion
    const [deleting, setDeleting] = useState(false); // track the deletion request
    const [error, setError] = useState(""); // error message banner
    const [message, setMessage] = useState(""); // success message banner
    const [activeView, setActiveView] = useState("list"); // view toggle: "list" or "chat"
    const [activeChatDoc, setActiveChatDoc] = useState(null); //document selected for AI chat 

    //fetch documents and modules on component mount
    useEffect(() => {
        loadDocuments();
        loadModules();
    }, []);

    /**
     * fetches study documents from the backend API
     */
    async function loadDocuments() {
        setLoading(true);
        setError("");
        try {
            const token = getToken();

            const response = await fetch(`${API_URL}/documents`, {
                headers: {
                    Authorization: token ? `Bearer ${token}` : "",
                },
            });

            if (!response.ok) {
                throw new Error(`Could not load documents (Status: ${response.status})`);
            }

            const data = await response.json();
            const list = data.documents || data.data || (Array.isArray(data) ? data : []);
            setDocuments(list);

        } catch (error) {
            console.error("Load documents error: ", error);
            setError(error.message || "An error occurred while loading documents");
        } finally {
            setLoading(false);
        }
    }

    /**
     * fetches available modules from the backend API
     */
    async function loadModules() {

        setModulesLoading(true);// set loading state for modules
        setModulesError(""); // clear any previous module fetch errors

        try {
            const token = getToken(); // token retrieval
            const response = await fetch(`${API_URL}/modules`, {
                headers: {
                    Authorization: token ? `Bearer ${token}` : "", //authorization header
                },
            });

            if (!response.ok) {
                if (response.status === 403) {
                    throw new Error("Unable to load modules at the moment. Please try again later or contact support.");
                }
                throw new Error(`Could not load modules (Status: ${response.status})`);
            }

            const data = await response.json();
            const list = data.modules || data.data || (Array.isArray(data) ? data : []);

            if (!Array.isArray(list)) {
                throw new Error("Invalid module list received.");
            }

            setModules(list);

        } catch (error) {
            console.error("Load modules error: ", error);
            setModules([]); // clear modules on error
            setModulesError(error.message || "An error occurred while loading modules");
        } finally {
            setModulesLoading(false); // reset loading state
        }
    }

    /* Check File */
    function checkAndSelectFile(file) {
        if (!file || uploadingRef.current) {
            return;
        }

        setError("");
        setMessage("");

        //Check doc storage limit
        if (documents.length >= MAX_DOCUMENTS) {
            setError("You have reached the maximum of 20 documents.");
            return;
        }
        //check file extention
        const fileExtension = file.name.split(".").pop()?.toLowerCase();
        const fileType = ALLOWED_TYPES[fileExtension];

        if (!fileType || (file.type && file.type !== fileType)) {
            setError("Invalid file type. Please select a PDF, DOCX, or TXT file.");
            return;
        }

        // do not accept empty files
        if (file.size === 0) {
            setError("The selected file is empty.");
            return;
        }

        // do not accept files lareger than 25MB
        if (file.size > MAX_FILE_SIZE) {
            setError("File size exceeds the 25 MB limit.");
            return;
        }

        //passed validations
        setSelectedFile(file);
        setTitle(file.name);
    }
    /* File Picker */
    function handleFileChange(event) {
        const file = event.target.files?.[0];

        checkAndSelectFile(file);
        event.target.value = "";
    }


    /**
     * uploads the selected file along with metadata and module mapping to the backend.
     */
    async function handleUpload(targetModuleId) {

        //prevent simultaneous uploads
        if (uploadingRef.current) {
            return;
        }

        const activeModuleId = targetModuleId || moduleId;
        //prevent uploading when overall doc limit reached
        if (documents.length >= MAX_DOCUMENTS) {
            setError(`You have reached the maximum of ${MAX_DOCUMENTS} documents. Delete an existing document before uploading another.`);
            setMessage("");
            return;
        }
        if (!selectedFile) {
            setError("Please select a file to upload.");
            return;
        }

        const noTitle = title.trim();
        if (!noTitle) {
            setError("Please enter a document title.");
            return;
        }

        if (!activeModuleId || !String(activeModuleId).trim()) {
            setError("Please select a module.");
            return;
        }
        // match selected module option against id, module_id, or code to ensure correct linkage
        const foundModule = modules.find(
            (mod) => String(mod.module_id ?? mod.id) === String(activeModuleId)
        );

        if (!foundModule) {
            setError("Please select a valid module from the list.");
            return;
        }
        // resolve the precise identifier required by the backend database foreign key column
        const targetModuleValue = foundModule.module_id ?? foundModule.id;

        if (getModuleDocCount(targetModuleValue) >= MAX_DOC_PER_MODULE) {
            setError(
                `This module has reached its limit of ${MAX_DOC_PER_MODULE} documents. Delete an existing document before uploading another.`
            );
            setMessage("");
            return;
        }

        uploadingRef.current = true;
        setUploading(true);
        setError("");
        setMessage("");

        try {

            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("title", noTitle);
            formData.append("moduleId", targetModuleValue); //pass resolved ID/code to backend

            const token = getToken();

            const response = await fetch(`${API_URL}/documents`, {
                method: "POST",
                headers: {
                    Authorization: token ? `Bearer ${token}` : "",
                },
                body: formData,
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(data.message || `Document upload failed (Status: ${response.status})`);
            }

            setMessage("Document uploaded successfully!");
            setSelectedFile(null);
            setModuleId("");
            setModuleSearch("");
            setTitle("");

            // refresh document list after successful upload 
            await loadDocuments();
            onDocumentUploaded?.();
        } catch (error) {
            console.error("Upload error: ", error);
            setError(error.message || "An error occurred during upload");
        } finally {
            uploadingRef.current = false;
            setUploading(false);
        }
    }

    /*  Delete a document form the backend database */
    async function handleDeleteDocument() { // creates an asynchronous function because deleting a document requires communication with the backend
        if (!deleteDoc || deleting) return; //stops the function if no document was selected or a deletion is already in progress

        const documentId = deleteDoc.document_id ?? deleteDoc.id; //Gets the selected document's database ID

        if (!documentId) { // Checks the document ID
            setError("Could not identify the document to delete.");
            return;
        }

        setDeleting(true); //marks the deletion as in progress
        setError(""); //clears previous error
        setMessage(""); // Clears previous success message

        try {
            const token = getToken();

            if (!token) {
                throw new Error("Please log in again to delete documents.");
            }

            const response = await fetch(`${API_URL}/documents/${documentId}`, { //backend request
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) { //check if backend accepted the request
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || `Unable to delete document (Status: ${response.status})`);
            }

            setDeleteDoc(null); //Clears selected document and close confirmation popup
            await loadDocuments(); //fetch updated list from database
            setMessage("Document deleted successfully.");

        } catch (error) {
            console.error("Delete document error: ", error);
            setError(error.message || "Unable to delete document.");
            setDeleteDoc(null); //close popup when deletion fails
        } finally {
            setDeleting(false);
        }
    }


    /* OPEN DOCUMENT */
    async function handleOpenDocument(document) {
        const documentId = document.document_id || document.id;

        if (!documentId) {
            setError("Could not identify this document.");
            return;
        }
        try {
            setError("");

            const token = getToken();
            if (!token) {
                setError("You are not authenticated. Please log in again.");
                return;
            }
            const response = await fetch(
                `${API_URL}/documents/${documentId}/download`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );
            if (!response.ok) {
                throw new Error(`Could not open document (Status: ${response.status})`);
            }
            const blob = await response.blob();
            const fileUrl = URL.createObjectURL(blob);
            window.open(fileUrl, "_blank", "noopener,noreferrer");

            //Clean up the temporaty browser URl later
            setTimeout(() => {
                URL.revokeObjectURL(fileUrl);
            }, 60000);
        } catch (error) {
            console.error("Open document error:", error);
            setError(error.message || "Could not open document.");
        }
    }

    // helper function to extract document name safely from various schema property names
    function getDocumentName(document) {
        return (document.title || document.name || document.file_name || document.fileName || document.filename || "Untitled Document");
    }

    // helper function to extract module name safely from document objects
    function getDocumentModule(document) {
        return (document.moduleName || document.module_name || document.module || "Unknown Module");
    }

    // formats raw file bytes into human-readable sizes (B, KB, MB)
    function formatFileSize(size) {
        if (!size) return "Unknown Size";
        const bytes = Number(size);
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    // filter modules based on search keywords
    const filteredModules = modules.filter((module) => {
        const search = moduleSearch.trim().toLowerCase();
        const name = String(module.module_name ?? module.name ?? module.title ?? "").toLowerCase();
        const code = String(module.module_code ?? module.code ?? "").toLowerCase();
        return name.includes(search) || code.includes(search);
    });

    //number of uploaded documents
    const totalDocs = documents.length;

    //Count uploaded docs for a module
    const getModuleDocCount = (selectedModuleId) => {
        return documents.filter((document) => String(document.module_id ?? document.moduleId) === String(selectedModuleId)).length;
    };

    //filter documents based on search keywords and selected module criteria
    const filteredDocuments = documents.filter((document) => {
        const name = getDocumentName(document).toLowerCase();
        const documentModuleId = String(
            document.module_id ??
            document.moduleId ??
            document.moduleCode ??
            document.code ??
            ""
        );
        const matchesSearch = name.includes(searchTerm.toLowerCase());
        const matchesModule = !selectedModule || documentModuleId === String(selectedModule);
        return matchesSearch && matchesModule;
    });

    // render AI chat view if active view is switched
    if (activeView === "chat") {
        return (
            <main className="study-materials-page">
                <header className="study-materials-page__header">
                    <div>
                        <h1>AI Chat</h1>
                        <p>Chatting about: <strong>{getDocumentName(activeChatDoc)}</strong></p>
                    </div>
                    <button
                        type="button"
                        className="study-materials-page__upload-top-btn"
                        onClick={() => {
                            setActiveView("list");
                            setActiveChatDoc(null);
                        }}
                    >
                        ← Back to Study Materials
                    </button>
                </header>

                <div style={{ marginTop: "20px" }}>
                    <AIChat initialDocument={activeChatDoc} />
                </div>
            </main>
        );
    }

    // render main study materials dashboard view
    return (
        <main className="study-materials-page">
            <header className="study-materials-page__header">
                <div>
                    <h1>Study Materials</h1>
                    <p>Upload and organise documents by module.</p>
                </div>
                <button
                    type="button"
                    className="study-materials-page__upload-top-btn"
                    onClick={() => fileInputRef.current?.click()}
                >
                    +  Upload document
                </button>
            </header>
            {/* Hidden file input element triggered via ref */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                hidden
                onChange={handleFileChange}
            />
            {/* Status alerts */}
            {error && <div className="study-materials-page__error">{error}</div>}
            {message && <div className="study-materials-page__success">{message}</div>}

            {/* Modal popup dialog when a file is staged for upload */}
            {selectedFile && (
                <div className="study-materials-page__modal-backdrop">
                    <div className="study-materials-page__modal">
                        <h2>Upload Document</h2>
                        {error && (
                            <p className="study-materials-page__error" role="alert">
                                {error}
                            </p>
                        )}
                        {totalDocs >= MAX_DOCUMENTS && (
                            <p className="study-materials-page__module-limit-warning">
                                Your document storage is full ({totalDocs} / {MAX_DOCUMENTS}).
                                Delete an existing document before uploading another.
                            </p>
                        )}
                        <div className="study-materials-page__selected">
                            <strong>{selectedFile.name}</strong>
                            <span>({formatFileSize(selectedFile.size)})</span>
                        </div>

                        {/* --- ADD TITLE INPUT FIELD HERE --- */}
                        <div className="study-materials-module" style={{ marginBottom: "15px" }}>
                            <label htmlFor="document-title">Document Title</label>
                            <input
                                id="document-title"
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Enter document title"
                            />
                        </div>

                        <div className="study-materials-module">
                            <label htmlFor="study-materials-module">Module</label>
                            {modulesLoading ? (
                                <p>Loading modules...</p>
                            ) : modulesError ? (
                                <div>
                                    <p className="study-materials-page__error">
                                        {modulesError}
                                    </p>
                                    <button
                                        type="button"
                                        className="study-materials-page__retry-btn"
                                        onClick={loadModules}
                                    >
                                        Retry Loading Modules
                                    </button>
                                </div>
                            ) : modules.length === 0 ? (
                                <div>
                                    <p>No modules are available</p>
                                    <button
                                        type="button"
                                        onClick={loadModules}
                                    >
                                        Refresh Modules
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <input
                                        type="search"
                                        placeholder="Search modules by name or code..."
                                        value={moduleSearch}
                                        onChange={(event) => {
                                            setModuleSearch(event.target.value);
                                            setModuleId("");
                                        }}
                                    />
                                    <select
                                        id="study-materials-module"
                                        value={moduleId}
                                        onChange={(event) => setModuleId(event.target.value)}
                                    >
                                        <option value="">Select a Module</option>
                                        {filteredModules.map((module) => {
                                            const modId = module.module_id ?? module.id;
                                            const name = module.name ?? module.module_name ?? module.title ?? "Unnamed Module";
                                            const code = module.code ?? module.module_code ?? "";

                                            if (modId == null) return null;

                                            return (
                                                <option key={modId} value={modId}>
                                                    {name} {code ? `(${code})` : ''}
                                                </option>
                                            );
                                        })}
                                    </select>

                                    {moduleId && (
                                        <>
                                            <p className="study-materials-page__module-count">
                                                Documents in this module: {getModuleDocCount(moduleId)} / {MAX_DOC_PER_MODULE}
                                            </p>

                                            {getModuleDocCount(moduleId) >= MAX_DOC_PER_MODULE && (
                                                <p className="study-materials-page__module-limit-warning">
                                                    This module has reached its limit of {MAX_DOC_PER_MODULE} documents.
                                                    Delete an existing document before uploading another.
                                                </p>
                                            )}
                                        </>
                                    )}

                                    {filteredModules.length === 0 && (
                                        <p>No modules match your search.</p>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="study-materials-page__modal-actions">
                            <button
                                type="button"
                                className="study-materials-page__btn-cancel"
                                disabled={uploading}
                                onClick={() => {
                                    setSelectedFile(null);
                                    setModuleId("");
                                    setModuleSearch("");
                                    setTitle("");
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="study-materials-page__btn-confirm"
                                onClick={() => handleUpload()}
                                disabled={
                                    uploading ||
                                    modulesLoading ||
                                    !!modulesError ||
                                    !modules.some((module) => String(module.module_id ?? module.id) === String(moduleId)
                                    ) || totalDocs >= MAX_DOCUMENTS || getModuleDocCount(moduleId) >= MAX_DOC_PER_MODULE
                                }
                            >
                                {uploading ? "Uploading..." : "Upload Document"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Delete Document Confirmation Popup */}
            {deleteDoc && ( //display popup when document is selected for deletion
                <div className="study-materials-page__modal-backdrop">
                    <div
                        className="study-materials-page__modal study-materials-page__delete-modal"
                        role="alertdialog" //confirmation dialog
                        aria-modal="true" //indicates that the popup requires the user's attention
                        aria-labelledby="delete-document-title" //connects dialog to its heading for accessibility
                    >
                        <h2 id="delete-document-title">Delete Document?</h2>
                        <p>Are you sure you want to delete{" "}
                            <strong>{getDocumentName(deleteDoc)}</strong>? {/* Shows the name of the document selected for deletion */}
                        </p>
                        <p className="study-materials-page__delete-warning">
                            ⚠️ This action cannot be undone.
                        </p>

                        <div className="study-materials-page__modal-actions">
                            <button
                                type="button"
                                className="study-materials-page__btn-cancel"
                                onClick={() => setDeleteDoc(null)} // close popup when cancel is clicked
                                disabled={deleting} //prevent clicking buttons repeatedly during deletion
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="study-materials-page__btn-delete-confirm"
                                onClick={handleDeleteDocument} //calls funtion handleDeleteDocument
                                disabled={deleting}
                            >
                                {deleting ? "Deleting..." : "Yes, Delete"} {/* change button text while the request is processing */}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter controls section (Module Dropdown & Search Baer) */}
            <section className="study-materials-page__controls">
                <select value={selectedModule} onChange={(event) => setSelectedModule(event.target.value)}>
                    <option value="">All Modules</option>
                    {modules.map((module) => {
                        const modId = module.module_id ?? module.id;
                        const name = module.name ?? module.module_name ?? module.title ?? "Unnamed Module";
                        const code = module.code ?? module.module_code ?? "";

                        if (!modId) return null;
                        return (
                            <option key={modId} value={modId}>
                                {name} {code ? `(${code})` : ''}
                            </option>

                        );
                    })}
                </select>
                <div className="study-materials-page__search-wrapper">
                    <span className="study-materials-page__search-icon">🔍</span>
                    <input
                        type="search"
                        placeholder="Search documents..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>
            </section>

            {/* Doc Storage Card */}
            <div className="study-materials-page__storage-card">
                <div className="study-materials-page__storage-heading">
                    <h2>Document Storage</h2>
                    <span>{totalDocs} / {MAX_DOCUMENTS} documents</span>
                </div>

                <div className="study-materials-page__track-storage">
                    <div
                        className="study-materials-page__fill-storage"
                        style={{
                            width: `${Math.min((totalDocs / MAX_DOCUMENTS) * 100, 100)}%`
                        }}
                    />
                </div>

                <div className="study-materials-page__storage-details">
                    <span>{Math.round((totalDocs / MAX_DOCUMENTS) * 100)}% used</span>
                    <span>{Math.max(MAX_DOCUMENTS - totalDocs, 0)} slots remaining</span>
                </div>
                {totalDocs >= MAX_DOCUMENTS && (
                    <p className="study-materials-page__total-limit-warning">
                        You have reached the maximum of {MAX_DOCUMENTS} documents.
                        Delete an existing document before uploading another.
                    </p>
                )}
            </div>

            {/* Documents Grid/ List Section */}
            <section className="study-materials-page__documents">
                {loading ? (
                    <p>Loading Documents...</p>
                ) : (
                    <>
                    {filteredDocuments.length === 0 && (
                        <p className="study-materials-page__empty-message">
                            {documents.length === 0 
                            ? "No documents uploaded yet. Upload a file to get started."
                            : "No documents match your search or selected module."}
                        </p>
                    )}
                        {filteredDocuments.map((document) => {
                            const docId = document.document_id ?? document.id;

                            return (
                                <article className="study-materials-page__document" key={docId}>
                                    <div className="study-materials-page__document-content">
                                        <div className="study-materials-page__document-header-row">
                                            <div className="study-materials-page__document-icon">📄</div>
                                            <div className="study-materials-page__document-info">
                                                <h3>{getDocumentName(document)}</h3>
                                                <p>{getDocumentModule(document)} · {formatFileSize(document.file_size ?? document.size)}</p>
                                            </div>
                                            <button
                                                type="button"
                                                className="study-materials-page__delete-btn"
                                                onClick={() => setDeleteDoc(document)}
                                                aria-label={`Delete ${getDocumentName(document)}`}
                                                title="Delete document"
                                            >
                                                <svg
                                                    width="18"
                                                    height="18"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    aria-hidden="true"
                                                >
                                                    <path d="M3 6h18" />
                                                    <path d="M8 6V4h8v2" />
                                                    <path d="M5 6l1 15h12l1-15" />
                                                    <path d="M10 10v7" />
                                                    <path d="M14 10v7" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Actions Footer Container */}
                                    <div className="study-materials-page__document-actions">
                                        <button
                                            type="button"
                                            className="study-materials-page__open-btn"
                                            onClick={() => handleOpenDocument(document)}
                                        >
                                            Open Document
                                        </button>

                                        <button
                                            type="button"
                                            className="study-materials-page__chat-btn"
                                            onClick={() => {
                                                setActiveChatDoc(document);
                                                setActiveView("chat");
                                            }}
                                        >
                                            💬 Chat with this
                                        </button>
                                    </div>
                                </article>
                            );
                        })}

                        {/* Inline Upload DropZone Card */}
                        <div className={`study-materials-page__dropzone-card ${dragDoc ? "study-materials-page__dropzone-card--dragging" : ""
                            }`}
                            role="button"
                            tabIndex={0}
                            aria-label="Choose or drop a document to upload"
                            aria-disabled={uploading}

                            onClick={() => {
                                if (!uploading) {
                                    fileInputRef.current?.click();
                                }
                            }}

                            onKeyDown={(event) => {
                                if (!uploading && (event.key === "Enter" || event.key === " ")
                                ) {
                                    event.preventDefault();
                                    fileInputRef.current?.click();
                                }
                            }}

                            onDragOver={(event) => {
                                event.preventDefault();

                                if (!uploading) {
                                    event.dataTransfer.dropEffect = "copy";
                                    setDragDoc(true);
                                }
                            }}
                            
                            onDragLeave={(event) => {
                                if (!event.currentTarget.contains(event.relatedTarget)) {
                                    setDragDoc(false);
                                }
                            }}
                            
                            onDrop={(event) => {
                                event.preventDefault();
                                setDragDoc(false);

                                if (uploadingRef.current) return;

                                const files = event.dataTransfer.files;

                                if (files.length === 0) return;

                                if (files.length > 1) {
                                    setError("Please upload one document at a time.");
                                    setMessage("");
                                    return;
                                }
                                checkAndSelectFile(files[0]);
                            }}
                        >
                            <div className="study-materials-page__dropzone-icon"
                            aria-hidden="true"                           
                            >
                                {/* simple upload icon */}
                                <svg
                                width="28"
                                height="28"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                >
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="17 8 12 3 7 8" />
                                    <line x1="12" y1="3" x2="12" y2="15" />
                                </svg>
                            </div>
                            <p>Drag and drop a PDF, DOCX or TXT file here, 
                                or click to browse.
                            </p>
                            <small>Maximum file size: 25 MB</small>

                        </div>
                    </>
                )}
            </section>
        </main>
    );
}

export default StudyMaterials;