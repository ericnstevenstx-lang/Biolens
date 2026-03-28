"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

interface Suggestion { label: string; materialFamily: string | null; petroloadScore: number | null; alternativesCount: number; }

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [inputType, setInputType] = useState<"search" | "barcode" | "amazon" | "url">("search");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (inputType !== "search" || query.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(query.trim())}`);
        const data: Suggestion[] = await res.json();
        setSuggestions(data);
        setShowDropdown(data.length > 0);
        setActiveIndex(-1);
      } catch { setSuggestions([]); setShowDropdown(false); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, inputType]);

  function navigate(q: string) {
    setShowDropdown(false);
    setLoading(true);
    const encoded = encodeURIComponent(q);
    router.push(`/results/${encoded}?type=${inputType}&q=${encoded}`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    navigate(q);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    else if (e.key === "Enter" && activeIndex >= 0) { e.preventDefault(); const s = suggestions[activeIndex]; setQuery(s.label); navigate(s.label); }
    else if (e.key === "Escape") { setShowDropdown(false); }
  }

  const placeholders: Record<string, string> = {
    search: "Search a product or material — e.g. Tide Pods, polyester, bamboo",
    barcode: "Enter a barcode number",
    amazon: "Paste an Amazon product URL",
    url: "Paste any product page URL",
  };

  return (
    <main className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col">
      <Nav />

      {/* HERO */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-2xl w-full space-y-8">
          <img src="/assets/1024x1024.png" alt="BioLens" width={120} height={120} className="mx-auto rounded-2xl" style={{filter:"drop-shadow(0 0 30px rgba(6,182,212,0.25))"}}/>
          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight" style={{fontFamily:"var(--font-manrope)"}}>
              What is this product<br/>
              <span className="text-cyan-400">really made of?</span>
            </h1>
            <p className="text-slate-400 text-lg">
              BioLens analyzes any product across five intelligence layers — materials, health, origin, lifecycle, and alternatives.
            </p>
          </div>

          {/* INPUT TYPE TABS */}
          <div className="flex justify-center gap-1">
            {(["search", "barcode", "amazon", "url"] as const).map(t => (
              <button
                key={t}
                onClick={() => setInputType(t)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  inputType === t
                    ? "bg-cyan-400 text-[#070b12]"
                    : "text-slate-400 hover:text-white border border-[#1e3a5f] hover:border-slate-500"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* SEARCH FORM */}
          <div className="relative" ref={dropdownRef}>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder={placeholders[inputType]}
                className="flex-1 bg-[#0c1829] border border-[#1e3a5f] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition-colors"
                autoFocus
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="px-5 py-3 bg-cyan-400 text-[#070b12] rounded-xl text-sm font-bold hover:bg-cyan-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                style={{fontFamily:"var(--font-manrope)"}}
              >
                {loading ? "..." : "Analyze"}
              </button>
            </form>

            {/* Autocomplete dropdown */}
            {showDropdown && suggestions.length > 0 && (
              <div className="absolute left-0 right-14 top-full mt-1 bg-[#0c1829] border border-[#1e3a5f] rounded-xl overflow-hidden shadow-xl shadow-black/40 z-50">
                {suggestions.map((s, i) => {
                  const scoreColor = s.petroloadScore === null ? "#475569" : s.petroloadScore > 70 ? "#ef4444" : s.petroloadScore > 40 ? "#f59e0b" : "#10b981";
                  return (
                    <button
                      key={s.label}
                      onMouseDown={() => { setQuery(s.label); navigate(s.label); }}
                      className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                        i === activeIndex ? "bg-cyan-400/10" : "hover:bg-white/5"
                      } ${i > 0 ? "border-t border-[#1a2d48]" : ""}`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-white">{s.label}</span>
                        {s.materialFamily && <span className="ml-2 text-xs text-slate-500">{s.materialFamily}</span>}
                      </div>
                      {s.petroloadScore !== null && (
                        <span className="text-xs font-bold flex-shrink-0" style={{color: scoreColor}}>{s.petroloadScore}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* EXAMPLE SEARCHES */}
          <div className="space-y-2">
            <p className="text-xs text-slate-600 uppercase tracking-wider">Try an example</p>
            <div className="flex flex-wrap justify-center gap-2">
              {["Tide Pods", "polyester fleece", "PET water bottle", "hemp t-shirt", "HDPE plastic"].map(ex => (
                <button
                  key={ex}
                  onClick={() => { setQuery(ex); setInputType("search"); }}
                  className="text-xs text-slate-400 hover:text-cyan-400 border border-[#1e3a5f] hover:border-cyan-400/30 px-3 py-1.5 rounded-lg transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          {/* INTELLIGENCE LAYERS */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-4 border-t border-[#1e3a5f]">
            {[
              { label: "Materials", icon: "⬡" },
              { label: "Health", icon: "⚕" },
              { label: "Origin", icon: "◎" },
              { label: "Lifecycle", icon: "↺" },
              { label: "Alternatives", icon: "→" },
            ].map(l => (
              <div key={l.label} className="p-3 bg-[#0c1829] border border-[#1e3a5f] rounded-xl text-center">
                <p className="text-lg mb-1">{l.icon}</p>
                <p className="text-xs text-slate-500 font-semibold">{l.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
// deployed 1774674681
// v2
