const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate, isStudent } = require('../middleware/auth');
const { readDB, writeDB } = require('../middleware/db');

// POST /api/submissions - Submit an answer (student only)
router.post('/', authenticate, isStudent, (req, res) => {
  const { assignmentId, answer } = req.body;

  if (!assignmentId || !answer?.trim()) {
    return res.status(400).json({ message: 'Assignment ID and answer are required.' });
  }

  const db = readDB();
  const assignment = db.assignments.find(a => a.id === assignmentId);

  if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });
  if (assignment.status !== 'published') {
    return res.status(400).json({ message: 'This assignment is not accepting submissions.' });
  }

  // Check due date
  if (new Date() > new Date(assignment.dueDate)) {
    return res.status(400).json({ message: 'Submission deadline has passed.' });
  }

  // One submission per student per assignment
  const existing = db.submissions.find(
    s => s.assignmentId === assignmentId && s.studentId === req.user.id
  );
  if (existing) {
    return res.status(400).json({ message: 'You have already submitted an answer for this assignment.' });
  }

  const newSubmission = {
    id: uuidv4(),
    assignmentId,
    studentId: req.user.id,
    studentName: req.user.name,
    answer: answer.trim(),
    submittedAt: new Date().toISOString(),
    reviewed: false
  };

  db.submissions.push(newSubmission);
  writeDB(db);

  res.status(201).json(newSubmission);
});

// GET /api/submissions/my - Get student's own submissions
router.get('/my', authenticate, isStudent, (req, res) => {
  const db = readDB();
  const mySubmissions = db.submissions.filter(s => s.studentId === req.user.id);
  res.json(mySubmissions);
});

module.exports = router;
