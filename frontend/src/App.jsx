import { useState, useEffect } from 'react';
import axios from 'axios';
import AudioPlayer from './components/AudioPlayer';
import TranscriptionView from './components/TranscriptionView';
import SearchBar from './components/SearchBar';

// Use relative paths instead of hardcoded URLs
const API_BASE_URL = '/api';

function App() {
  const [audioUrl, setAudioUrl] = useState('');
  const [segments, setSegments] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isFollowing, setIsFollowing] = useState(true);

  useEffect(() => {
    loadDemoData();
  }, []);

  const loadDemoData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_BASE_URL}/demo-data`);
      
      // Log the audio URL for debugging
      console.log('Demo audio URL:', response.data.audioUrl);
      
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

    try {
      setIsTranscribing(true);
      setError(null);
      const formData = new FormData();
      formData.append('audio', file);

      const response = await axios.post(`${API_BASE_URL}/transcribe`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Create a temporary URL for the uploaded file
      const fileUrl = URL.createObjectURL(file);
      setAudioUrl(fileUrl);
      setSegments(response.data.segments);
    } catch (err) {
      setError('Failed to transcribe audio. Please try again with a smaller file or different format.');
      console.error('Error transcribing audio:', err);
    } finally {
      setIsTranscribing(false);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <button 
          onClick={loadDemoData}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Return to Demo
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center p-4">
          <h1 className="text-2xl font-bold">Audio Transcription Navigator</h1>
          <div className="flex items-center space-x-4">
            <label className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              Upload Audio
              <input
                type="file"
                accept=".m4a,.mp4"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {isTranscribing && (
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-2"></div>
            <span>Transcribing audio...</span>
          </div>
        )}

        <SearchBar 
          onSearch={setSearchTerm} 
          onFocus={handleSearchFocus}
          onClear={handleSearchClear}
        />

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

        <AudioPlayer
          audioUrl={audioUrl}
          onTimeUpdate={handleTimeUpdate}
        />
      </div>
    </div>
  );
}

export default App;
