import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { fetchAutocomplete } from "../lib/biolens";

const PLACEHOLDERS = [
  "poly hoodie",
  "bamboo sheets",
  "pet bottle",
  "vegan leather bag",
  "plastic cutting board",
  "nylon rope",
  "wool sweater",
  "hemp shirt",
];

export default function SearchBar({ size = "large", initialQuery = "", autoFocus = false }) {
  const [query, setQuery] = useState(initialQuery);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (isFocused) return;
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isFocused]);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (text) => {
    if (!text || text.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const results = await fetchAutocomplete(text, 6);
      const validResults = Array.isArray(results) ? results : [];
      setSuggestions(validResults);
      setShowSuggestions(validResults.length > 0);
      setActiveIdx(-1);
    } catch (error) {
      console.error("Autocomplete error:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val.trim());
    }, 200);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (query.trim()) {
      navigate(`/results?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    const term = suggestion?.label || suggestion || "";
    setQuery(term);
    setShowSuggestions(false);
    if (term) {
      navigate(`/results?q=${encodeURIComponent(term)}`);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || !Array.isArray(suggestions) || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === "Enter" && activeIdx >= 0 && suggestions[activeIdx]) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIdx(-1);
    }
  };

  const isLarge = size === "large";

  return (
    <div 
      ref={wrapperRef} 
      className={`relative w-full ${isLarge ? 'max-w-2xl' : 'max-w-xl'}`}
      style={{ zIndex: showSuggestions ? 100 : 10 }}
    >
      <form
        onSubmit={handleSubmit}
        data-testid="search-form"
        className="search-glow relative w-full transition-shadow duration-300"
        style={{ borderRadius: '16px' }}
      >
        <div className="relative">
          <Search
            className={`absolute left-5 top-1/2 -translate-y-1/2 ${isLarge ? 'w-5 h-5' : 'w-4 h-4'}`}
            style={{ color: '#86868B' }}
          />
          <input
            ref={inputRef}
            data-testid="search-input"
            type="text"
            value={query}
            onChange={handleChange}
            onFocus={() => {
              setIsFocused(true);
              if (Array.isArray(suggestions) && suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => {
              setIsFocused(false);
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Try "${PLACEHOLDERS[placeholderIdx]}"`}
            autoComplete="off"
            className={`w-full bg-white border focus:outline-none ${isLarge ? 'h-16 pl-14 pr-16 text-lg rounded-2xl' : 'h-12 pl-12 pr-14 text-sm rounded-xl'}`}
            style={{
              fontFamily: "'Inter', sans-serif",
              color: '#1D1D1F',
              borderColor: isFocused ? '#B45309' : '#E5E5E5',
              boxShadow: isFocused ? '0 0 0 2px rgba(180, 83, 9, 0.1)' : '0 1px 3px rgba(0,0,0,0.04)',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
          />
          <button
            type="submit"
            data-testid="search-submit-button"
            className={`absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-xl transition-colors duration-200 ${isLarge ? 'w-10 h-10' : 'w-8 h-8'}`}
            style={{
              backgroundColor: query.trim() ? '#1D1D1F' : '#E5E5E5',
              color: query.trim() ? 'white' : '#86868B',
            }}
          >
            <ArrowRight className={isLarge ? 'w-5 h-5' : 'w-4 h-4'} />
          </button>
        </div>
      </form>

      {showSuggestions && Array.isArray(suggestions) && suggestions.length > 0 && (
        <div
          data-testid="autocomplete-dropdown"
          className="absolute top-full left-0 right-0 mt-2 rounded-xl border shadow-2xl overflow-hidden"
          style={{ 
            backgroundColor: '#FFFFFF',
            borderColor: '#E5E5E5',
            zIndex: 101,
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          {suggestions.map((s, idx) => {
            if (!s || typeof s !== 'object') return null;
            
            const safeScore = typeof s.petroloadScore === 'number' ? s.petroloadScore : null;
            const impactColor = safeScore >= 0.8 ? '#EF4444' : 
                               safeScore >= 0.5 ? '#F59E0B' : 
                               safeScore !== null ? '#10B981' : null;
            
            return (
              <button
                key={`${s.label || 'item'}-${idx}`}
                data-testid={`suggestion-${idx}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectSuggestion(s);
                }}
                onMouseEnter={() => setActiveIdx(idx)}
                className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors duration-100 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  backgroundColor: activeIdx === idx ? 'rgba(180, 83, 9, 0.04)' : 'transparent',
                }}
              >
                <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#86868B' }} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: '#1D1D1F' }}>
                      {s.label || 'Unknown Material'}
                    </span>
                    
                    {impactColor && (
                      <span 
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        title={`Environmental Impact: ${Math.round(safeScore * 100)}%`}
                        style={{ backgroundColor: impactColor }}
                      />
                    )}
                  </div>
                  
                  {s.materialFamily && (
                    <span className="text-xs text-gray-500 mt-1 block">
                      {s.materialFamily}
                    </span>
                  )}
                </div>

                {typeof s.alternativesCount === 'number' && s.alternativesCount > 0 && (
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium flex-shrink-0"
                    style={{
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      color: '#10B981',
                    }}
                  >
                    {s.alternativesCount} alt
                  </span>
                )}

                <span
                  className="text-xs px-2 py-1 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: s.type === 'material' ? 'rgba(180, 83, 9, 0.08)' : 'rgba(29, 29, 31, 0.05)',
                    color: s.type === 'material' ? '#B45309' : '#86868B',
                  }}
                >
                  {s.type || 'item'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
