const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const OpenAI = require('openai');
require('dotenv').config();

const execPromise = util.promisify(exec);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const CHUNK_DURATION = 300; // 5 minutes in seconds

async function splitAudioFile(inputPath, outputDir) {
  console.log(`Splitting audio file: ${inputPath}`);
  console.log(`Output directory: ${outputDir}`);

  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Get audio duration using ffprobe
    const { stdout: durationOutput } = await execPromise(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${inputPath}"`
    );
    const duration = parseFloat(durationOutput);
    console.log(`Audio duration: ${duration} seconds`);

    // Calculate number of chunks needed
    const numChunks = Math.ceil(duration / CHUNK_DURATION);
    const chunkPaths = [];

    // Split the audio file
    for (let i = 0; i < numChunks; i++) {
      const startTime = i * CHUNK_DURATION;
      const outputPath = path.join(outputDir, `chunk_${i}.mp3`);
      
      console.log(`Creating chunk ${i + 1}/${numChunks}...`);
      
      try {
        // Add -vn flag to ignore video streams and -ac 1 for mono audio
        const ffmpegCommand = `ffmpeg -y -i "${inputPath}" -ss ${startTime} -t ${CHUNK_DURATION} -vn -ac 1 -ar 16000 -b:a 64k "${outputPath}"`;
        console.log(`Running command: ${ffmpegCommand}`);
        
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
        
        chunkPaths.push(outputPath);
        console.log(`Chunk ${i + 1} created successfully (${(chunkStats.size / (1024 * 1024)).toFixed(2)} MB)`);
      } catch (error) {
        console.error(`Error creating chunk ${i + 1}:`, error);
        throw error;
      }
    }

    return { chunkPaths, numChunks };
  } catch (error) {
    console.error('Error splitting audio file:', error);
    throw error;
  }
}

async function transcribeAudioChunk(chunkPath, chunkIndex, totalChunks, language = 'en') {
  console.log(`Transcribing chunk ${chunkIndex + 1}/${totalChunks} in ${language}`);
  
  try {
    // First get the transcription
    const transcriptionFile = fs.createReadStream(chunkPath);
    const transcription = await openai.audio.transcriptions.create({
      file: transcriptionFile,
      model: "whisper-1",
      language: language,
      response_format: "verbose_json",
      timestamp_granularities: ["word", "segment"]
    });

    console.log(`Got transcription for chunk ${chunkIndex + 1}`);

    // For Chinese audio, get the translation
    let translation = null;
    if (language === 'zh') {
      console.log(`Getting translation for chunk ${chunkIndex + 1}`);
      const translationFile = fs.createReadStream(chunkPath);
      translation = await openai.audio.translations.create({
        file: translationFile,
        model: "whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["segment"]
      });
      console.log(`Got translation for chunk ${chunkIndex + 1}`);
    }

    // Calculate time offset for this chunk
    const timeOffset = chunkIndex * CHUNK_DURATION;

    // Process segments and associate words with them
    const processedSegments = transcription.segments.map((segment, index) => {
      // Adjust segment timestamps
      const startTime = segment.start + timeOffset;
      const endTime = segment.end + timeOffset;

      // Find words that belong to this segment based on their timestamps
      const segmentWords = transcription.words
        ? transcription.words.filter(word => {
            const wordStart = word.start + timeOffset;
            const wordEnd = word.end + timeOffset;
            return wordStart >= startTime && wordEnd <= endTime;
          }).map(word => ({
            text: word.word,
            start: word.start + timeOffset,
            end: word.end + timeOffset
          }))
        : [];

      const result = {
        startTime,
        endTime,
        text: segment.text,
        words: segmentWords
      };

      // Add translation if available
      if (language === 'zh' && translation?.segments[index]) {
        result.translation = translation.segments[index].text;
        result.isChineseAudio = true;
      }

      return result;
    });

    return processedSegments;
  } catch (error) {
    console.error(`Error transcribing chunk ${chunkIndex + 1}:`, error);
    throw error;
  }
}

async function transcribeDemoAudio() {
  try {
    // Process both English and Chinese demos
    const demos = [
      {
        inputPath: path.join(__dirname, 'public', 'demo', 'demo-audio.mp4'),
        outputPath: path.join(__dirname, 'public', 'demo', 'demo-transcription.json'),
        language: 'en'
      },
      {
        inputPath: path.join(__dirname, 'public', 'demo', 'demo-audio-cn.m4a'),
        outputPath: path.join(__dirname, 'public', 'demo', 'demo-transcription-cn.json'),
        language: 'zh'
      }
    ];

    for (const demo of demos) {
      console.log(`\nProcessing ${demo.language.toUpperCase()} demo...`);
      console.log(`Input file: ${demo.inputPath}`);
      console.log(`Output file: ${demo.outputPath}`);

      // Check if input file exists
      if (!fs.existsSync(demo.inputPath)) {
        console.error(`Input file not found: ${demo.inputPath}`);
        continue;
      }
      
      // Create temporary directory for chunks
      const chunksDir = path.join(__dirname, `temp-chunks-${demo.language}`);
      console.log(`Creating chunks directory: ${chunksDir}`);

      try {
        // Split audio into chunks
        const { chunkPaths, numChunks } = await splitAudioFile(demo.inputPath, chunksDir);
        console.log(`Split audio into ${numChunks} chunks, starting transcription...`);
        
        // Transcribe each chunk
        const transcriptions = [];
        for (let i = 0; i < chunkPaths.length; i++) {
          console.log(`Processing chunk ${i + 1}/${numChunks}`);
          const segments = await transcribeAudioChunk(chunkPaths[i], i, numChunks, demo.language);
          console.log(`Successfully transcribed chunk ${i + 1}/${numChunks}`);
          transcriptions.push(...segments);
        }

        // Sort segments by start time
        transcriptions.sort((a, b) => a.startTime - b.startTime);

        // Save transcription to file
        const outputDir = path.dirname(demo.outputPath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        fs.writeFileSync(demo.outputPath, JSON.stringify(transcriptions, null, 2));
        console.log(`${demo.language.toUpperCase()} transcription saved to ${demo.outputPath}`);
        
        // Clean up chunks
        console.log('Cleaning up chunks...');
        for (const chunkPath of chunkPaths) {
          if (fs.existsSync(chunkPath)) {
            fs.unlinkSync(chunkPath);
          }
        }
        if (fs.existsSync(chunksDir)) {
          fs.rmdirSync(chunksDir);
        }
      } catch (error) {
        console.error(`Error processing ${demo.language} demo:`, error);
      }
    }
    
    console.log('\nAll demo transcriptions completed');
  } catch (error) {
    console.error('Error transcribing demo audio:', error);
  }
}

// Run the transcription
transcribeDemoAudio(); 