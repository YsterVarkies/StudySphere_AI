
# 🎓 StudySphere AI

**Make Every Study Hour Count.**

StudySphere AI is an innovative AI study platform meant to support university students in staying on top of their studies, keeping track of all their academic related documents, and preparing for their assessments

The system offers AI assistance, study planning, revision support, and academic management all in one convenient place. 

## 🚀 Overview

- 🤖 **AI Chat Assistant** – Ask questions and receive AI-powered academic assistance.
- 📚 **Study Materials** – Upload, organize, and manage PDF, Word, and text documents.
- 📝 **Revision Hub** – Generate quizzes and flashcards from study materials.
- 📅 **Study Planner** – Manage study tasks, assignments, and deadlines.
- 📊 **Dashboard** – View modules, upcoming tasks, and study activities.
- 🔐 **User Authentication** – Secure registration, login, and profile management.
- 👥 **Admin Panel** – Manage users, modules, cohorts, and announcements.

## 🛠️ Technologies Used

| Frontend | Backend | Services |
|----------|---------|----------|
| React | Node.js | MySQL (Aiven) |
| Vite | Express.js | OpenRouter AI |
| JavaScript | JWT | Backblaze B2 |
| CSS | bcrypt | GitHub Pages |
| | | Render |

## 📁 Project Structure

- `frontend/` – React user interface
- `backend/` – API, database, and server logic
- `.github/workflows/` – Automated frontend deployment

## ⚙️ Getting Started

To get started with StudySphere AI you will need to have the following: Node.js installed on your local machine, access to the team's MySQL database, access to the Backblaze B2 service, and an OpenRouter API key. Once you have the requirements you can proceed with cloning the repository and installing the project's dependencies.

### 1. Clone the Repository
First, you will need to clone the StudySphere_AI repository from GitHub to your local machine.
```bash
git clone https://github.com/YsterVarkies/StudySphere_AI.git
cd StudySphere_AI
```

### 2. Backend (Terminal 1)
Then, you will need to open a new terminal and enter the following commands:
```bash
cd backend
npm install
# Create backend/.env (see Developer Documentation section 3.2)
# Make sure the CA certificate path exists
node server.js
```

Alternatively, start the backend using:

```bash
npm start
```
You should see the message that the server is running.
The backend runs locally at:

`http://localhost:5000`

### 3. Frontend (Terminal 2)

Open a second terminal from the project root. Enter the following commands:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs locally at:

`http://localhost:5173`

For more information about the setup and environment variables, you can refer to the Developer Documentation.

## 🌐 Deployment

StudySphere AI uses GitHub Pages and Render to host its frontend and backend.

### Frontend – GitHub Pages

The React frontend is deployed through GitHub Pages using GitHub Actions for automated builds and deployment.

**Website:**
https://ystervarkies.github.io/StudySphere_AI/

### Backend – Render

The Node.js and Express backend is hosted on Render, providing the API services required by the application.

**Backend API:**
https://studysphere-ai-s07a.onrender.com/

The frontend communicates with the backend using the `VITE_API_URL` environment variable.

### Database and External Services
The StudySphere AI platform makes use of the following services:

- **Aiven MySQL** – Stores user accounts, study data, and application records.
- **Backblaze B2** – Stores uploaded study documents.
- **OpenRouter AI** – Powers AI chat, quizzes, and flashcard generation.

## 👨‍💻 Development

The StudySphere AI project was developed as part of a university group assignment for **CMPG 323**.

## 📄 License

This project is licensed under the MIT License.

---

**StudySphere AI – Learn Smarter. Stay Organized. Revise with Confidence.**
