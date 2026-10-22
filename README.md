
# 🎓 StudySphere AI

**Make Every Study Hour Count.**

StudySphere AI is an AI-powered study platform designed to help university students manage their studies, organize learning materials, and prepare for assessments.

The platform combines AI assistance, study planning, revision tools, and academic management in one place.

## 🚀 Features

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

To run StudySphere locally, you need Node.js installed, access to the team's MySQL database, Backblaze B2 storage, and an OpenRouter API key.

### 1. Clone the Repository

```bash
git clone https://github.com/YsterVarkies/StudySphere_AI.git
cd StudySphere_AI
```

### 2. Backend (Terminal 1)

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

The backend runs locally at:

`http://localhost:5000`

### 3. Frontend (Terminal 2)

Open a second terminal from the project root.

```bash
cd frontend
npm install
npm run dev
```

The frontend runs locally at:

`http://localhost:5173`

For additional environment configuration, refer to the Developer Documentation.

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

- **Aiven MySQL** – Stores user accounts, study data, and application records.
- **Backblaze B2** – Stores uploaded study documents.
- **OpenRouter AI** – Powers AI chat, quizzes, and flashcard generation.

## 👨‍💻 Development

StudySphere AI was developed as a university group project for **CMPG 323**.

## 📄 License

This project is licensed under the MIT License.

---

**StudySphere AI – Learn Smarter. Stay Organized. Revise with Confidence.**
