const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
require('dotenv').config();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Maximum file size in bytes (24MB to be safe)
const MAX_FILE_SIZE = 24 * 1024 * 1024;

async function splitAudioFile(inputPath, outputDir) {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Get audio duration using ffprobe
  const { stdout: durationOutput } = await execPromise(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`
  );
  const duration = parseFloat(durationOutput);

  // Calculate number of chunks needed
  const chunkDuration = 300; // 5 minutes per chunk
  const numChunks = Math.ceil(duration / chunkDuration);
  const chunkPaths = [];

  // Split the audio file
  for (let i = 0; i < numChunks; i++) {
    const startTime = i * chunkDuration;
    const outputPath = path.join(outputDir, `chunk_${i}.mp3`);
    
    await execPromise(
      `ffmpeg -i "${inputPath}" -ss ${startTime} -t ${chunkDuration} -acodec libmp3lame -ar 44100 "${outputPath}"`
    );
    
    chunkPaths.push(outputPath);
  }

  return chunkPaths;
}

async function transcribeAudioChunk(chunkPath) {
  const transcription = await openai.audio.transcriptions.create({
    file: fs.createReadStream(chunkPath),
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"]
  });
  return transcription;
}

async function transcribeDemoAudio() {
  try {
    console.log('Starting transcription of demo audio...');
    
    // Path to the demo audio file
    const audioPath = path.join(__dirname, 'public/demo/demo-audio.mp4');
    const chunksDir = path.join(__dirname, 'public/demo/chunks');
    
    // Check if the file exists
    if (!fs.existsSync(audioPath)) {
      console.error(`Error: Demo audio file not found at ${audioPath}`);
      return;
    }

    // Get file size
    const stats = fs.statSync(audioPath);
    const fileSize = stats.size;

    let transcriptions = [];

    if (fileSize > MAX_FILE_SIZE) {
      console.log('File size exceeds limit, splitting into chunks...');
      const chunkPaths = await splitAudioFile(audioPath, chunksDir);
      
      console.log(`Split audio into ${chunkPaths.length} chunks`);
      
      // Process each chunk
      for (let i = 0; i < chunkPaths.length; i++) {
        console.log(`Processing chunk ${i + 1}/${chunkPaths.length}...`);
        const transcription = await transcribeAudioChunk(chunkPaths[i]);
        
        // Adjust timestamps based on chunk position
        const timeOffset = i * 300; // 5 minutes per chunk
        transcription.segments = transcription.segments.map(segment => ({
          ...segment,
          start: segment.start + timeOffset,
          end: segment.end + timeOffset
        }));
        
        transcriptions = transcriptions.concat(transcription.segments);
      }

      // Clean up chunk files
      for (const chunkPath of chunkPaths) {
        fs.unlinkSync(chunkPath);
      }
      fs.rmdirSync(chunksDir);
    } else {
      console.log('Processing file directly...');
      const transcription = await transcribeAudioChunk(audioPath);
      transcriptions = transcription.segments;
    }
    
    // Format the segments
    const formattedSegments = transcriptions.map(segment => ({
      startTime: segment.start,
      endTime: segment.end,
      text: segment.text.trim()
    }));
    
    // Path to save the transcription
    const transcriptionPath = path.join(__dirname, 'public/demo/demo-transcription.json');
    
    // Save the transcription to a file
    fs.writeFileSync(transcriptionPath, JSON.stringify(formattedSegments, null, 2));
    
    console.log(`Transcription saved to ${transcriptionPath}`);
    console.log(`Total segments: ${formattedSegments.length}`);
    
  } catch (error) {
    console.error('Error transcribing demo audio:', error);
  }
}

// Run the transcription
transcribeDemoAudio(); 