const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = 5000;

// Session store with expiry
const sessions = new Map();
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Middleware
app.use(cors({
  origin: ['https://de1538fd-d807-4d96-953f-28770e08420c-00-1vi4dv77iah51.spock.replit.dev', 'http://localhost:5000'],
  credentials: true
}));
app.use(bodyParser.json());

// Data storage files
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const RECORDS_FILE = path.join(__dirname, 'data', 'records.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Admin credentials - fixed admin code
const ADMIN_CODE = 'LEMROUDJ2024'; // Fixed admin code

// Hash function for codes
function hashCode(code) {
  return crypto.createHash('sha256').update(code + 'factory_salt_2024').digest('hex');
}

// Check if user is admin
function isAdmin(code) {
  return code === ADMIN_CODE;
}

// Initialize data files
function initializeData() {
  // Initialize users file for workers only
  if (!fs.existsSync(USERS_FILE)) {
    console.log('ملف المستخدمين جاهز - كود الإدمن الثابت: LEMROUDJ2024');
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }

  // Initialize records file
  if (!fs.existsSync(RECORDS_FILE)) {
    fs.writeFileSync(RECORDS_FILE, JSON.stringify([], null, 2));
  }
}

// Helper functions
function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function readRecords() {
  try {
    return JSON.parse(fs.readFileSync(RECORDS_FILE, 'utf8'));
  } catch (error) {
    return [];
  }
}

function writeRecords(records) {
  fs.writeFileSync(RECORDS_FILE, JSON.stringify(records, null, 2));
}

// Clean expired sessions
function cleanExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      sessions.delete(sessionId);
    }
  }
}

// Auth middleware
function requireAuth(req, res, next) {
  cleanExpiredSessions();
  
  const sessionId = req.headers['session-id'];
  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const session = sessions.get(sessionId);
  if (Date.now() > session.expiresAt) {
    sessions.delete(sessionId);
    return res.status(401).json({ error: 'Session expired' });
  }
  
  // Extend session
  session.expiresAt = Date.now() + SESSION_TIMEOUT;
  req.user = session.user;
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

// Generate secure session ID
function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

// API Routes

// Login endpoint - handles both admin and worker login
app.post('/api/login', (req, res) => {
  const { code } = req.body;
  
  // Check if it's admin login
  if (isAdmin(code)) {
    const sessionId = generateSessionId();
    const sessionData = {
      user: { id: 0, name: 'LEMROUDJ Admin', role: 'admin' },
      expiresAt: Date.now() + SESSION_TIMEOUT
    };
    sessions.set(sessionId, sessionData);
    
    res.json({ 
      sessionId,
      user: { id: 0, name: 'LEMROUDJ Admin', role: 'admin' }
    });
    return;
  }
  
  // Check worker login
  const users = readUsers();
  const hashedCode = hashCode(code);
  const user = users.find(u => u.code === hashedCode);
  
  if (user) {
    const sessionId = generateSessionId();
    const sessionData = {
      user: { id: user.id, name: user.name, role: user.role },
      expiresAt: Date.now() + SESSION_TIMEOUT
    };
    sessions.set(sessionId, sessionData);
    
    res.json({ 
      sessionId,
      user: { id: user.id, name: user.name, role: user.role }
    });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

// Logout endpoint
app.post('/api/logout', requireAuth, (req, res) => {
  const sessionId = req.headers['session-id'];
  sessions.delete(sessionId);
  res.json({ message: 'Logged out successfully' });
});

// Get all users (admin only)
app.get('/api/users', requireAdmin, (req, res) => {
  const users = readUsers();
  // Don't send codes to frontend
  const safeUsers = users.map(u => ({ id: u.id, name: u.name, role: u.role }));
  res.json(safeUsers);
});

// Get specific user (admin only)
app.get('/api/users/:id', requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const users = readUsers();
  const user = users.find(u => u.id === userId);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Don't send code to frontend
  res.json({ id: user.id, name: user.name, role: user.role });
});

// Update user (admin only)
app.put('/api/users/:id', requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  const { name } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'اسم العامل مطلوب' });
  }
  
  const users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'العامل غير موجود' });
  }
  
  // Don't allow updating admin
  if (users[userIndex].role === 'admin') {
    return res.status(403).json({ error: 'لا يمكن تعديل بيانات الإدمن' });
  }
  
  users[userIndex].name = name.trim();
  writeUsers(users);
  
  res.json({ id: users[userIndex].id, name: users[userIndex].name, role: users[userIndex].role });
});

// Delete user and all their records (admin only)
app.delete('/api/users/:id', requireAdmin, (req, res) => {
  const userId = parseInt(req.params.id);
  
  let users = readUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'العامل غير موجود' });
  }
  
  // Don't allow deleting admin
  if (users[userIndex].role === 'admin') {
    return res.status(403).json({ error: 'لا يمكن حذف حساب الإدمن' });
  }
  
  // Remove user
  users.splice(userIndex, 1);
  writeUsers(users);
  
  // Remove all records for this user
  let records = readRecords();
  records = records.filter(r => r.userId !== userId);
  writeRecords(records);
  
  res.json({ message: 'تم حذف العامل وجميع سجلاته بنجاح' });
});

// Create new user (admin only)
app.post('/api/users', requireAdmin, (req, res) => {
  const { name, code, role } = req.body;
  
  if (!name || !code || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const users = readUsers();
  
  // Check if code already exists
  const hashedCode = hashCode(code);
  if (users.find(u => u.code === hashedCode)) {
    return res.status(409).json({ error: 'Code already exists' });
  }

  const newUser = {
    id: Math.max(0, ...users.map(u => u.id)) + 1,
    name,
    code: hashedCode,
    role
  };

  users.push(newUser);
  writeUsers(users);
  // Don't send code back
  res.status(201).json({ id: newUser.id, name: newUser.name, role: newUser.role });
});

// Get records for a user
app.get('/api/records/user/:userId', requireAuth, (req, res) => {
  const userId = parseInt(req.params.userId);
  
  // Workers can only see their own records
  if (req.user.role !== 'admin' && req.user.id !== userId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  
  const records = readRecords();
  const userRecords = records.filter(r => r.userId === userId);
  
  // Sort by year and month descending
  userRecords.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
  
  res.json(userRecords);
});

// Get all records (admin only)
app.get('/api/records', requireAdmin, (req, res) => {
  const records = readRecords();
  res.json(records);
});

// Create new record (admin only)
app.post('/api/records', requireAdmin, (req, res) => {
  const { userId, month, year, daysWorked, salary, expenses, notes } = req.body;
  
  if (!userId || !month || !year || daysWorked === undefined || salary === undefined || expenses === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const records = readRecords();
  
  const newRecord = {
    id: Math.max(0, ...records.map(r => r.id)) + 1,
    userId: parseInt(userId),
    month: parseInt(month),
    year: parseInt(year),
    daysWorked: parseInt(daysWorked),
    salary: parseFloat(salary),
    expenses: parseFloat(expenses),
    notes: notes || '',
    timestamp: Date.now()
  };

  records.push(newRecord);
  writeRecords(records);
  res.status(201).json(newRecord);
});

// Serve Flutter web app (static files)
app.use(express.static(path.join(__dirname, 'flutter_web')));

// Fallback to index.html for Flutter web app routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'flutter_web', 'index.html'));
});

// Initialize data and start server
initializeData();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Factory App Backend running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
  console.log('Factory app backend is ready for Flutter web app');
});