
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

## 📁 Project Structure

- `frontend/` – React user interface
- `backend/` – API, database, and server logic
- `.github/workflows/` – Deployment automation

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
# create backend/.env (see developer documentation section 3.2)
# make sure the CA certificate path exists
node server.js
```

Alternatively, start the backend using:

```bash
npm start
```

The backend runs at:

`http://localhost:5000`

### 3. Frontend (Terminal 2)

Open a second terminal from the project root.

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at:

`http://localhost:5173`

For additional environment configuration, refer to the Developer Documentation.

## 🌐 Deployment

The frontend uses GitHub Actions and GitHub Pages for deployment.

**Website:** https://ystervarkies.github.io/StudySphere_AI/

The backend requires separate hosting for database-connected and AI-powered features to work online.

## 👨‍💻 Development

StudySphere AI was developed as a university group project for **CMPG 323**.

## 📄 License

This project is licensed under the MIT License.

---

**StudySphere AI – Learn Smarter. Stay Organized. Revise with Confidence.**


