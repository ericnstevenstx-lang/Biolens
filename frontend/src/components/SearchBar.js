import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";

const PLACEHOLDERS = [
  "polyester hoodie",
  "plastic cutting board",
  "bamboo rayon dress",
  "nylon rope",
  "microfiber blanket",
  "wool sweater",
  "glass bottle",
  "hemp shirt",
];

export default function SearchBar({ size = "large", initialQuery = "", autoFocus = false }) {
  const [query, setQuery] = useState(initialQuery);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/results?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const isLarge = size === "large";

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="search-form"
      className={`search-glow relative w-full transition-shadow duration-300 ${isLarge ? 'max-w-2xl' : 'max-w-xl'}`}
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
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={`Try "${PLACEHOLDERS[placeholderIdx]}"`}
          className={`w-full bg-white/80 backdrop-blur-md border focus:outline-none ${isLarge ? 'h-16 pl-14 pr-16 text-lg rounded-2xl' : 'h-12 pl-12 pr-14 text-sm rounded-xl'}`}
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
  );
}
