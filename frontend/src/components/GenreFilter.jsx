import React, { useState, useRef, useEffect } from 'react';
import { Tag, Filter, Check, X } from 'lucide-react';
import { DEFAULT_GENRES } from '../constants/genres';

export default function GenreFilter({ genres = [], selectedGenre, onSelectGenre }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Use provided genres or full catalog fallback if empty
  const availableList = (genres && genres.length > 0) ? genres : DEFAULT_GENRES;

  // Normalized search query (handles spaces, hyphens, ampersands e.g. "hip hop" -> "hip-hop")
  const cleanQuery = searchQuery.trim().toLowerCase();
  const normalizedQuery = cleanQuery.replace(/[\s\-_&]+/g, '');

  const filteredGenres = availableList.filter((g) => {
    if (!cleanQuery) return true;
    const name = String(g).toLowerCase();
    const normalizedName = name.replace(/[\s\-_&]+/g, '');
    return name.includes(cleanQuery) || normalizedName.includes(normalizedQuery);
  });

  return (
    <div
      ref={containerRef}
      className={`glass-card genre-filter-container ${isOpen ? 'is-open' : ''}`}
    >
      <div className="section-header">
        <div className="section-title-wrap">
          <Tag className="icon-accent" size={20} />
          <h3 className="section-title">3. Filter by Genre (Optional)</h3>
        </div>
        {selectedGenre && (
          <button
            type="button"
            className="btn-text-icon"
            onClick={() => onSelectGenre('')}
            title="Clear genre filter"
          >
            <X size={14} />
            Clear Filter
          </button>
        )}
      </div>

      <p className="section-subtitle">
        Constrain recommendations to a specific genre style, or leave empty for broad cross-genre discovery.
      </p>

      <div className="genre-select-wrapper">
        <button
          type="button"
          id="genre-dropdown-trigger"
          className="genre-dropdown-btn"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex-center-gap">
            <Filter size={16} className="text-muted" />
            <span className={selectedGenre ? 'text-primary font-medium' : 'text-muted'}>
              {selectedGenre ? `Genre: ${selectedGenre}` : 'All Genres (Explore Catalog)'}
            </span>
          </div>
          <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
        </button>

        {isOpen && (
          <div className="genre-dropdown-menu">
            <div className="genre-search-box">
              <input
                type="text"
                placeholder="Search genres (e.g. pop, rock, indie, electronic)..."
                className="genre-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button
                  type="button"
                  className="genre-clear-search-btn"
                  onClick={() => setSearchQuery('')}
                  title="Clear search query"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="genre-options-list">
              <div
                className={`genre-option ${!selectedGenre ? 'active' : ''}`}
                onClick={() => {
                  onSelectGenre('');
                  setIsOpen(false);
                }}
              >
                <span>All Genres (Unrestricted)</span>
                {!selectedGenre && <Check size={16} className="text-accent" />}
              </div>

              {filteredGenres.map((g) => {
                const isSelected = selectedGenre?.toLowerCase() === g.toLowerCase();
                return (
                  <div
                    key={g}
                    className={`genre-option ${isSelected ? 'active' : ''}`}
                    onClick={() => {
                      onSelectGenre(g);
                      setIsOpen(false);
                    }}
                  >
                    <span>{g}</span>
                    {isSelected && <Check size={16} className="text-accent" />}
                  </div>
                );
              })}

              {filteredGenres.length === 0 && (
                <div className="genre-empty">
                  <span>No matching genres found</span>
                  {searchQuery && (
                    <button
                      type="button"
                      className="btn-text-clear"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear search
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
