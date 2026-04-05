const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { readDB, writeDB } = require('../middleware/db');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const db = readDB();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials. Please check your email and password.' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid credentials. Please check your email and password.' });
  }

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role }
  });
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role, secretCode } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  // Security: Check teacher secret code
  if (role === 'teacher') {
    if (secretCode !== process.env.TEACHER_SECRET) {
      return res.status(403).json({ message: 'Invalid teacher restoration secret code.' });
    }
  }

  const db = readDB();
  const existingUser = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (existingUser) {
    return res.status(400).json({ message: 'Email is already in use.' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  const newUser = {
    id: uuidv4(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password: hashedPassword,
    role: role === 'teacher' ? 'teacher' : 'student'
  };

  db.users.push(newUser);
  writeDB(db);

  const token = jwt.sign(
    { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.status(201).json({
    token,
    user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
  });
});

// POST /api/auth/me - Verify token and return user info
router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ user: decoded });
  } catch {
    res.status(403).json({ message: 'Invalid token' });
  }
});

module.exports = router;
