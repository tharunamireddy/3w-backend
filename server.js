const express = require('express');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// Add CORS middleware with specific configuration
app.use(cors({
  origin: 'http://localhost:3000', // Allow the frontend origin
  methods: 'GET,POST,PUT,DELETE',
  allowedHeaders: 'Content-Type,Authorization', // Allow required headers
  credentials: true, // Allow cookies/auth headers
}));

app.use(express.json());
// MongoDB connection
mongoose.connect('mongodb+srv://tharunamireddy07:AkpdevB9cN2KZO53@cluster0.mqukg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Models
const UserSubmission = mongoose.model('UserSubmission', new mongoose.Schema({
  name: String,
  handle: String,
  images: [String], // Store image paths
}));

const Admin = mongoose.model('Admin', new mongoose.Schema({
  username: String,
  password: String,
}));

// Multer setup for image upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
});

// Route to handle user submissions
app.post('/submit', upload.array('images', 10), async (req, res) => {
  const { name, handle } = req.body;
  const imagePaths = req.files.map(file => file.path);

  const newSubmission = new UserSubmission({
    name,
    handle,
    images: imagePaths,
  });

  await newSubmission.save();
  res.json({ message: 'Submission successful!' });
});

// Admin authentication
app.post('/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });

  if (!admin) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

  res.json({ token });
});

// Middleware to verify token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization').replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Route to get submissions (only accessible to admin)
app.get('/admin/submissions', verifyToken, async (req, res) => {
  const submissions = await UserSubmission.find();
  res.json(submissions);
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
