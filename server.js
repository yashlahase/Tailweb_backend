require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const assignmentRoutes = require('./routes/assignments');
const submissionRoutes = require('./routes/submissions');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];
if (process.env.FRONTEND_URL) {
  // Allow multiple URLs to be comma separated if needed
  allowedOrigins.push(...process.env.FRONTEND_URL.split(','));
}

app.use(cors({ 
  origin: allowedOrigins, 
  credentials: true 
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/submissions', submissionRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// 404 handler
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Assignment Portal API running on http://localhost:${PORT}`);
  console.log('📚 Test credentials:');
  console.log('   Teacher → teacher@school.com / password');
  console.log('   Student → student@school.com / password');
  console.log('   Student → bob@school.com / password\n');
});
