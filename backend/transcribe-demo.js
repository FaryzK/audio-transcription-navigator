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
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log('Getting audio duration...');
    // Get audio duration using ffprobe
    const { stdout: durationOutput } = await execPromise(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`
    );
    const duration = parseFloat(durationOutput);
    console.log(`Audio duration: ${duration} seconds`);

    // Calculate number of chunks needed
    const chunkDuration = 300; // 5 minutes per chunk
    const numChunks = Math.ceil(duration / chunkDuration);
    const chunkPaths = [];

    console.log(`Splitting into ${numChunks} chunks...`);
    // Split the audio file
    for (let i = 0; i < numChunks; i++) {
      const startTime = i * chunkDuration;
      const outputPath = path.join(outputDir, `chunk_${i}.mp3`);
      
      console.log(`Creating chunk ${i + 1}/${numChunks}...`);
      
      // Add timeout and error handling for ffmpeg command
      try {
        const ffmpegCommand = `ffmpeg -y -i "${inputPath}" -ss ${startTime} -t ${chunkDuration} -acodec libmp3lame -ar 44100 "${outputPath}"`;
        console.log(`Running command: ${ffmpegCommand}`);
        
        const { stdout, stderr } = await execPromise(ffmpegCommand);
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
        
        chunkPaths.push(outputPath);
        console.log(`Chunk ${i + 1} created successfully (${(chunkStats.size / (1024 * 1024)).toFixed(2)} MB)`);
      } catch (error) {
        console.error(`Error creating chunk ${i + 1}:`, error);
        throw error;
      }
    }

    return chunkPaths;
  } catch (error) {
    console.error('Error splitting audio file:', error);
    throw error;
  }
}

async function transcribeAudioChunk(chunkPath, chunkIndex, totalChunks) {
  console.log(`Transcribing chunk ${chunkIndex + 1}/${totalChunks}...`);
  const audioFile = fs.createReadStream(chunkPath);
  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["word", "segment"]
  });

  console.log('Received transcription response:', JSON.stringify(transcription, null, 2));

  // Calculate time offset for this chunk
  const timeOffset = chunkIndex * 300; // Assuming CHUNK_DURATION is 300 seconds

  // Process segments and associate words with them
  const processedSegments = transcription.segments.map(segment => {
    // Adjust segment timestamps
    const startTime = segment.start + timeOffset;
    const endTime = segment.end + timeOffset;

    // Find words that belong to this segment based on their timestamps
    const segmentWords = transcription.words.filter(word => {
      const wordStart = word.start + timeOffset;
      const wordEnd = word.end + timeOffset;
      return wordStart >= startTime && wordEnd <= endTime;
    }).map(word => ({
      text: word.word,
      start: word.start + timeOffset,
      end: word.end + timeOffset
    }));

    return {
      startTime,
      endTime,
      text: segment.text,
      words: segmentWords
    };
  });

  return processedSegments;
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
    console.log(`File size: ${(fileSize / (1024 * 1024)).toFixed(2)} MB`);

    let transcriptions = [];

    if (fileSize > MAX_FILE_SIZE) {
      console.log('File size exceeds limit, splitting into chunks...');
      try {
        const chunkPaths = await splitAudioFile(audioPath, chunksDir);
        
        console.log(`Split audio into ${chunkPaths.length} chunks`);
        
        // Process each chunk
        for (let i = 0; i < chunkPaths.length; i++) {
          console.log(`Processing chunk ${i + 1}/${chunkPaths.length}...`);
          const chunkSegments = await transcribeAudioChunk(chunkPaths[i], i, chunkPaths.length);
          
          transcriptions = transcriptions.concat(chunkSegments);
        }

        // Clean up chunk files
        console.log('Cleaning up chunk files...');
        for (const chunkPath of chunkPaths) {
          fs.unlinkSync(chunkPath);
        }
        fs.rmdirSync(chunksDir);
      } catch (error) {
        console.error('Error during chunking process:', error);
        throw error;
      }
    } else {
      console.log('Processing file directly...');
      const segments = await transcribeAudioChunk(audioPath, 0, 1);
      transcriptions = segments;
    }
    
    // Path to save the transcription
    const transcriptionPath = path.join(__dirname, 'public/demo/demo-transcription.json');
    
    // Save the transcription to a file
    fs.writeFileSync(transcriptionPath, JSON.stringify(transcriptions, null, 2));
    
    console.log(`Transcription saved to ${transcriptionPath}`);
    console.log(`Total segments: ${transcriptions.length}`);
    
  } catch (error) {
    console.error('Error transcribing demo audio:', error);
  }
}

// Run the transcription
transcribeDemoAudio(); 