# Audio Transcription Navigator

A modern web application for navigating audio transcriptions with synchronized playback and interactive features.

## Features

### Audio Playback
- Synchronized audio player with progress bar
- Play/pause controls
- Time display and seeking functionality
- Support for .m4a and .mp4 audio files

### Transcription View
- Word-by-word highlighting synchronized with audio playback
- Interactive segments with timestamps
- Click on any word or segment to jump to that point in the audio
- Smooth auto-scrolling follows the current playback position

### Navigation Modes
1. **Following Mode (Default)**
   - Automatically scrolls to keep the current segment in view
   - Active segment and words are highlighted during playback
   - Maintains focus on the current playback position

2. **Exploring Mode**
   - Activated when:
     - User scrolls manually (mousewheel/touch)
     - User enters text in the search bar
   - Allows free navigation without auto-scrolling
   - "Return to Playback" button appears to re-enable following mode

### Search Functionality
- Real-time search through transcription text
- Keyboard shortcut (Ctrl+F / Cmd+F) to focus search bar
- Clear search button
- Highlights matching segments
- Auto-returns to following mode when search is cleared

### User Interface
- Clean, modern design with responsive layout
- Clear visual indicators for active segments and words
- Smooth animations for scrolling and transitions
- Upload button for adding new audio files

## Usage

1. **Basic Playback**
   - Use the play/pause button to control audio
   - Click anywhere on the progress bar to seek
   - Watch as words highlight in sync with the audio

2. **Navigation**
   - Click any word or segment to jump to that point
   - Scroll freely to explore the transcription
   - Use the "Return to Playback" button to resume auto-following

3. **Search**
   - Press Ctrl+F / Cmd+F to focus the search bar
   - Type to filter segments in real-time
   - Clear the search to return to full transcription

4. **Upload Audio**
   - Click "Upload Audio" to add your own file
   - Supported formats: .m4a, .mp4
   - Wait for transcription to complete

## Technical Details

- Built with React
- Real-time synchronization between audio and transcription
- Efficient scroll management for smooth performance
- Responsive design for various screen sizes

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## API Endpoints

- `GET /api/demo-data`: Fetches demo audio and transcription
- `POST /api/transcribe`: Uploads and transcribes new audio files 