import { useEffect, useRef, useState } from "react";
import AIChat from "./AIChat";
import "./StudyMaterials.css"; // Import the CSS file for styling

/* Global configuration constants  */
const API_URL = "http://localhost:5000/api"; // Backend API base URL
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB file size limit 

//Allowed types for uploaded study materials
const ALLOWED_TYPES = [
    "application/pdf", // .pdf files
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx files
    "text/plain", // .txt files
];

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
function StudyMaterials() {
    // references and state hooks
    const fileInputRef = useRef(null);
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
                    throw new Error("You are not authorised to access modules. Please contact the administrator.");
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

    /**
     * handles file selection validation (type and size checks)
     */
    function handleFileChange(event) {
        const file = event.target.files?.[0];
        if (!file) return;

        setError("");
        setMessage("");

        const fileExtension = file.name.split(".").pop()?.toLowerCase();
        const allowedExtensions = ["pdf", "docx", "txt"];

        //validate supported file extensions/types
        if (!ALLOWED_TYPES.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
            setError("Invalid file type. Please upload a PDF, DOCX, or TXT file.");
            event.target.value = "";
            return;
        }

        // validate max file size constraints (25MB)
        if (file.size > MAX_FILE_SIZE) {
            setError("File size exceeds the 25 MB limit.");
            event.target.value = "";
            return;
        }

        setSelectedFile(file);
        setTitle(file.name);
        event.target.value = "";
    }

    /**
     * uploads the selected file along with metadata and module mapping to the backend.
     */
    async function handleUpload(targetModuleId) {
        const activeModuleId = targetModuleId || moduleId;
        if (!selectedFile) {
            setError("Please select a file to upload.");
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

        setUploading(true);
        setError("");
        setMessage("");

        try {

            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("title", title || selectedFile.name);
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
        } catch (error) {
            console.error("Upload error: ", error);
            setError(error.message || "An error occurred during upload");
        } finally {
            setUploading(false);
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
        return (document.name || document.file_name || document.fileName || document.title || document.filename || "Untitled Document");
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
                                onClick = {() => {
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
                                    !modules.some((module) => String(module.module_id ?? module.id) === String(moduleId))
                                }
                            >
                                {uploading ? "Uploading..." : "Upload Document"}
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

            {/* Documents Grid/ List Section */}
            <section className="study-materials-page__documents">
                {loading ? (
                    <p>Loading Documents...</p>
                ) : (
                    <>
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
                        <div
                            className="study-materials-page__dropzone-card"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="study-materials-page__dropzone-icon">☁️</div>
                            <p>Drop a PDF, DOCX or TXT file<br />up to 25MB</p>
                        </div>
                    </>
                )}
            </section>
        </main>
    );
}

export default StudyMaterials;