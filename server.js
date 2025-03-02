const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));

// Define schemas
const noteSchema = new mongoose.Schema({
  profile: String,
  teamMember: String,
  email: String,
  content: String,
  labels: [String],
  timestamp: { type: Date, default: Date.now },
  lastEditedBy: String
});

const profileInfoSchema = new mongoose.Schema({
  profile: { type: String, unique: true },
  email: String,
  phone: String,
  languages: String
});

const activityLogSchema = new mongoose.Schema({
  email: String,
  action: String,
  profile: String,
  timestamp: { type: Date, default: Date.now }
});

// Define models
const Note = mongoose.model('Note', noteSchema);
const ProfileInfo = mongoose.model('ProfileInfo', profileInfoSchema);
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

// Authentication middleware
const authenticateUser = (req, res, next) => {
  const { email } = req.body;
  const authorizedUsers = [
    'savan.deodap@gmail.com',
    'sakilsanna.deodap@gmail.com',
    'jay.deodap1@gmail.com',
    'karanrawal.deodap@gmail.com',
    'palakvasoya.deodap@gmail.com',
    'socialmedia.deodap@gmail.com'
  ];
  
  if (!email || !authorizedUsers.includes(email)) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' });
  }
  
  next();
};

// Routes
app.post('/api/authenticate', (req, res) => {
  const { email, password } = req.body;
  const authorizedUsers = {
    'savan.deodap@gmail.com': { role: 'Admin' },
    'sakilsanna.deodap@gmail.com': { role: 'Admin' },
    'jay.deodap1@gmail.com': { role: 'Editor' },
    'karanrawal.deodap@gmail.com': { role: 'Editor' },
    'palakvasoya.deodap@gmail.com': { role: 'Editor' },
    'socialmedia.deodap@gmail.com': { role: 'Editor' }
  };
  
  if (password !== 'teamaccess123' || !authorizedUsers[email]) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }
  
  // Log activity
  const activity = new ActivityLog({
    email,
    action: 'login',
    profile: '',
  });
  activity.save();
  
  res.json({ success: true, email, role: authorizedUsers[email].role });
});

app.get('/api/notes/:profile', authenticateUser, async (req, res) => {
  try {
    const { profile } = req.params;
    const notes = await Note.find({ profile }).sort({ timestamp: -1 });
    const profileInfo = await ProfileInfo.findOne({ profile }) || { email: '', phone: '', languages: '' };
    
    res.json({ status: 'success', notes, profileInfo });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/notes', authenticateUser, async (req, res) => {
  try {
    const { profile, teamMember, email, content, labels } = req.body;
    
    const note = new Note({
      profile,
      teamMember,
      email,
      content,
      labels,
      lastEditedBy: email
    });
    
    await note.save();
    
    // Log activity
    const activity = new ActivityLog({
      email,
      action: 'add_note',
      profile,
    });
    await activity.save();
    
    res.json({ status: 'success', noteId: note._id, message: 'Note added successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.delete('/api/notes/:noteId', authenticateUser, async (req, res) => {
  try {
    const { noteId } = req.params;
    const { email } = req.body;
    
    const note = await Note.findByIdAndDelete(noteId);
    
    if (!note) {
      return res.status(404).json({ status: 'error', message: 'Note not found' });
    }
    
    // Log activity
    const activity = new ActivityLog({
      email,
      action: 'delete_note',
      profile: note.profile,
    });
    await activity.save();
    
    res.json({ status: 'success', message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/profile-info', authenticateUser, async (req, res) => {
  try {
    const { profile, email, phone, languages } = req.body;
    
    await ProfileInfo.findOneAndUpdate(
      { profile },
      { email, phone, languages },
      { upsert: true, new: true }
    );
    
    // Log activity
    const activity = new ActivityLog({
      email: req.body.email,
      action: 'update_profile',
      profile,
    });
    await activity.save();
    
    res.json({ status: 'success', message: 'Profile information updated successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

app.post('/api/log-activity', authenticateUser, async (req, res) => {
  try {
    const { email, action, profile } = req.body;
    
    const activity = new ActivityLog({
      email,
      action,
      profile: profile || '',
    });
    
    await activity.save();
    
    res.json({ status: 'success', message: 'Activity logged successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
