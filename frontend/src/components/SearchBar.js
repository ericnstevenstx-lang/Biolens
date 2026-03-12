import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
  const [dropdownPos, setDropdownPos] = useState(null);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const wrapperRef = useRef(null);
  const formRef = useRef(null);
  const debounceRef = useRef(null);

  // Placeholder cycling
  useEffect(() => {
    if (isFocused) return;
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isFocused]);

  // Autofocus
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  // Recalculate dropdown position on scroll
  useEffect(() => {
    if (!showSuggestions) return;
    const updatePos = () => {
      if (formRef.current) {
        const rect = formRef.current.getBoundingClientRect();
        setDropdownPos({ top: rect.bottom + 8, left: rect.left, width: rect.width });
      }
    };
    window.addEventListener('scroll', updatePos, { passive: true });
    window.addEventListener('resize', updatePos, { passive: true });
    return () => {
      window.removeEventListener('scroll', updatePos);
      window.removeEventListener('resize', updatePos);
    };
  }, [showSuggestions]);

  // Click outside to close
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

  // Autocomplete fetcher
  const fetchSuggestions = useCallback(async (text) => {
    if (text.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const term = `%${text.toLowerCase()}%`;

      // Query materials and aliases in parallel
      const [matRes, aliasRes] = await Promise.all([
        supabase
          .from("materials")
          .select("material_name")
          .ilike("material_name", term)
          .limit(4),
        supabase
          .from("material_aliases")
          .select("alias")
          .ilike("alias", term)
          .limit(4),
      ]);

      const results = [];
      const seen = new Set();

      // Materials first
      if (matRes.data) {
        for (const row of matRes.data) {
          const label = row.material_name;
          if (!seen.has(label.toLowerCase())) {
            seen.add(label.toLowerCase());
            results.push({ label, type: "material" });
          }
        }
      }

      // Then aliases
      if (aliasRes.data) {
        for (const row of aliasRes.data) {
          const label = row.alias;
          if (!seen.has(label.toLowerCase())) {
            seen.add(label.toLowerCase());
            results.push({ label, type: "alias" });
          }
        }
      }

      setSuggestions(results.slice(0, 6));
      if (results.length > 0) {
        // Compute fixed position from form element
        if (formRef.current) {
          const rect = formRef.current.getBoundingClientRect();
          setDropdownPos({
            top: rect.bottom + 8,
            left: rect.left,
            width: rect.width,
          });
        }
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
      setActiveIdx(-1);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  // Debounced input handler
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

  const handleSelectSuggestion = (label) => {
    setQuery(label);
    setShowSuggestions(false);
    navigate(`/results?q=${encodeURIComponent(label)}`);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => (prev + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[activeIdx].label);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setActiveIdx(-1);
    }
  };

  const isLarge = size === "large";

  return (
    <div ref={wrapperRef} className={`relative w-full ${isLarge ? 'max-w-2xl' : 'max-w-xl'}`} style={{ zIndex: showSuggestions ? 60 : 'auto' }}>
      <form
        ref={formRef}
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
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              // Delay hiding suggestions so onMouseDown on dropdown fires first
              setTimeout(() => setShowSuggestions(false), 150);
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Try "${PLACEHOLDERS[placeholderIdx]}"`}
            autoComplete="off"
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

      {/* Autocomplete dropdown - fixed position to escape stacking context */}
      {showSuggestions && suggestions.length > 0 && dropdownPos && (
        <div
          data-testid="autocomplete-dropdown"
          className="bg-white rounded-xl border shadow-lg overflow-hidden"
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 9999,
            borderColor: '#E5E5E5',
          }}
        >
          {suggestions.map((s, idx) => (
            <button
              key={`${s.label}-${idx}`}
              data-testid={`suggestion-${idx}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectSuggestion(s.label);
              }}
              onMouseEnter={() => setActiveIdx(idx)}
              className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors duration-100"
              style={{
                fontFamily: "'Inter', sans-serif",
                backgroundColor: activeIdx === idx ? 'rgba(180, 83, 9, 0.04)' : 'transparent',
              }}
            >
              <Search className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#86868B' }} />
              <span
                className="text-sm"
                style={{ color: '#1D1D1F' }}
              >
                {s.label}
              </span>
              <span
                className="text-[0.65rem] ml-auto px-2 py-0.5 rounded-full"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  backgroundColor: s.type === 'material' ? 'rgba(180, 83, 9, 0.08)' : 'rgba(29, 29, 31, 0.05)',
                  color: s.type === 'material' ? '#B45309' : '#86868B',
                }}
              >
                {s.type}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
