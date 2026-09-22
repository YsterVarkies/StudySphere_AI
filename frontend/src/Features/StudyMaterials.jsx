import { useEffect, useRef, useState } from "react"; 
import "./StudyMaterials.css"; // Import the CSS file for styling

const API_URL = "https://localhost:5000/api"; // Replace with your actual API URL
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const ALLOWED_TYPES = [
    "application/pdf", // .pdf
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
    "text/plain", // .txt
];

function getSession() {
    try {
        return JSON.parse(localStorage.getItem("studysphere_session") || null); // Return null if the session is not found
    } catch (error) {
        console.error("Error parsing session from localStorage:", error); // Log the error for debugging
        return null; // Return null if there's an error parsing the session
    }
}

function getUserId() {
    const user = getSession();
    return user?.user_id || user?.studentNumber || user?.email || ""; // Return an empty string if user_id is not found
}

function StudyMaterials() {
    const fileInputRef = useRef(null); // Ref for the file input element
    const [documents, setDocuments] = useState([]); // State to hold the list of documents
    const [modules, setModules] = useState([]); // State to hold the list of modules
    const [selectedModule, setSelectedModule] = useState(""); // State to hold the selected module
    const [searchTerm, setSearchTerm] = useState(""); // State to hold the search term
    const [selectedFile, setSelectedFile] = useState(null); // State to hold the selected file
    const [moduleId, setModuleId] = useState(""); // State to hold the selected module ID
    const [loading, setLoading] = useState(false); // State to indicate loading status
    const [uploading, setUploading] = useState(false); // State to indicate uploading status
    const [error, setError] = useState(""); // State to hold error messages
    const [message, setMessage] = useState(""); // State to hold success messages

    useEffect(() => {
        loadDocuments(); // Load documents when the component mounts
        loadModules(); // Load modules when the component mounts
    }, []);

    async function loadDocuments() {
        setLoading(true); // Set loading state to true
        setError(""); // Clear any previous errors
        try {
            const userId = getUserId(); // Get the user ID
            const response = await fetch(`${API_URL}/documents${userId ? `?userId=${encodeURIComponent(userId)}` : ""}`); // Fetch documents from the API

            if (!response.ok) {
                throw new Error("Could not load documents"); // Throw an error if the response is not OK
            }

            const data = await response.json(); // Parse the JSON response

            const list = data.documents || data.data || (Array.isArray(data) ? data : []); // Handle different response structures

            setDocuments(list); // Update the documents state with the fetched list

        } catch (error) {
            setError(error.message || "An error occurred while loading documents"); // Set the error message
        } finally {
            setLoading(false); // Set loading state to false
        }
    }

    async function loadModules() {
        try {
            const response = await fetch(`${API_URL}/modules`); // Fetch modules from the API
            if (!response.ok) {
                throw new Error("Could not load modules"); // Throw an error if the response is not OK
            }
            const data = await response.json(); // Parse the JSON response
            setModules(data.modules || data.data || (Array.isArray(data) ? data : [])); // Handle different response structures
        } catch (error) {
            setError(error.message || "An error occurred while loading modules"); // Set the error message
        }
    }

    function handleFileChange(event) {
        const file = event.target.files?.[0]; // Get the selected file

        if (!file) return; // Return if no file is selected

        setError(""); // Clear any previous errors
        setMessage(""); // Clear any previous messages

        if (!ALLOWED_TYPES.includes(file.type)) {
            setError("Invalid file type. Please upload a PDF, DOCX, or TXT file."); // Set error for invalid file type
            event.target.value = ""; // Reset the file input
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setError("File size exceeds the 25 MB limit."); // Set error for file size exceeding limit
            event.target.value = ""; // Reset the file input
            return;
        }
        setSelectedFile(file); // Set the selected file
        event.target.value = ""; // Reset the file input to allow re-uploading the same file if needed
}

async function handleUpload() {
    if (!selectedFile) {
        setError("Please select a file to upload."); // Set error if no file is selected
        return;
    }

    if (!moduleId.trim()) {
        setError("Please select a module."); // Set error if no module is selected
        return;
    }

    setUploading(true); // Set uploading state to true
    setError(""); // Clear any previous errors
    setMessage(""); // Clear any previous messages

    try {
        const userId = getUserId(); // Get the user ID
        const formData = new FormData(); // Create a new FormData object
        formData.append("file", selectedFile); // Append the selected file to the FormData
        formData.append("filename", selectedFile.name); // Append the filename to the FormData
        formData.append("title", selectedFile.name); // Append the title to the FormData
        formData.append("moduleId", moduleId); // Append the module ID to the FormData

        if (userId) {
            formData.append("userId", userId); // Append the user ID to the FormData if it exists
        }

        const response = await fetch(`${API_URL}/documents`, {
            method: "POST", // Set the request method to POST
            body: formData, // Set the request body to the FormData
        });

        const data = await response.json().catch(() => ({})); // Parse the JSON response, catch any errors

        if (!response.ok) {
            throw new Error(data.message || "Document upload failed"); // Throw an error if the response is not OK
        }

        setMessage("Document uploaded successfully!"); // Set success message
        setSelectedFile(null); // Clear the selected file
        setModuleId(""); // Clear the selected module ID
       
        await loadDocuments(); // Reload the documents after successful upload
    } catch (error) {
        setError(error.message || "An error occurred during upload"); // Set the error message
    } finally {
        setUploading(false); // Set uploading state to false
    }
}

function getDocumentName(document) {
    return (document.name || document.file_name || document.fileName || document.title || document.filename || "Untitled Document"); // Return the document name or a default value
}

function getDocumentModule(document) {
    return (document.moduleName || document.module_name || document.module || "Unknown Module"); // Return the document module or a default value
}

function formatFileSize(size) {
    if (!size) return "Unknown Size"; // Return a default value if size is not provided

    const bytes = Number(size); // Convert size to a number

    if (bytes < 1024) return `${bytes} B`; // Format size in bytes
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`; // Format size in kilobytes
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; // Format size in megabytes
}

const filteredDocuments = documents.filter((document) => {
    const name = getDocumentName(document).toLowerCase(); // Get the document name in lowercase
    const module = String(getDocumentModule(document)); // Get the document module as a string

const matchesSearch = name.includes(searchTerm.toLowerCase()); // Check if the document name matches the search term
const matchesModule = !selectedModule || module === String(selectedModule); // Check if the document module matches the selected module
return matchesSearch && matchesModule; // Return true if both conditions are met
});

return (
    <main className= "study-materials-page">
        <div className= "study-materials-page__header">
            <div>
                <h1>Study Materials</h1>
                <p>Upload and manage your study materials here.</p> 
                </div>
            </div>

            <section className="study-materials-page__upload">
                <h2>Upload Document</h2>

                <button type= "button" className="study-materials-page__button" onClick={() => fileInputRef.current.click()}>
                    Select File
                </button>

                <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" hidden onChange={handleFileChange} />

                {selectedFile && (
                    <div className="study-materials-page__selected">
                        <strong>{selectedFile.name}</strong>
                        <span>({formatFileSize(selectedFile.size)})</span>
                    </div>
                )}

                <div className="study-materials-page__module">
                    <label htmlFor="study-materials-module">Module</label>

                    {modules.length > 0 ? (
                        <select
                            id="study-materials-module"
                        value={moduleId}
                        onChange={(event) => setModuleId(event.target.value)}
                        >
                            <option value="">Select a module</option>
                            {modules.map((module) => {
                                const id = module.module_id || module.id || module.moduleId || module.moduleID || module.module_id; // Handle different property names for module ID
                                const name = module.module_name || module.name || module.moduleName || module.module_name || module.title || id ||"Unnamed Module"; // Handle different property names for module name
                                return (
                                    <option key={id} value={id}>
                                        {name}
                                    </option>
                                );
                            })}
                            </select>
                    ) : (
                        <input id= "study-materials-module" type="text" value={moduleId} onChange={(event) => setModuleId(event.target.value)} placeholder="Enter module ID" />
                    )}
                    </div> 
                    <button type="button" className="study-matrials-page__upload" onClick={handleUpload} disabled={uploading || !selectedFile || !moduleId}>
                        {uploading ? "Uploading..." : "Upload Document"}
                    </button>

                    <small>Supported file formats: PDF, DOCX, TXT · Maximum file size: 25MB</small>
                    </section>

                    {error && <div className="study-materials-page__error">{error}</div>}
                    {message && <div className="study-materials-page__success">{message}</div>}

                    <section className="study-materials-page__controls">
                        <select value={selectedModule} onChange={(event) => setSelectedModule(event.target.value)}>
                            <option value="">All Modules</option>
                            {modules.map((module) => {
                                const id = module.module_id || module.id || module.moduleId || module.moduleID || module.module_id; // Handle different property names for module ID
                                const name = module.module_name || module.name || module.moduleName || module.module_name || module.title || id || "Unnamed Module"; // Handle different property names for module name
                                return (
                                    <option key={id} value={id}>
                                        {name}
                                    </option>
                                );
                            })}
                        </select>

                        <input type="search" placeholder="Search documents..." value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
                    </section>

                    <section className="study-materials-page__documents">
        {loading ? (
          <p>Loading documents...</p>
        ) : filteredDocuments.length === 0 ? (
          <div className="study-materials-page__empty">
            <div>📄</div>
            <p>No documents found.</p>
          </div>
        ) : (
          filteredDocuments.map((document) => (
            <article
              className="study-materials-page__document"
              key={document.document_id || document.id}
            >
              <div className="study-materials-page__document-icon">
                📄
              </div>

              <div className="study-materials-page__document-info">
                <h3>{getDocumentName(document)}</h3>

                <p>
                  Module: {getDocumentModule(document) || "Unknown"}
                </p>

                <span>
                  {formatFileSize(
                    document.file_size || document.size
                  )}
                </span>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}

export default StudyMaterials;

