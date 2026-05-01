const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // I'll use a simple random string instead to avoid dependency
const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

const DB_FILE = path.join(__dirname, 'db.json');

// Helper to load/save mock database
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return { users: [] };
  const data = fs.readFileSync(DB_FILE, 'utf8');
  return data ? JSON.parse(data) : { users: [] };
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Generate short ID
function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// 1. Create User: POST /api/users
app.post('/api/users', (req, res) => {
  const username = req.body.username;
  if (!username) return res.json({ error: 'Username is required' });

  const db = loadDB();
  const newUser = {
    username: username,
    _id: generateId(),
    exercises: []
  };
  db.users.push(newUser);
  saveDB(db);

  res.json({ username: newUser.username, _id: newUser._id });
});

// 2. Get All Users: GET /api/users
app.get('/api/users', (req, res) => {
  const db = loadDB();
  const userList = db.users.map(u => ({ username: u.username, _id: u._id }));
  res.json(userList);
});

// 3. Add Exercise: POST /api/users/:_id/exercises
app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  const db = loadDB();
  const user = db.users.find(u => u._id === _id);

  if (!user) return res.json({ error: 'User not found' });

  const exerciseDate = date ? new Date(date) : new Date();
  if (exerciseDate.toString() === 'Invalid Date') {
    return res.json({ error: 'Invalid Date' });
  }

  const exercise = {
    description: description,
    duration: parseInt(duration),
    date: exerciseDate.toDateString()
  };

  user.exercises.push(exercise);
  saveDB(db);

  res.json({
    username: user.username,
    description: exercise.description,
    duration: exercise.duration,
    date: exercise.date,
    _id: user._id
  });
});

// 4. Get Logs: GET /api/users/:_id/logs?[from][&to][&limit]
app.get('/api/users/:_id/logs', (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  const db = loadDB();
  const user = db.users.find(u => u._id === _id);

  if (!user) return res.json({ error: 'User not found' });

  let log = user.exercises.map(ex => ({
    description: ex.description,
    duration: ex.duration,
    date: ex.date
  }));

  // Filter by from/to dates
  if (from) {
    const fromDate = new Date(from);
    log = log.filter(ex => new Date(ex.date) >= fromDate);
  }
  if (to) {
    const toDate = new Date(to);
    log = log.filter(ex => new Date(ex.date) <= toDate);
  }

  // Limit number of results
  if (limit) {
    log = log.slice(0, parseInt(limit));
  }

  res.json({
    username: user.username,
    count: log.length,
    _id: user._id,
    log: log
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Exercise Tracker listening on port ${PORT}`);
});
