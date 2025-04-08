const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { OpenAI } = require('openai');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Constants
const OPENAI_SIZE_LIMIT = 25 * 1024 * 1024; // 25MB - OpenAI's limit
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB max upload size
const CHUNK_DURATION = 300; // 5 minutes per chunk

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for memory storage (don't save files to disk)
const storage = multer.memoryStorage();

const upload = multer({ 
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    // Accept various audio formats
    const allowedMimes = [
      'audio/m4a',
      'audio/mp4',
      'audio/mp3',
      'audio/mpeg',
      'audio/wav',
      'video/mp4',
      'audio/x-m4a',           // Common M4A MIME type
      'audio/aac',             // AAC audio (often in M4A container)
      'audio/x-mp4',           // Alternative MP4 audio
      'audio/MP4A-LATM',       // Another M4A variant
      'audio/mpeg4-generic',   // Generic MPEG-4 audio
      'audio/x-mpeg',          // Alternative MPEG audio
      'audio/x-wav'            // Alternative WAV format
    ];
    
    console.log('Uploaded file MIME type:', file.mimetype);
    console.log('File size:', (file.size / (1024 * 1024)).toFixed(2), 'MB');
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      // Check file extension as fallback
      const ext = path.extname(file.originalname).toLowerCase();
      const allowedExts = ['.m4a', '.mp3', '.mp4', '.wav', '.aac'];
      
      if (allowedExts.includes(ext)) {
        console.log('Allowing file based on extension:', ext);
        cb(null, true);
      } else {
        cb(new Error(`Unsupported file format. Supported formats: MP3, M4A, WAV, MP4. (Got MIME: ${file.mimetype}, Extension: ${ext})`));
      }
    }
  }
});

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function splitAudioFile(inputPath, outputDir, res) {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Send progress update for analysis start
    res.write(JSON.stringify({
      status: 'processing',
      stage: 'chunking',
      phase: 'analyzing',
      message: 'Analyzing audio file...',
      chunkingProgress: 0,
      transcriptionProgress: 0
    }) + '\n---\n');

    // Get audio duration using ffprobe
    const { stdout: durationOutput } = await execPromise(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`
    );
    const duration = parseFloat(durationOutput);

    // Calculate number of chunks needed
    const numChunks = Math.ceil(duration / CHUNK_DURATION);
    const chunkPaths = [];

    // Send progress update for splitting start
    res.write(JSON.stringify({
      status: 'processing',
      stage: 'chunking',
      phase: 'splitting',
      message: `Splitting audio into ${numChunks} chunks...`,
      chunkingProgress: 10,
      transcriptionProgress: 0
    }) + '\n---\n');

    // Split the audio file
    for (let i = 0; i < numChunks; i++) {
      const startTime = i * CHUNK_DURATION;
      const outputPath = path.join(outputDir, `chunk_${i}.mp3`);
      
      // Send chunk progress
      res.write(JSON.stringify({
        status: 'processing',
        stage: 'chunking',
        phase: 'splitting',
        message: `Creating chunk ${i + 1}/${numChunks}`,
        chunkingProgress: 10 + ((i + 1) / numChunks) * 90,
        transcriptionProgress: 0
      }) + '\n---\n');
      
      try {
        // Add -vn flag to ignore video streams and -ac 1 for mono audio
        // Add -y to overwrite output files
        // Add error level logging
        const ffmpegCommand = `ffmpeg -y -i "${inputPath}" -ss ${startTime} -t ${CHUNK_DURATION} -vn -ac 1 -acodec libmp3lame -ar 16000 -b:a 64k "${outputPath}" -loglevel error`;
        
        const { stderr } = await execPromise(ffmpegCommand);
        if (stderr) {
          console.log(`FFmpeg output for chunk ${i + 1}:`, stderr);
        }
        
        // Verify the chunk was created and has content
        if (!fs.existsSync(outputPath)) {
          throw new Error(`Failed to create chunk ${i + 1}`);
        }
        
        const chunkStats = fs.statSync(outputPath);
        if (chunkStats.size === 0) {
          throw new Error(`Chunk ${i + 1} was created but is empty`);
        }

        // Validate the audio file using ffprobe
        try {
          const { stdout: probeOutput } = await execPromise(
            `ffprobe -v error -select_streams a:0 -show_entries stream=codec_name -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
          );
          if (!probeOutput.trim()) {
            throw new Error(`No audio stream found in chunk ${i + 1}`);
          }
        } catch (probeError) {
          console.error(`Error validating chunk ${i + 1}:`, probeError);
          throw new Error(`Invalid audio in chunk ${i + 1}`);
        }
        
        chunkPaths.push(outputPath);
        console.log(`Created chunk ${i + 1}/${numChunks} (${(chunkStats.size / (1024 * 1024)).toFixed(2)} MB)`);
      } catch (error) {
        console.error(`Error creating chunk ${i + 1}:`, error);
        
        // Send error update
        res.write(JSON.stringify({
          status: 'error',
          stage: 'chunking',
          phase: 'error',
          message: `Error creating chunk ${i + 1}: ${error.message}`,
          error: error.message
        }) + '\n---\n');
        
        throw error;
      }
    }

    // Send completion of chunking stage
    res.write(JSON.stringify({
      status: 'processing',
      stage: 'chunking',
      phase: 'complete',
      message: 'Audio file splitting completed',
      chunkingProgress: 100,
      transcriptionProgress: 0
    }) + '\n---\n');

    return { chunkPaths, numChunks };
  } catch (error) {
    console.error('Error splitting audio file:', error);
    throw error;
  }
}

async function transcribeAudioChunk(chunkPath, chunkIndex, totalChunks, res) {
  try {
    console.log(`Starting transcription of chunk ${chunkIndex + 1}/${totalChunks}`);
    
    // Send chunk transcription start progress
    res.write(JSON.stringify({
      status: 'processing',
      stage: 'transcribing',
      phase: 'processing',
      message: `Starting transcription of chunk ${chunkIndex + 1}/${totalChunks}`,
      chunkingProgress: 100,
      transcriptionProgress: (chunkIndex / totalChunks) * 100
    }) + '\n---\n');

    // First get the transcription to detect language
    const detectFile = fs.createReadStream(chunkPath);
    const detection = await openai.audio.transcriptions.create({
      file: detectFile,
      model: "whisper-1",
      response_format: "verbose_json"
    });

    // Detect if the audio is in Chinese
    const isChineseAudio = detection.language === 'chinese' || 
                          detection.segments?.[0]?.language === 'chinese';

    console.log('Language detected:', isChineseAudio ? 'Chinese' : 'English');

    let transcription;
    let translation = null;

    if (isChineseAudio) {
      // For Chinese audio, get Chinese transcription with word timestamps
      const chineseFile = fs.createReadStream(chunkPath);
      transcription = await openai.audio.transcriptions.create({
        file: chineseFile,
        model: "whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["word", "segment"],
        language: "zh"
      });

      // Get English translation
      const translationFile = fs.createReadStream(chunkPath);
      translation = await openai.audio.translations.create({
        file: translationFile,
        model: "whisper-1",
        response_format: "verbose_json"
      });
    } else {
      // For English audio, get English transcription with word timestamps
      const englishFile = fs.createReadStream(chunkPath);
      transcription = await openai.audio.transcriptions.create({
        file: englishFile,
        model: "whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["word", "segment"],
        language: "en"
      });
    }

    // Calculate time offset for this chunk
    const timeOffset = chunkIndex * CHUNK_DURATION;

    // Process segments and words
    const processedSegments = transcription.segments.map((segment, index) => {
      // Adjust segment timestamps
      const startTime = segment.start + timeOffset;
      const endTime = segment.end + timeOffset;

      // Get corresponding translation segment if Chinese
      const translationText = isChineseAudio && translation?.segments[index] 
        ? translation.segments[index].text.trim()
        : null;

      // Process words if available in the segment
      let segmentWords = [];
      if (segment.words && Array.isArray(segment.words)) {
        // First get the raw words with their timing information
        const rawWords = segment.words.map(word => ({
          text: word.text || word.word || "",
          start: (word.start || word.timestamp || 0) + timeOffset,
          end: (word.end || (word.timestamp + (word.duration || 0))) + timeOffset
        }));

        // Split the segment text into actual words
        const actualWords = segment.text.trim().split(/\s+/);
        
        // Process words and try to match them with the actual text
        let currentRawIndex = 0;
        segmentWords = [];
        
        for (let actualWord of actualWords) {
          if (currentRawIndex >= rawWords.length) break;
          
          let combinedWord = {
            text: actualWord,
            start: rawWords[currentRawIndex].start,
            end: rawWords[currentRawIndex].end
          };
          
          let rawWordText = '';
          let tempIndex = currentRawIndex;
          
          while (tempIndex < rawWords.length) {
            rawWordText += rawWords[tempIndex].text;
            combinedWord.end = rawWords[tempIndex].end;
            
            if (rawWordText.toLowerCase() === actualWord.toLowerCase()) {
              currentRawIndex = tempIndex + 1;
              break;
            }
            tempIndex++;
          }
          
          segmentWords.push(combinedWord);
        }
      }

      // If no words found, try to get them from the global words array
      if (segmentWords.length === 0 && transcription.words) {
        segmentWords = transcription.words
          .filter(word => {
            const wordStart = (word.start || word.timestamp || 0) + timeOffset;
            return wordStart >= startTime && wordStart < endTime;
          })
          .map(word => ({
            text: word.text || word.word || "",
            start: (word.start || word.timestamp || 0) + timeOffset,
            end: (word.end || (word.timestamp + (word.duration || 0))) + timeOffset
          }));
      }

      // If still no words, split the text evenly
      if (segmentWords.length === 0) {
        const wordTexts = segment.text.trim().split(/\s+/);
        const wordDuration = (endTime - startTime) / wordTexts.length;
        
        segmentWords = wordTexts.map((text, i) => ({
          text: text,
          start: startTime + (i * wordDuration),
          end: startTime + ((i + 1) * wordDuration)
        }));
      }

      // Create the segment object
      const processedSegment = {
        startTime,
        endTime,
        text: segment.text.trim(),
        words: segmentWords,
        isChineseAudio
      };

      // Only add translation if it's Chinese audio
      if (isChineseAudio && translationText) {
        processedSegment.translation = translationText;
      }

      return processedSegment;
    });

    // Send chunk completion progress
    res.write(JSON.stringify({
      status: 'processing',
      stage: 'transcribing',
      phase: 'processing',
      message: `Completed chunk ${chunkIndex + 1}/${totalChunks}`,
      chunkingProgress: 100,
      transcriptionProgress: ((chunkIndex + 1) / totalChunks) * 100,
      segments: processedSegments
    }) + '\n---\n');

    return processedSegments;
  } catch (error) {
    console.error(`Error transcribing chunk ${chunkIndex + 1}:`, error);
    throw error;
  }
}

// Routes
app.get('/demo-data', (req, res) => {
  try {
    const transcriptionPath = path.join(__dirname, 'public/demo/demo-transcription.json');
    const transcription = JSON.parse(fs.readFileSync(transcriptionPath, 'utf8'));
    
    // Get the server's base URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    
    res.json({
      audioUrl: `${baseUrl}/demo/demo-audio.mp4`,
      transcription: transcription
    });
  } catch (error) {
    console.error('Error serving demo data:', error);
    res.status(500).json({ error: 'Failed to load demo data' });
  }
});

app.post('/transcribe', upload.single('audio'), async (req, res) => {
  let tempFilePath = null;
  let chunksDir = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Set response headers for streaming
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    // Create a temporary file from the buffer
    tempFilePath = path.join(__dirname, `temp-${Date.now()}${path.extname(req.file.originalname)}`);
    fs.writeFileSync(tempFilePath, req.file.buffer);

    const fileSizeInMB = req.file.size / (1024 * 1024);
    console.log(`Processing file of size: ${fileSizeInMB.toFixed(2)} MB`);

    // Send initial progress update
    res.write(JSON.stringify({ 
      status: 'processing',
      stage: 'initializing',
      phase: 'starting',
      message: 'Starting transcription process...',
      chunkingProgress: 0,
      transcriptionProgress: 0
    }) + '\n---\n');

    let allSegments = [];

    if (req.file.size > OPENAI_SIZE_LIMIT) {
      console.log('File exceeds OpenAI limit, splitting into chunks...');
      chunksDir = path.join(__dirname, `chunks-${Date.now()}`);
      
      const { chunkPaths, numChunks } = await splitAudioFile(tempFilePath, chunksDir, res);
      console.log(`Split audio into ${numChunks} chunks, starting transcription...`);
      
      for (let i = 0; i < chunkPaths.length; i++) {
        try {
          console.log(`Processing chunk ${i + 1}/${numChunks}`);
          const chunkSegments = await transcribeAudioChunk(chunkPaths[i], i, numChunks, res);
          console.log(`Successfully transcribed chunk ${i + 1}/${numChunks}`);
          allSegments = allSegments.concat(chunkSegments);
        } catch (error) {
          console.error(`Failed to process chunk ${i + 1}/${numChunks}:`, error);
          throw error;
        }
      }

      console.log('All chunks processed, cleaning up...');
      for (const chunkPath of chunkPaths) {
        fs.unlinkSync(chunkPath);
      }
      fs.rmdirSync(chunksDir);
    } else {
      res.write(JSON.stringify({
        status: 'processing',
        stage: 'chunking',
        phase: 'skipped',
        message: 'File small enough to process directly',
        chunkingProgress: 100,
        transcriptionProgress: 0
      }) + '\n---\n');
      
      allSegments = await transcribeAudioChunk(tempFilePath, 0, 1, res);
    }

    allSegments.sort((a, b) => a.startTime - b.startTime);
    console.log(`Transcription complete. Total segments: ${allSegments.length}`);

    // Send final transcription
    res.write(JSON.stringify({ 
      status: 'complete',
      stage: 'finished',
      phase: 'complete',
      message: 'Transcription completed',
      chunkingProgress: 100,
      transcriptionProgress: 100,
      segments: allSegments
    }) + '\n---\n');
    res.end();

  } catch (error) {
    console.error('Transcription error:', error);
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
    if (chunksDir && fs.existsSync(chunksDir)) {
      fs.rmdirSync(chunksDir, { recursive: true });
    }
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Transcription failed: ' + error.message,
        details: error.response?.data || 'No additional details available'
      });
    } else {
      res.write(JSON.stringify({
        status: 'error',
        stage: 'error',
        phase: 'error',
        message: 'Transcription failed: ' + error.message,
        error: error.message,
        details: error.response?.data || 'No additional details available'
      }) + '\n---\n');
      res.end();
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File is too large',
        details: `Maximum upload size is 500MB. Please use a shorter audio clip or compress the file.`
      });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  res.status(500).json({ error: err.message || 'Something broke!' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 