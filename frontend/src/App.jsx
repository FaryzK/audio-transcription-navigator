import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import AudioPlayer from './components/AudioPlayer';
import TranscriptionView from './components/TranscriptionView';
import SearchBar from './components/SearchBar';

// Use relative paths instead of hardcoded URLs
const API_BASE_URL = '/api';

function App() {
  const [audioUrl, setAudioUrl] = useState(null);
  const [segments, setSegments] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  const [isFollowing, setIsFollowing] = useState(true);
  const uploadedAudioUrl = useRef(null);
  const [chunkingProgress, setChunkingProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    loadDemoData();
    // Cleanup function to revoke object URL
    return () => {
      if (uploadedAudioUrl.current) {
        URL.revokeObjectURL(uploadedAudioUrl.current);
      }
    };
  }, []);

  const loadDemoData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_BASE_URL}/demo-data`);
      setAudioUrl(response.data.audioUrl);
      setSegments(response.data.transcription);
      setError(null);
    } catch (err) {
      setError('Failed to load demo data');
      console.error('Error loading demo data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setChunkingProgress(0);
    setTranscriptionProgress(0);
    setCurrentStage(null);
    setStatusMessage('');
    setSegments([]);
    
    const formData = new FormData();
    formData.append('audio', file);

    try {
      const response = await fetch('http://localhost:3001/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk and add it to our buffer
        buffer += decoder.decode(value, { stream: true });

        // Split on our delimiter, keeping incomplete chunks in the buffer
        const messages = buffer.split('\n---\n');
        buffer = messages.pop() || ''; // Keep the last incomplete chunk

        // Process all complete messages
        for (const message of messages) {
          const trimmedMessage = message.trim();
          if (!trimmedMessage) continue;

          try {
            const update = JSON.parse(trimmedMessage);
            console.log('Received update:', update.stage, update.phase, update.message);

            if (update.error) {
              setError(update.error);
              setIsLoading(false);
              return;
            }

            setStatusMessage(update.message || '');
            setCurrentStage(update.stage || null);
            
            if (typeof update.chunkingProgress === 'number') {
              setChunkingProgress(update.chunkingProgress);
            }
            if (typeof update.transcriptionProgress === 'number') {
              setTranscriptionProgress(update.transcriptionProgress);
            }

            if (update.status === 'complete' && update.segments) {
              console.log('Transcription complete, processing segments...');
              setSegments(update.segments);
              setIsLoading(false);
              const objectUrl = URL.createObjectURL(file);
              uploadedAudioUrl.current = objectUrl;
              setAudioUrl(objectUrl);
            }
          } catch (parseError) {
            console.error('Error parsing message:', parseError);
            console.log('Problematic message:', trimmedMessage);
          }
        }
      }

      // Process any remaining complete message in the buffer
      if (buffer.trim()) {
        try {
          const update = JSON.parse(buffer.trim());
          if (update.status === 'complete' && update.segments) {
            console.log('Processing final message...');
            setSegments(update.segments);
            setIsLoading(false);
            const objectUrl = URL.createObjectURL(file);
            uploadedAudioUrl.current = objectUrl;
            setAudioUrl(objectUrl);
          }
        } catch (parseError) {
          console.error('Error parsing final message:', parseError);
          console.log('Problematic final message:', buffer.trim());
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload and transcribe the file');
      setIsLoading(false);
    }
  };

  const handleSegmentClick = (startTime) => {
    setCurrentTime(startTime);
    const audioElement = document.querySelector('audio');
    if (audioElement) {
      audioElement.currentTime = startTime;
    }
  };

  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
  };

  const handleManualScroll = () => {
    console.log('App: Manual scroll detected - switching to exploring mode');
    setIsFollowing(false);
  };

  const enableFollowing = () => {
    console.log('App: Enabling following mode');
    setIsFollowing(true);
  };

  const handleSearchFocus = () => {
    if (searchTerm) {
      console.log('App: Search has text - switching to exploring mode');
      setIsFollowing(false);
    }
  };

  const handleSearchClear = () => {
    console.log('App: Search cleared - switching to following mode');
    setIsFollowing(true);
  };

  const returnToPlayback = () => {
    console.log('App: Return to playback clicked');
    setIsFollowing(true);
    
    // Find current segment
    const currentSegment = segments.find(
      segment => currentTime >= segment.startTime && currentTime < segment.endTime
    );
    
    if (currentSegment) {
      console.log('App: Scrolling to segment', {
        segmentStartTime: currentSegment.startTime
      });
      const element = document.getElementById(`segment-${currentSegment.startTime}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-12">
      <div className="container mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-4">Audio Transcription</h1>
          <label className="block">
            <span className="sr-only">Choose audio file</span>
            <input
              type="file"
              accept=".mp3,.m4a,.wav,.mp4"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer
              "
            />
          </label>
        </div>

        {isLoading && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Processing Audio</h2>
            <p className="text-gray-600 mb-4">{statusMessage}</p>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Chunking Progress</span>
                  <span className="text-sm font-medium text-gray-700">{Math.round(chunkingProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${chunkingProgress}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">Transcription Progress</span>
                  <span className="text-sm font-medium text-gray-700">{Math.round(transcriptionProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${transcriptionProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <SearchBar 
          onSearch={setSearchTerm} 
          onFocus={handleSearchFocus}
          onClear={handleSearchClear}
        />

        {(!isLoading || segments.length > 0) && (
          <div className="relative">
            <TranscriptionView
              segments={segments}
              currentTime={currentTime}
              onSegmentClick={handleSegmentClick}
              searchTerm={searchTerm}
              isFollowing={isFollowing}
              onManualScroll={handleManualScroll}
              onEnableFollowing={enableFollowing}
            />

            {!isFollowing && !searchTerm && (
              <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
                <button
                  onClick={returnToPlayback}
                  className="px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 flex items-center shadow-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                  Return to Playback
                </button>
              </div>
            )}
          </div>
        )}

        {audioUrl && <AudioPlayer audioUrl={audioUrl} onTimeUpdate={handleTimeUpdate} />}
      </div>
    </div>
  );
}

export default App;
