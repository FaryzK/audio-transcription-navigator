import { useState, useEffect, useRef } from 'react';

const TranscriptionView = ({ 
  segments, 
  currentTime, 
  onSegmentClick, 
  searchTerm,
  isFollowing,
  onManualScroll,
  isAutoScrolling,
  onEnableFollowing
}) => {
  const [activeSegment, setActiveSegment] = useState(null);
  const [activeWord, setActiveWord] = useState(null);
  const containerRef = useRef(null);

  // Add wheel event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Detect when user starts scrolling via wheel or touch
    const handleUserInteraction = () => {
      console.log('User interaction detected - switching to exploring mode');
      onManualScroll?.();
    };

    container.addEventListener('wheel', handleUserInteraction, { passive: true });
    container.addEventListener('touchstart', handleUserInteraction, { passive: true });

    return () => {
      container.removeEventListener('wheel', handleUserInteraction);
      container.removeEventListener('touchstart', handleUserInteraction);
    };
  }, [onManualScroll]);

  // Effect for handling playback-based updates
  useEffect(() => {
    const currentSegment = segments.find(
      segment => currentTime >= segment.startTime && currentTime < segment.endTime
    );

    if (currentSegment) {
      const currentWord = currentSegment.words?.find(
        word => currentTime >= word.start && currentTime < word.end
      );

      if (currentSegment !== activeSegment || currentWord !== activeWord) {
        setActiveSegment(currentSegment);
        setActiveWord(currentWord);
        
        // Only auto-scroll if following is enabled and no search term
        if (isFollowing && !searchTerm) {
          console.log('Auto-scrolling to segment', {
            segmentStartTime: currentSegment.startTime,
            currentTime
          });
          const element = document.getElementById(`segment-${currentSegment.startTime}`);
          if (element && containerRef.current) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }
    }
  }, [currentTime, segments, activeSegment, activeWord, isFollowing, searchTerm]);

  // Handler for manual segment clicks
  const handleSegmentClick = (segment) => {
    console.log('Segment clicked', {
      segmentStartTime: segment.startTime
    });

    setActiveSegment(segment);
    onSegmentClick(segment.startTime);
    onEnableFollowing(); // Re-enable following mode

    // Ensure clicked segment is visible
    const element = document.getElementById(`segment-${segment.startTime}`);
    if (element && containerRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

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
      <>
        {/* Original text (Chinese or English) with word-level highlighting */}
        <div className={`${segment.isChineseAudio ? 'text-lg mb-1' : 'text-base'}`}>
          {segment.words.map((word, index) => (
            <span
              key={`${segment.startTime}-${word.start}-${index}`}
              className={`word-segment ${
                activeWord === word ? 'bg-yellow-300 text-yellow-900' : ''
              } px-0.5 mx-0.5 rounded cursor-pointer transition-colors duration-100 hover:bg-yellow-100`}
              onClick={(e) => {
                e.stopPropagation();
                console.log('Word clicked', {
                  wordStart: word.start,
                  segmentStartTime: segment.startTime,
                  isAutoScrolling: isAutoScrolling.current
                });

                onSegmentClick(word.start);
                onEnableFollowing();
                
                const element = document.getElementById(`segment-${segment.startTime}`);
                if (element && containerRef.current) {
                  isAutoScrolling.current = true;
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
            >
              {word.text}
            </span>
          ))}
        </div>
        {/* English translation (only for Chinese audio) */}
        {segment.isChineseAudio && segment.translation && (
          <div className="text-gray-600 text-base italic mt-1">
            {segment.translation}
          </div>
        )}
      </>
    );
  };

  return (
    <div 
      ref={containerRef} 
      className="transcription-container"
    >
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
            onClick={() => handleSegmentClick(segment)}
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
            <div className="mt-2">
              {renderWords(segment)}
            </div>
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