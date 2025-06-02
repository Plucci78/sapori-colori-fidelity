import { useState, useEffect, useRef } from 'react';

const SearchBar = ({ 
  searchTerm, 
  onSearchChange, 
  onClose, 
  onFocus, 
  placeholder = 'Cerca...' 
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, []);

  return (
    <div className="search-input-container">
      <input
        ref={inputRef}
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        onFocus={onFocus}
        placeholder={placeholder}
        className="search-input"
      />
      <button 
        className="close-search" 
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );
};

export default SearchBar;
