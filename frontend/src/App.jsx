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
  const [isFocused, setIsFocused] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);

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
  };

  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
  };

  const toggleFocus = () => {
    setIsFocused(!isFocused);
  };

  const handleRefocus = () => {
    setIsFocused(true);
    // Find the current segment and scroll to it
    const currentSegment = segments.find(
      segment => currentTime >= segment.startTime && currentTime < segment.endTime
    );
    if (currentSegment) {
      const element = document.getElementById(`segment-${currentSegment.startTime}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
            <button
              onClick={toggleFocus}
              className={`px-4 py-2 rounded ${
                isFocused ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              {isFocused ? 'Focused' : 'Unfocused'}
            </button>
            {!isFocused && (
              <button
                onClick={handleRefocus}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Re-focus
              </button>
            )}
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

        <SearchBar onSearch={setSearchTerm} />

        <TranscriptionView
          segments={segments}
          currentTime={currentTime}
          onSegmentClick={handleSegmentClick}
          searchTerm={searchTerm}
          isFocused={isFocused}
        />

        <AudioPlayer
          audioUrl={audioUrl}
          onTimeUpdate={handleTimeUpdate}
        />
      </div>
    </div>
  );
}

export default App;
