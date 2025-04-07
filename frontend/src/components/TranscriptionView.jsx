import { useState, useEffect, useRef } from 'react';

const TranscriptionView = ({ 
  segments, 
  currentTime, 
  onSegmentClick, 
  searchTerm,
  isFocused 
}) => {
  const [activeSegment, setActiveSegment] = useState(null);
  const [activeWord, setActiveWord] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isFocused) return;

    const currentSegment = segments.find(
      segment => currentTime >= segment.startTime && currentTime < segment.endTime
    );

    if (currentSegment) {
      // Find the current word within the segment
      const currentWord = currentSegment.words?.find(
        word => currentTime >= word.start && currentTime < word.end
      );

      if (currentSegment !== activeSegment || currentWord !== activeWord) {
        setActiveSegment(currentSegment);
        setActiveWord(currentWord);
        
        // Scroll the active segment into view
        const element = document.getElementById(`segment-${currentSegment.startTime}`);
        if (element && containerRef.current) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  }, [currentTime, segments, isFocused, activeSegment, activeWord]);

  const filteredSegments = searchTerm
    ? segments.filter(segment => 
        segment.text.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : segments;

  const renderWords = (segment) => {
    if (!segment.words) {
      return segment.text;
    }

    return (
      <div className="mt-1 text-gray-800 leading-relaxed">
        {segment.words.map((word, index) => (
          <span
            key={`${word.start}-${index}`}
            className={`word-segment ${
              activeWord === word ? 'bg-yellow-300 font-bold' : ''
            } px-0.5 rounded cursor-pointer hover:bg-yellow-100`}
            onClick={(e) => {
              e.stopPropagation();
              onSegmentClick(word.start);
            }}
          >
            {word.text}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="transcription-container">
      {filteredSegments.length === 0 ? (
        <div className="text-center p-8 text-gray-500">
          No matching segments found. Try a different search term.
        </div>
      ) : (
        filteredSegments.map((segment) => (
          <div
            key={segment.startTime}
            id={`segment-${segment.startTime}`}
            className={`transcription-segment p-3 mb-2 rounded-lg transition-all duration-200 ${
              activeSegment === segment ? 'bg-blue-50 border-l-4 border-blue-500 shadow-sm' : 'border-l-4 border-transparent'
            }`}
            onClick={() => onSegmentClick(segment.startTime)}
          >
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500">
                {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
              </div>
              {searchTerm && (
                <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Match
                </div>
              )}
            </div>
            {renderWords(segment)}
          </div>
        ))
      )}
    </div>
  );
};

const formatTime = (time) => {
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default TranscriptionView; 