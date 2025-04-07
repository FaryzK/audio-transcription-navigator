# Audio Transcription Navigator

A web application for efficiently navigating and searching through audio transcriptions of patient consultations. Built with React, Node.js, and OpenAI's Whisper API.

## Features

- Audio playback with synchronized transcription highlighting
- Search functionality for transcription text
- Focus/Unfocus mode for automatic scrolling
- Support for M4A and MP4 audio files
- Demo mode with preloaded audio and transcription
- File upload for custom audio transcription

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- OpenAI API key

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd audio-transcription-navigator
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Configure environment variables:
   - Create a `.env` file in the backend directory
   - Add your OpenAI API key:
     ```
     OPENAI_API_KEY=your_api_key_here
     PORT=3001
     ```

4. Add your demo audio file:
   - Place your MP4 audio file in the `backend/public/demo` directory
   - Name it `demo-audio.mp4`

5. Start the development servers:
```bash
# Start backend server (from backend directory)
npm run dev

# Start frontend server (from frontend directory)
npm run dev
```

6. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
audio-transcription-navigator/
├── backend/
│   ├── public/
│   │   ├── demo/
│   │   │   ├── demo-audio.mp4
│   │   │   └── demo-transcription.json
│   │   └── uploads/
│   ├── server.js
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AudioPlayer.jsx
│   │   │   ├── TranscriptionView.jsx
│   │   │   └── SearchBar.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── vite.config.js
│   └── package.json
└── README.md
```

## API Proxy Configuration

The application uses Vite's proxy feature to forward API requests from the frontend to the backend:

- Frontend makes requests to `/api/*` endpoints
- Vite proxies these requests to the backend server
- The proxy removes the `/api` prefix before forwarding

This setup allows for:
- Relative paths in the frontend code
- Avoiding CORS issues during development
- Easier deployment to different environments

## Usage

1. The application starts in demo mode with a preloaded audio file and transcription
2. Use the audio controls to play/pause and seek through the audio
3. The transcription will automatically highlight and scroll to the current segment
4. Use the search bar to filter transcription segments
5. Toggle Focus/Unfocus mode to control automatic scrolling
6. Upload your own M4A or MP4 file for transcription using the Upload Audio button

## Technologies Used

- Frontend:
  - React
  - Tailwind CSS
  - Axios
  - Vite (with proxy configuration)
- Backend:
  - Node.js
  - Express
  - OpenAI Whisper API
  - Multer (file upload handling)

## License

MIT 
```
audio_transcription_navigator
├─ README.md
├─ backend
│  ├─ backend
│  │  └─ public
│  │     └─ uploads
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  ├─ demo
│  │  │  └─ demo-transcription.json
│  │  └─ uploads
│  └─ server.js
└─ frontend
   ├─ README.md
   ├─ backend
   │  └─ public
   │     └─ demo
   ├─ eslint.config.js
   ├─ index.html
   ├─ package-lock.json
   ├─ package.json
   ├─ postcss.config.js
   ├─ public
   ├─ src
   │  ├─ App.jsx
   │  ├─ assets
   │  ├─ components
   │  │  ├─ AudioPlayer.jsx
   │  │  ├─ SearchBar.jsx
   │  │  └─ TranscriptionView.jsx
   │  ├─ index.css
   │  └─ main.jsx
   ├─ tailwind.config.js
   └─ vite.config.js

```
```
audio_transcription_navigator
├─ README.md
├─ backend
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  ├─ demo
│  │  │  ├─ demo-audio.mp4
│  │  │  └─ demo-transcription.json
│  │  └─ uploads
│  ├─ server.js
│  └─ transcribe-demo.js
└─ frontend
   ├─ README.md
   ├─ eslint.config.js
   ├─ index.html
   ├─ package-lock.json
   ├─ package.json
   ├─ postcss.config.js
   ├─ public
   ├─ src
   │  ├─ App.jsx
   │  ├─ assets
   │  ├─ components
   │  │  ├─ AudioPlayer.jsx
   │  │  ├─ SearchBar.jsx
   │  │  └─ TranscriptionView.jsx
   │  ├─ index.css
   │  └─ main.jsx
   ├─ tailwind.config.js
   └─ vite.config.js

```
```
audio_transcription_navigator
├─ README.md
├─ backend
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  ├─ demo
│  │  │  ├─ demo-audio.mp4
│  │  │  └─ demo-transcription.json
│  │  └─ uploads
│  ├─ server.js
│  └─ transcribe-demo.js
└─ frontend
   ├─ README.md
   ├─ eslint.config.js
   ├─ index.html
   ├─ package-lock.json
   ├─ package.json
   ├─ postcss.config.js
   ├─ public
   ├─ src
   │  ├─ App.jsx
   │  ├─ assets
   │  ├─ components
   │  │  ├─ AudioPlayer.jsx
   │  │  ├─ SearchBar.jsx
   │  │  └─ TranscriptionView.jsx
   │  ├─ index.css
   │  └─ main.jsx
   ├─ tailwind.config.js
   └─ vite.config.js

```
```
audio_transcription_navigator
├─ README.md
├─ backend
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ public
│  │  ├─ demo
│  │  │  ├─ demo-audio.mp4
│  │  │  └─ demo-transcription.json
│  │  └─ uploads
│  ├─ server.js
│  └─ transcribe-demo.js
└─ frontend
   ├─ README.md
   ├─ eslint.config.js
   ├─ index.html
   ├─ package-lock.json
   ├─ package.json
   ├─ postcss.config.js
   ├─ public
   ├─ src
   │  ├─ App.jsx
   │  ├─ assets
   │  ├─ components
   │  │  ├─ AudioPlayer.jsx
   │  │  ├─ SearchBar.jsx
   │  │  └─ TranscriptionView.jsx
   │  ├─ index.css
   │  └─ main.jsx
   ├─ tailwind.config.js
   └─ vite.config.js

```