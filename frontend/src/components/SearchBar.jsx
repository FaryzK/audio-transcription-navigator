import { useState, useEffect, useRef } from 'react';

const SearchBar = ({ onSearch, onFocus, onClear }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const inputRef = useRef(null);

  // Focus the search input when pressing Ctrl+F or Cmd+F
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value);
    // Only trigger onFocus when text is being entered
    if (value && onFocus) {
      onFocus();
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    onSearch('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className="search-bar">
      <div className="max-w-3xl mx-auto">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search transcription... (Ctrl+F or Cmd+F)"
            className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
        {searchTerm && (
          <div className="mt-1 text-sm text-gray-500">
            Press Enter to find next match
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBar; 