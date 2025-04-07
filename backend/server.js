const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    // Accept both M4A and MP4 files
    if (file.mimetype === 'audio/m4a' || file.mimetype === 'audio/mp4' || file.mimetype === 'video/mp4') {
      cb(null, true);
    } else {
      cb(new Error('Only M4A and MP4 files are allowed'));
    }
  }
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Routes
app.get('/demo-data', (req, res) => {
  try {
    const transcriptionPath = path.join(__dirname, 'public/demo/demo-transcription.json');
    const transcription = JSON.parse(fs.readFileSync(transcriptionPath, 'utf8'));
    
    // Get the server's base URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.json({
      audioUrl: `${baseUrl}/demo/demo-audio.mp4`, // Full URL to the demo audio file
      transcription: transcription
    });
  } catch (error) {
    console.error('Error serving demo data:', error);
    res.status(500).json({ error: 'Failed to load demo data' });
  }
});

app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(req.file.path),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"]
    });

    // Clean up the uploaded file
    fs.unlinkSync(req.file.path);

    // Format the response to match our expected structure
    const formattedSegments = transcription.segments.map(segment => ({
      startTime: segment.start,
      endTime: segment.end,
      text: segment.text.trim()
    }));

    res.json({ segments: formattedSegments });
  } catch (error) {
    console.error('Transcription error:', error);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 