const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authenticate, isTeacher } = require('../middleware/auth');
const { readDB, writeDB } = require('../middleware/db');

// GET /api/assignments - Get all assignments
// Teachers: all assignments; Students: published only
router.get('/', authenticate, (req, res) => {
  const db = readDB();
  let assignments = db.assignments;

  if (req.user.role === 'student') {
    assignments = assignments.filter(a => a.status === 'published');
  }

  // Attach submission count for teachers
  if (req.user.role === 'teacher') {
    assignments = assignments.map(a => ({
      ...a,
      submissionCount: db.submissions.filter(s => s.assignmentId === a.id).length
    }));
  }

  // Filter by status if query param provided (teacher only)
  const { status } = req.query;
  if (status && req.user.role === 'teacher') {
    assignments = assignments.filter(a => a.status === status);
  }

  res.json(assignments);
});

// POST /api/assignments - Create assignment (teacher only)
router.post('/', authenticate, isTeacher, (req, res) => {
  const { title, description, dueDate } = req.body;

  if (!title || !description || !dueDate) {
    return res.status(400).json({ message: 'Title, description, and due date are required.' });
  }

  const db = readDB();
  const newAssignment = {
    id: uuidv4(),
    title: title.trim(),
    description: description.trim(),
    dueDate,
    status: 'draft',
    createdBy: req.user.id,
    createdAt: new Date().toISOString()
  };

  db.assignments.push(newAssignment);
  writeDB(db);

  res.status(201).json(newAssignment);
});

// GET /api/assignments/:id - Get single assignment
router.get('/:id', authenticate, (req, res) => {
  const db = readDB();
  const assignment = db.assignments.find(a => a.id === req.params.id);

  if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });
  if (req.user.role === 'student' && assignment.status !== 'published') {
    return res.status(403).json({ message: 'Assignment not available.' });
  }

  res.json(assignment);
});

// PUT /api/assignments/:id - Update assignment (teacher, draft only)
router.put('/:id', authenticate, isTeacher, (req, res) => {
  const db = readDB();
  const idx = db.assignments.findIndex(a => a.id === req.params.id);

  if (idx === -1) return res.status(404).json({ message: 'Assignment not found.' });

  const assignment = db.assignments[idx];
  if (assignment.status !== 'draft') {
    return res.status(400).json({ message: 'Only draft assignments can be edited.' });
  }

  const { title, description, dueDate } = req.body;
  db.assignments[idx] = {
    ...assignment,
    title: title?.trim() || assignment.title,
    description: description?.trim() || assignment.description,
    dueDate: dueDate || assignment.dueDate
  };

  writeDB(db);
  res.json(db.assignments[idx]);
});

// DELETE /api/assignments/:id - Delete assignment (teacher, draft only)
router.delete('/:id', authenticate, isTeacher, (req, res) => {
  const db = readDB();
  const idx = db.assignments.findIndex(a => a.id === req.params.id);

  if (idx === -1) return res.status(404).json({ message: 'Assignment not found.' });
  if (db.assignments[idx].status !== 'draft' && db.assignments[idx].status !== 'completed') {
    return res.status(400).json({ message: 'Only draft or completed assignments can be deleted.' });
  }

  db.assignments.splice(idx, 1);
  
  // Also delete associated submissions
  db.submissions = db.submissions.filter(s => s.assignmentId !== req.params.id);
  
  writeDB(db);
  res.json({ message: 'Assignment deleted successfully.' });
});

// PATCH /api/assignments/:id/transition - State transition (teacher only)
router.patch('/:id/transition', authenticate, isTeacher, (req, res) => {
  const db = readDB();
  const idx = db.assignments.findIndex(a => a.id === req.params.id);

  if (idx === -1) return res.status(404).json({ message: 'Assignment not found.' });

  const assignment = db.assignments[idx];
  const { action } = req.body; // 'publish' or 'complete'

  const transitions = {
    draft: { publish: 'published' },
    published: { complete: 'completed' }
  };

  const newStatus = transitions[assignment.status]?.[action];
  if (!newStatus) {
    return res.status(400).json({
      message: `Cannot perform '${action}' on an assignment with status '${assignment.status}'.`
    });
  }

  db.assignments[idx].status = newStatus;
  writeDB(db);
  res.json(db.assignments[idx]);
});

// GET /api/assignments/:id/submissions - Get submissions for an assignment (teacher only)
router.get('/:id/submissions', authenticate, isTeacher, (req, res) => {
  const db = readDB();
  const assignment = db.assignments.find(a => a.id === req.params.id);
  if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });

  const submissions = db.submissions.filter(s => s.assignmentId === req.params.id);
  res.json(submissions);
});

// PATCH /api/assignments/:id/submissions/:submissionId/review - Mark reviewed
router.patch('/:id/submissions/:submissionId/review', authenticate, isTeacher, (req, res) => {
  const db = readDB();
  const idx = db.submissions.findIndex(
    s => s.id === req.params.submissionId && s.assignmentId === req.params.id
  );

  if (idx === -1) return res.status(404).json({ message: 'Submission not found.' });

  db.submissions[idx].reviewed = true;
  writeDB(db);
  res.json(db.submissions[idx]);
});

// DELETE /api/assignments/:id/submissions/:submissionId - Delete a submission (teacher only)
router.delete('/:id/submissions/:submissionId', authenticate, isTeacher, (req, res) => {
  const db = readDB();
  const idx = db.submissions.findIndex(
    s => s.id === req.params.submissionId && s.assignmentId === req.params.id
  );

  if (idx === -1) return res.status(404).json({ message: 'Submission not found.' });

  db.submissions.splice(idx, 1);
  writeDB(db);
  
  res.json({ message: 'Submission deleted successfully.' });
});

module.exports = router;
