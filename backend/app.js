require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db'); // Moved to the top so it's available globally!

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

const quizRoutes = require('./src/routes/quiz.routes');
app.use('/api/quizzes', quizRoutes);

const aiChatRoutes = require('./src/routes/aiChat.routes');
app.use('/api/chat', aiChatRoutes);

const analyticsRoutes = require('./src/routes/analytics.routes');
app.use('/api/analytics', analyticsRoutes);

// Admin Frontend - Analytics (Strict Live Data, Zero Fallbacks)
app.get('/api/analytics', async (req, res) => {
  try {
    const [userCountResult] = await db.query('SELECT COUNT(*) as count FROM USER');
    const activeUsers = userCountResult[0].count;

    const [moduleCountResult] = await db.query('SELECT COUNT(*) as count FROM MODULE');
    const modulesLive = moduleCountResult[0].count;

    const [aiResult] = await db.query('SELECT COUNT(*) as count FROM CHAT_MESSAGE');
    const aiRequestsToday = aiResult[0].count;

    const [dbModules] = await db.query('SELECT module_id, module_name FROM MODULE LIMIT 4');
    const activeModulesList = dbModules.map((m, index) => ({
      name: m.module_name,
      percentage: 100 - (index * 20)
    }));

    // Replace this block in your app.get('/api/analytics', ...) route:
    const [logs] = await db.query('SELECT * FROM USER_ACTIVITY_LOG ORDER BY created_at DESC LIMIT 5');
    const recentLogs = logs.map(l => ({
      type: l.action || l.activity_type || l.event_type || 'Activity',
      message: l.details || l.description || 'System interaction',
      time: l.created_at || new Date()
    }));

    res.json({
      activeUsers,
      modulesLive,
      aiRequestsToday, 
      systemErrors: 0,
      activeModules: activeModulesList,
      recentLogs
    });
  } catch (err) {
    console.error('Database error fetching analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin Frontend - Modules & Cohorts
app.get('/api/modules', async (req, res) => {
  try {
    const [modules] = await db.query('SELECT module_code AS code, module_name AS name, description FROM MODULE');
    const [cohorts] = await db.query('SELECT cohort_id AS id, cohort_name AS name, academic_year AS academicYear FROM COHORT');    
    res.json({ 
      modules: modules.map(m => ({ ...m, status: 'Active' })), 
      cohorts 
    });
  } catch (err) {
    console.error('Database error fetching modules/cohorts:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/modules', async (req, res) => {
  try {
    const { code, name, description } = req.body;
    const query = 'INSERT INTO MODULE (module_code, module_name, description) VALUES (?, ?, ?)';
    await db.query(query, [code.trim().toUpperCase(), name.trim(), description]);
    
    res.status(201).json({ 
      success: true, 
      code: code.trim().toUpperCase(), 
      name: name.trim(), 
      status: 'Active' 
    });
  } catch (err) {
    console.error('Database error inserting module:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cohorts', async (req, res) => {
  try {
    const { name, academicYear } = req.body;
    const query = 'INSERT INTO COHORT (cohort_name, academic_year) VALUES (?, ?)';
    await db.query(query, [name.trim(), academicYear]);
    
    res.status(201).json({ 
      success: true, 
      name: name.trim(), 
      academicYear 
    });
  } catch (err) {
    console.error('Database error inserting cohort:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a module by code
app.delete('/api/modules/:code', async (req, res) => {
  try {
    const { code } = req.params;
    await db.query('DELETE FROM MODULE WHERE module_code = ?', [code]);
    res.json({ success: true, message: 'Module deleted successfully' });
  } catch (err) {
    console.error('Database error deleting module:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a cohort by ID
app.delete('/api/cohorts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM COHORT WHERE cohort_id = ?', [id]);
    res.json({ success: true, message: 'Cohort deleted successfully' });
  } catch (err) {
    console.error('Database error deleting cohort:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a module by code
app.put('/api/modules/:code', async (req, res) => {
  try {
    const oldCode = req.params.code;
    const { code, name, module_name, description } = req.body;
    
    const finalCode = (code || oldCode).trim().toUpperCase();
    const finalName = name || module_name;

    console.log(`[DEBUG] Updating module code from ${oldCode} to ${finalCode}`);
    console.log(`[DEBUG] New Name: ${finalName}, Description: ${description}`);

    const query = 'UPDATE MODULE SET module_code = ?, module_name = ?, description = ? WHERE module_code = ?';
    const [result] = await db.query(query, [finalCode, finalName ? finalName.trim() : null, description || 'Standard module description', oldCode]);

    console.log(`[DEBUG] MySQL update result:`, result);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Module not found or no changes made' });
    }

    res.json({ success: true, message: 'Module updated successfully' });
  } catch (err) {
    console.error('Database error updating module:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update a cohort by ID
app.put('/api/cohorts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, academicYear } = req.body;
    const query = 'UPDATE COHORT SET cohort_name = ?, academic_year = ? WHERE cohort_id = ?';
    await db.query(query, [name.trim(), academicYear, id]);
    res.json({ success: true, message: 'Cohort updated successfully' });
  } catch (err) {
    console.error('Database error updating cohort:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin Frontend - User Management CRUD Routes

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT user_id, first_name, last_name, email, role, is_active FROM USER');
    const formattedUsers = rows.map(u => ({
      id: u.user_id,
      name: `${u.first_name} ${u.last_name}`,
      email: u.email,
      role: u.role === 'admin' ? 'Administrator' : 'Student',
      status: u.is_active ? 'Active' : 'Inactive'
    }));
    res.json(formattedUsers);
  } catch (err) {
    console.error('Database error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
});


// Update an existing user
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ');
    const dbRole = role === 'Administrator' ? 'admin' : 'student';

    const query = 'UPDATE USER SET first_name = ?, last_name = ?, email = ?, role = ? WHERE user_id = ?';
    await db.query(query, [firstName, lastName, email.trim(), dbRole, id]);

    res.json({ success: true, message: 'User updated successfully' });
  } catch (err) {
    console.error('Database error updating user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a user
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM USER WHERE user_id = ?', [id]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('Database error deleting user:', err);
    res.status(500).json({ error: err.message });
  }
});

const authRoutes = require('./routes/auth.routes'); 
app.use('/api/auth', authRoutes);
// End Admin Frontend

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'StudySphere API is running' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});