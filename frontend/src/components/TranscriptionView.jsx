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
  const scrollTimeout = useRef(null);
  const isUserScrolling = useRef(false);

  // Add scroll event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      console.log('Scroll detected', {
        isAutoScrolling: isAutoScrolling.current,
        isUserScrolling: isUserScrolling.current
      });

      // Clear existing timeout
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }

      // Reset auto-scrolling flag after scroll ends
      scrollTimeout.current = setTimeout(() => {
        console.log('Scroll timeout completed - resetting flags');
        isAutoScrolling.current = false;
        isUserScrolling.current = false;
      }, 150);
    };

    // Detect when user starts scrolling via wheel
    const handleWheel = () => {
      console.log('Wheel event detected');
      // Immediately stop auto-scrolling and switch to manual mode
      isAutoScrolling.current = false;
      isUserScrolling.current = true;
      onManualScroll?.();
    };

    // Detect when user starts scrolling via touch
    const handleTouchStart = () => {
      console.log('Touch start detected');
      // Immediately stop auto-scrolling and switch to manual mode
      isAutoScrolling.current = false;
      isUserScrolling.current = true;
      onManualScroll?.();
    };

    container.addEventListener('scroll', handleScroll);
    container.addEventListener('wheel', handleWheel, { passive: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('touchstart', handleTouchStart);
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
        
        // Only auto-scroll if following is enabled, no search term, and no user scrolling
        if (isFollowing && !searchTerm && !isUserScrolling.current) {
          console.log('Auto-scrolling to segment', {
            segmentStartTime: currentSegment.startTime,
            currentTime,
            isAutoScrolling: isAutoScrolling.current,
            isUserScrolling: isUserScrolling.current
          });
          isAutoScrolling.current = true;
          const element = document.getElementById(`segment-${currentSegment.startTime}`);
          if (element && containerRef.current) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        } else {
          console.log('Skipping auto-scroll', {
            isFollowing,
            hasSearchTerm: !!searchTerm,
            isUserScrolling: isUserScrolling.current
          });
        }
      }
    }
  }, [currentTime, segments, activeSegment, activeWord, isFollowing, searchTerm]);

  // Handler for manual segment clicks
  const handleSegmentClick = (segment) => {
    console.log('Segment clicked', {
      segmentStartTime: segment.startTime,
      isAutoScrolling: isAutoScrolling.current
    });

    setActiveSegment(segment);
    onSegmentClick(segment.startTime);
    onEnableFollowing(); // Re-enable following mode

    // Ensure clicked segment is visible
    const element = document.getElementById(`segment-${segment.startTime}`);
    if (element && containerRef.current) {
      isAutoScrolling.current = true; // Prevent this scroll from triggering manual mode
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
      <div className="mt-1 text-gray-800 leading-relaxed">
        {segment.words.map((word, index) => (
          <span
            key={`${word.start}-${index}`}
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
              onEnableFollowing(); // Re-enable following mode
              
              // Ensure the segment containing this word is visible
              const element = document.getElementById(`segment-${segment.startTime}`);
              if (element && containerRef.current) {
                isAutoScrolling.current = true; // Prevent this scroll from triggering manual mode
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
          >
            {word.text}
          </span>
        ))}
      </div>
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