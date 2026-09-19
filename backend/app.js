require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const flashcardRoutes = require('./src/routes/flashcard.routes');
app.use('/api/flashcards', flashcardRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'StudySphere API is running' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});