require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/api/test-summary', (req, res) => {
  res.json({ message: 'Summary test route works' });
});

// Routes
const flashcardRoutes = require('./src/routes/flashcard.routes');
app.use('/api/flashcards', flashcardRoutes);

const announcementRoutes = require('./src/routes/announcement.routes');
app.use('/api/announcements', announcementRoutes);

const summaryRoutes = require('./src/routes/summary.routes');
app.use('/api/summaries', summaryRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'StudySphere API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});