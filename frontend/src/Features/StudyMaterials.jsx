import { useEffect, useRef, useState } from "react"; 
import AIChat from "./AIChat";
import "./StudyMaterials.css"; // Import the CSS file for styling

const API_URL = "http://localhost:5000/api"; // Replace with your actual API URL
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const ALLOWED_TYPES = [
    "application/pdf", // .pdf
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "text/plain", // .txt
];

/* // --- COMMENT OUT THIS ENTIRE BLOCK WHEN DONE TESTING ---
const MOCK_MODULES = [
    { module_id: "mod-1", module_name: "CMPG 323 - Information Systems" },
    { module_id: "mod-2", module_name: "JME 410 - Research Methodology" },
    { module_id: "mod-3", module_name: "DEV 301 - Software Development" },
    { module_id: "mod-4", module_name: "DBAS 211 - Database Systems" },
    { module_id: "mod-5", module_name: "NETW 312 - Network Engineering" }
];

const MOCK_DOCUMENTS = [
    {
        document_id: "doc-1",
        name: "Project_Requirements_Specification.pdf",
        module_id: "mod-1",
        moduleName: "CMPG 323 - Information Systems",
        file_size: 2048500, // ~2 MB
        file_type: "application/pdf"
    },
    {
        document_id: "doc-2",
        name: "Research_Proposal_Template.docx",
        module_id: "mod-2",
        moduleName: "JME 410 - Research Methodology",
        file_size: 512000, // ~512 KB
        file_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    },
    {
        document_id: "doc-3",
        name: "API_Endpoints_Notes.txt",
        module_id: "mod-3",
        moduleName: "DEV 301 - Software Development",
        file_size: 15400, // ~15 KB
        file_type: "text/plain"
    },
    {
        document_id: "doc-4",
        name: "SQL_Joins_Cheat_Sheet.pdf",
        module_id: "mod-4",
        moduleName: "DBAS 211 - Database Systems",
        file_size: 1250000, // ~1.2 MB
        file_type: "application/pdf"
    },
    {
        document_id: "doc-5",
        name: "Subnetting_Practice_Problems.docx",
        module_id: "mod-5",
        moduleName: "NETW 312 - Network Engineering",
        file_size: 840000, // ~840 KB
        file_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    },
    {
        document_id: "doc-6",
        name: "Weekly_Lecture_Slides_Week4.pdf",
        module_id: "mod-1",
        moduleName: "CMPG 323 - Information Systems",
        file_size: 5400000, // ~5.4 MB
        file_type: "application/pdf"
    }
];
 //-------------------------------------------------------/ */

function getSession() {
    try {
        // check all common storage variations used across differnt team components
        const rawToken = localStorage.getItem("token") || localStorage.getItem("accessToken");
        if (rawToken) return { token: rawToken };

        const sessionStr = localStorage.getItem("studysphere_session") || localStorage.getItem("user") || localStorage.getItem("token");
        
        if (!sessionStr) return null;

        // If it looks like a raw token string rather than a JSON object, return it wrapped
        if (!sessionStr.startsWith("{") && !sessionStr.startsWith("[")) {
            return { token: sessionStr };
        }

        const parsed = JSON.parse(sessionStr);
        if (typeof parsed === 'string') {
            return {token: parsed};
        }
        return parsed;
    } catch (error) {
        // Fallback if it's just a raw token string stored under 'token'
        const rawToken = localStorage.getItem("token");
        if (rawToken) return { token: rawToken };

        console.error("Error parsing session from localStorage:", error); 
        return null; 
    }
}

function getUserId() {
    const user = getSession();
    return user?.user_id || user?.id || user?.studentNumber || user?.email || ""; 
}

function getToken() {
    const session = getSession();
    return session?.token || session?.accessToken || localStorage.getItem("token") || "";
}

function StudyMaterials() {
    const fileInputRef = useRef(null); 
    const [documents, setDocuments] = useState([]); 
    const [modules, setModules] = useState([]); 
    const [selectedModule, setSelectedModule] = useState(""); 
    const [searchTerm, setSearchTerm] = useState(""); 
    const [selectedFile, setSelectedFile] = useState(null); 
    const [moduleId, setModuleId] = useState(""); 
    const [loading, setLoading] = useState(false); 
    const [uploading, setUploading] = useState(false); 
    const [error, setError] = useState(""); 
    const [message, setMessage] = useState(""); 

    const [activeView, setActiveView] = useState("list"); // "list" or "chat"
    const [activeChatDoc, setActiveChatDoc] = useState(null);

    useEffect(() => {
        loadDocuments(); 
        loadModules(); 
    }, []);

    async function loadDocuments() {

       /*  if (typeof MOCK_DOCUMENTS !== 'undefined') { setDocuments(MOCK_DOCUMENTS); setLoading(false); return; } */

        setLoading(true); 
        setError(""); 
        try {
            const userId = getUserId(); 
            const token = getToken();

            const response = await fetch (
                `${API_URL}/documents${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`,
                {
                    headers: {
                        Authorization: token ? `Bearer ${token}` : "",
                    },
                }
            );

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

    async function loadModules() {

        /* if (typeof MOCK_MODULES !== 'undefined') { setModules(MOCK_MODULES); return; } */

        try {
            const token = getToken(); // token retrieval
            const response = await fetch(`${API_URL}/modules`, {
                headers: {
                    Authorization: token ? `Bearer ${token}` : "", //authorization header
                },
            }); 
            if (!response.ok) {
                throw new Error(`Could not load modules (Status: ${response.status})`); 
            }
            const data = await response.json(); 
            const list = data.modules || data.data || (Array.isArray(data) ? data : []);
            setModules(list); 

        } catch (error) {
            console.error("Load modules error: ", error);
            setError(error.message || "An error occurred while loading modules"); 
        }
    }

    function handleFileChange(event) {
        const file = event.target.files?.[0]; 

        if (!file) return; 

        setError(""); 
        setMessage(""); 

        if (!ALLOWED_TYPES.includes(file.type)) {
            setError("Invalid file type. Please upload a PDF, DOCX, or TXT file."); 
            event.target.value = ""; 
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setError("File size exceeds the 25 MB limit."); 
            event.target.value = ""; 
            return;
        }
        setSelectedFile(file); 
        event.target.value = ""; 
    }

    async function handleUpload(targetModuleId) {
        const activeModuleId = targetModuleId || moduleId; 
        if (!selectedFile) {
            setError("Please select a file to upload.");
            return;
        }

        if (!activeModuleId.trim()) {
            setError("Please select a module.");
            return;
        }

        setUploading(true); 
        setError(""); 
        setMessage(""); 

        try {
             
            const formData = new FormData(); 
            formData.append("file", selectedFile);  
            formData.append("title", selectedFile.name); 
            formData.append("moduleId", activeModuleId);

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
           
            await loadDocuments(); 
        } catch (error) {
            console.error("Upload error: ", error);
            setError(error.message || "An error occurred during upload"); 
        } finally {
            setUploading(false); 
        }
    }

    function getDocumentName(document) {
        return (document.name || document.file_name || document.fileName || document.title || document.filename || "Untitled Document"); 
    }

    function getDocumentModule(document) {
        return (document.moduleName || document.module_name  || document.module || "Unknown Module"); 
    }

    function formatFileSize(size) {
        if (!size) return "Unknown Size"; 
        const bytes = Number(size); 
        if (bytes < 1024) return `${bytes} B`; 
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`; 
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; 
    }

   const filteredDocuments = documents.filter((document) => {
    const name = getDocumentName(document).toLowerCase();
    const documentModuleId = String(
        document.module_id ||
        document.moduleId ||
        ""
    );
    const matchesSearch = name.includes(searchTerm.toLowerCase());
    const matchesModule = !selectedModule || documentModuleId === String(selectedModule);
    return matchesSearch && matchesModule;
   });

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
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                hidden
                onChange={handleFileChange}
            />
            {error && <div className="study-materials-page__error">{error}</div>}
            {message && <div className="study-materials-page__success">{message}</div>}

            {/* Popup to pick a module when a file is selected */}
            {selectedFile && (
                <div className="study-materials-page__modal-backdrop">
                    <div className="study-materials-page__modal">
                        <h2>Upload Document</h2>
                        <div className="study-materials-page__selected">
                            <strong>{selectedFile.name}</strong>
                            <span>({formatFileSize(selectedFile.size)})</span>
                        </div>
                        <div className="study-materials-module">
                            <label htmlFor="study-materials-module">Module</label>
                            {modules.length > 0 ? (
                                <select 
                                    id="study-materials-module"
                                    value={moduleId}
                                    onChange={(event) => setModuleId(event.target.value)}
                                >
                                    <option value="">Select a Module</option>
                                    {modules.map((module) => {
                                        const id = module.module_id || module.id || module.moduleId;
                                        const name = module.module_name || module.name || module.moduleName || module.title || id || "Unnamed Module";
                                        return (
                                            <option key={id} value={id}>{name}</option>
                                        );
                                    })}
                                </select>
                            ) : (
                                <input
                                    id="study-materials-module"
                                    type="text"
                                    value={moduleId}
                                    onChange={(event) => setModuleId(event.target.value)}
                                    placeholder="Enter Module ID"
                                />
                            )}
                        </div>
                        <div className="study-materials-page__modal-actions">
                            <button
                                type="button"
                                className="study-materials-page__btn-cancel"
                                onClick={() => setSelectedFile(null)}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="study-materials-page__btn-confirm"
                                onClick={() => handleUpload(moduleId)}
                                disabled={uploading || !moduleId}
                            >
                                {uploading ? "Uploading..." : "Upload Document"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <section className="study-materials-page__controls">
                <select value={selectedModule} onChange={(event) => setSelectedModule(event.target.value)}>
                    <option value="">All Modules</option>
                    {modules.map((module) => {
                        const id = module.module_id || module.id || module.moduleId;
                        const name = module.module_name || module.name || module.moduleName || module.title || id || "Unnamed Module";
                        return (
                            <option key={id} value={id}>{name}</option>
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

            <section className="study-materials-page__documents">
                {loading ? (
                    <p>Loading Documents...</p>
                ) : (
                    <>
                        {filteredDocuments.map((document) => (
                            <article className="study-materials-page__document" key={document.document_id || document.id}>
                                <div className="study-materials-page__document-content">
                                    <div className="study-materials-page__document-header-row">
                                        <div className="study-materials-page__document-icon">📄</div>
                                        <div className="study-materials-page__document-info">
                                            <h3>{getDocumentName(document)}</h3>
                                            <p>{getDocumentModule(document)} · {formatFileSize(document.file_size || document.size)} </p>
                                        </div>
                                    </div>
                                </div>
                                <button className="study-materials-page__chat-btn" 
                                        type="button"
                                        onClick={() => {
                                            setActiveChatDoc(document);
                                            setActiveView("chat");
                                        }}
                                        >
                                    💬 Chat with this
                                </button>
                            </article>
                        ))}
                        
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