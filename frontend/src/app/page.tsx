"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";

type InputMode = "search" | "link" | "barcode";

const SUGGESTIONS = [
  "polyester fleece jacket","bamboo bed sheets","plastic water bottle","cotton t-shirt",
  "nylon rope","hemp hoodie","viscose rayon dress","recycled polyester bag",
  "microfiber cleaning cloth","acrylic sweater","polypropylene container",
  "organic cotton socks","spandex leggings","neoprene wetsuit","fiberglass insulation",
  "PET plastic bottle","styrofoam cup","latex gloves","wool blanket","linen shirt",
];

function detectMode(v: string): InputMode {
  if (/^\d{8,14}$/.test(v.trim())) return "barcode";
  try { const u = new URL(v.trim().startsWith("http") ? v.trim() : "https://" + v.trim()); if (u.hostname.includes(".")) return "link"; } catch {}
  return "search";
}
function detectInputType(v: string) {
  if (/^\d{8,14}$/.test(v.trim())) return "barcode";
  try { const u = new URL(v.trim().startsWith("http") ? v.trim() : "https://" + v.trim()); if (u.hostname.includes("amazon")) return "amazon"; if (u.hostname.includes(".")) return "url"; } catch {}
  return "search";
}
const PLACEHOLDERS: Record<InputMode, string> = {
  search: "Search product name — e.g. polyester fleece jacket",
  link: "Paste Amazon or retailer URL — e.g. amazon.com/dp/...",
  barcode: "Enter UPC or scan barcode — e.g. 012345678905",
};
const CHIPS = [
  { label: "Search by name", example: "polyester fleece jacket" },
  { label: "Amazon link", example: "amazon.com/dp/B08X..." },
  { label: "Retailer URL", example: "target.com/p/hoodie" },
  { label: "Barcode / UPC", example: "012345678905" },
];
const STEPS = [
  { n: "01", title: "Search, Paste Link, or Scan", desc: "Enter a product name, paste an Amazon or retailer URL, or scan a barcode." },
  { n: "02", title: "Identify Materials", desc: "BioLens detects likely material composition and product class." },
  { n: "03", title: "Score Petroload", desc: "BioLens estimates petrochemical dependency and flags risk." },
  { n: "04", title: "Better Alternatives", desc: "BioLens suggests lower-impact materials or replacement products." },
];
function SearchIcon() { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function LinkIcon() { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M5.5 9.5a3.5 3.5 0 0 0 4.95 0l1.06-1.06a3.5 3.5 0 0 0-4.95-4.95L5.5 4.55" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M9.5 5.5a3.5 3.5 0 0 0-4.95 0L3.49 6.56a3.5 3.5 0 0 0 4.95 4.95l1.06-1.06" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>; }
function BarcodeIcon() { return <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="1" y="3" width="1.5" height="9" rx="0.5" fill="currentColor"/><rect x="3.5" y="3" width="1" height="9" rx="0.5" fill="currentColor"/><rect x="5.5" y="3" width="2" height="9" rx="0.5" fill="currentColor"/><rect x="8.5" y="3" width="1" height="9" rx="0.5" fill="currentColor"/><rect x="10.5" y="3" width="2.5" height="9" rx="0.5" fill="currentColor"/></svg>; }

export default function HomePage() {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<InputMode>("search");
  const [manualMode, setManualMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestRef = useRef<HTMLDivElement>(null);

  const activeMode = manualMode ? mode : (value ? detectMode(value) : mode);

  useEffect(() => {
    if (value.length >= 3 && activeMode === "search") {
      const q = value.toLowerCase();
      const matches = SUGGESTIONS.filter(s => s.toLowerCase().includes(q)).slice(0, 6);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
      setSelectedIdx(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value, activeMode]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    if (!manualMode && v) setMode(detectMode(v));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === "Enter") {
      if (selectedIdx >= 0 && suggestions[selectedIdx]) { selectSuggestion(suggestions[selectedIdx]); }
      else { submit(); }
    } else if (e.key === "Escape") { setShowSuggestions(false); setSelectedIdx(-1); }
  };

  const selectSuggestion = (s: string) => { setValue(s); setShowSuggestions(false); setSelectedIdx(-1); setTimeout(() => submit(s), 50); };
  const setManual = (m: InputMode) => { setMode(m); setManualMode(true); inputRef.current?.focus(); };

  const submit = async (q?: string) => {
    const val = q ?? value;
    if (!val.trim() || loading) return;
    setShowSuggestions(false);
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/intake", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputType: detectInputType(val), value: val.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/results/" + encodeURIComponent(data.productId) + "?q=" + encodeURIComponent(val.trim()) + "&type=" + detectInputType(val);
      } else { setError(data.error || "Analysis failed. Try again."); setLoading(false); }
    } catch { setError("Connection error. Try again."); setLoading(false); }
  };

  const MODES: { key: InputMode; label: string; icon: React.ReactNode }[] = [
    { key: "search", label: "Search", icon: <SearchIcon /> },
    { key: "link", label: "Paste Link", icon: <LinkIcon /> },
    { key: "barcode", label: "Barcode", icon: <BarcodeIcon /> },
  ];

  return (
    <main className="min-h-screen bg-[#070b12] text-slate-100" style={{fontFamily:"var(--font-inter)"}}>
      {/* NAV */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#070b12]/95 backdrop-blur-md border-b border-[#1e3a5f] h-14 flex items-center px-6 justify-between">
        <div className="flex items-center gap-2.5">
          <Image src="/assets/biolens_icon_128.png" alt="" width={28} height={28} className="rounded-md"/>
          <span className="font-bold text-white text-base tracking-tight" style={{fontFamily:"var(--font-manrope)"}}>BioLens</span>
          <span className="text-slate-700 text-xs hidden sm:inline ml-0.5">Material Intelligence</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-slate-500">
          <a href="#how-it-works" className="hover:text-slate-300 transition-colors hidden sm:inline">How it works</a>
          <a href="#explore" className="hover:text-slate-300 transition-colors hidden sm:inline">Explore Materials</a>
        </nav>
      </header>

      {/* HERO */}
      <section className="pt-36 pb-14 px-4 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 bg-cyan-400/10 border border-cyan-400/25 rounded-full px-4 py-1.5 text-xs text-cyan-400 mb-9 font-medium" style={{fontFamily:"var(--font-manrope)"}}>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block" style={{boxShadow:"0 0 6px #06b6d4"}}/>
          Supports Amazon links · Barcode scanning · Retailer URLs
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-[56px] font-extrabold text-white leading-[1.1] tracking-tight mb-5 max-w-3xl" style={{fontFamily:"var(--font-manrope)"}}>
          What is this product<br/><span style={{color:"#06b6d4"}}>actually made of?</span>
        </h1>
        <p className="text-slate-400 text-base sm:text-lg max-w-xl mb-3 leading-relaxed">Search by product name, paste an Amazon or product link, or scan a barcode to reveal petrochemical dependency, origin, material risk, and better alternatives.</p>
        <p className="text-slate-600 text-sm max-w-lg mb-10 leading-relaxed">Most products do not clearly disclose what they are made of. BioLens reveals it.</p>

        {/* MODE TOGGLE */}
        <div className="inline-flex items-center bg-[#0c1220] border border-[#1e3a5f] rounded-xl p-1 mb-5 gap-0.5">
          {MODES.map(({ key, label, icon }) => {
            const active = activeMode === key;
            return (
              <button key={key} onClick={() => setManual(key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${active ? "bg-cyan-400 text-[#070b12] shadow-md" : "text-slate-500 hover:text-slate-300 hover:bg-[#111827]"}`}
                style={{fontFamily:"var(--font-manrope)"}}>
                <span className={active ? "text-[#070b12]" : "text-slate-600"}>{icon}</span>{label}
              </button>
            );
          })}
        </div>

        {/* INPUT WITH AUTOCOMPLETE */}
        <div className="w-full max-w-2xl relative">
          <div className={`flex items-center bg-[#0d1829] rounded-2xl border transition-all duration-200 ${error ? "border-red-500/50" : "border-[#1e3a5f] focus-within:border-cyan-400/70 focus-within:shadow-[0_0_0_3px_rgba(6,182,212,0.12)]"}`} style={{minHeight:"60px"}}>
            <span className="pl-5 text-slate-600">{activeMode==="barcode"?<BarcodeIcon/>:activeMode==="link"?<LinkIcon/>:<SearchIcon/>}</span>
            <input ref={inputRef} type="text" value={value} onChange={handleChange} onKeyDown={handleKeyDown}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
              placeholder={PLACEHOLDERS[activeMode]} disabled={loading}
              className="flex-1 py-4 px-3.5 bg-transparent text-white placeholder:text-slate-700 outline-none text-base disabled:opacity-50"
            />
            {value && !loading && (
              <button onClick={() => { setValue(""); setManualMode(false); setShowSuggestions(false); inputRef.current?.focus(); }} className="px-2 text-slate-600 hover:text-slate-400">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            )}
            <button onClick={() => submit()} disabled={!value.trim() || loading}
              className={`mr-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 ${value.trim() && !loading ? "bg-cyan-400 text-[#070b12] hover:bg-cyan-300 active:scale-95" : "bg-[#0f1f35] text-slate-700 cursor-not-allowed"}`}
              style={{fontFamily:"var(--font-manrope)", minWidth:"100px", boxShadow: value.trim() && !loading ? "0 0 16px rgba(6,182,212,0.25)" : "none"}}>
              {loading ? <span className="flex items-center gap-2"><svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/><path d="M7 2a5 5 0 0 1 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>Analyzing</span> : "Analyze →"}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2 px-1 text-left">{error}</p>}

          {/* AUTOCOMPLETE DROPDOWN */}
          {showSuggestions && suggestions.length > 0 && (
            <div ref={suggestRef} className="absolute top-full left-0 right-0 mt-1 bg-[#0d1829] border border-[#1e3a5f] rounded-xl overflow-hidden shadow-2xl z-50" style={{boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
              {suggestions.map((s, i) => (
                <button key={s} onMouseDown={() => selectSuggestion(s)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-colors border-b border-[#1a2d48] last:border-0 ${i===selectedIdx ? "bg-cyan-400/10 text-white" : "text-slate-300 hover:bg-[#111827] hover:text-white"}`}>
                  <span className="text-slate-600 shrink-0"><SearchIcon/></span>
                  <span>{(() => {
                    const q = value.toLowerCase();
                    const idx = s.toLowerCase().indexOf(q);
                    if (idx === -1) return s;
                    return <>{s.slice(0,idx)}<span className="text-cyan-400 font-semibold">{s.slice(idx,idx+q.length)}</span>{s.slice(idx+q.length)}</>;
                  })()}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* HELPER CHIPS */}
        <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-2xl">
          {CHIPS.map(chip => (
            <button key={chip.label} onClick={() => { setValue(chip.example); if (!manualMode) setMode(detectMode(chip.example)); inputRef.current?.focus(); }}
              className="flex items-center gap-1.5 text-xs bg-[#0c1220] border border-[#1a2d48] rounded-full px-3 py-1.5 text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all">
              <span className="text-cyan-400 font-semibold">{chip.label}</span><span className="text-slate-700">·</span><span className="font-mono text-slate-600">{chip.example}</span>
            </button>
          ))}
        </div>
      </section>

      {/* EXAMPLE CARD */}
      <section className="px-4 pb-20 flex justify-center">
        <div className="w-full max-w-xl bg-[#0c1829] border border-[#1e3a5f] rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-2.5 border-b border-[#1a2d48] flex items-center gap-2 bg-[#0a1520]">
            <span className="w-2 h-2 rounded-full bg-red-400" style={{boxShadow:"0 0 4px rgba(239,68,68,0.5)"}}/>
            <span className="text-xs text-slate-600 font-mono tracking-wide">Example result preview — what BioLens returns</span>
          </div>
          <div className="p-6 flex items-start gap-5">
            <div className="w-14 h-14 rounded-xl bg-[#0a1520] border border-[#1a2d48] flex items-center justify-center text-2xl shrink-0">🧥</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-slate-600 text-xs uppercase tracking-widest mb-0.5 font-semibold">Generic Brand</p>
                  <h3 className="text-white font-bold text-xl leading-tight" style={{fontFamily:"var(--font-manrope)"}}>Polyester Hoodie</h3>
                  <p className="text-slate-500 text-sm mt-0.5">Apparel · Synthetic polymer</p>
                </div>
                <div className="flex flex-col items-center rounded-2xl px-5 py-3 shrink-0" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.25)"}}>
                  <span className="font-black leading-none text-[42px]" style={{color:"#ef4444",fontFamily:"var(--font-manrope)",textShadow:"0 0 20px rgba(239,68,68,0.4)"}}>95</span>
                  <span className="text-xs font-bold mt-1 uppercase tracking-wide" style={{color:"#ef4444",fontFamily:"var(--font-manrope)"}}>Petrochemical</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="text-xs font-semibold px-3 py-1 rounded-full border" style={{color:"#ef4444",background:"rgba(239,68,68,0.08)",borderColor:"rgba(239,68,68,0.2)"}}>Petro-Based</span>
                <span className="text-xs font-semibold px-3 py-1 rounded-full border" style={{color:"#f97316",background:"rgba(249,115,22,0.08)",borderColor:"rgba(249,115,22,0.2)"}}>High Petro-Risk</span>
                <span className="text-xs font-semibold px-3 py-1 rounded-full border" style={{color:"#10b981",background:"rgba(16,185,129,0.08)",borderColor:"rgba(16,185,129,0.2)"}}>Better Option: Hemp</span>
              </div>
              <p className="text-xs text-slate-500 mt-3.5 leading-relaxed border-t border-[#1a2d48] pt-3.5">This product is primarily synthetic polymer and may shed microplastics during use and washing.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-t border-b border-[#1a2d48] bg-[#080f1a]">
        <div className="max-w-3xl mx-auto px-4 py-10 grid grid-cols-3 gap-6 text-center">
          {[{n:"2,300+",label:"Products analyzed"},{n:"120+",label:"Material systems mapped"},{n:"1,640+",label:"High petro-risk exposures flagged"}].map(m=>(
            <div key={m.label}>
              <p className="text-2xl sm:text-3xl font-black" style={{color:"#06b6d4",fontFamily:"var(--font-manrope)"}}>{m.n}</p>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-snug">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-slate-700 text-xs font-bold uppercase tracking-widest mb-3" style={{fontFamily:"var(--font-manrope)"}}>How BioLens works</p>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-white mb-12 leading-snug" style={{fontFamily:"var(--font-manrope)"}}>How BioLens reveals what products are made of</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {STEPS.map(step=>(
              <div key={step.n} className="bg-[#0a1520] border border-[#1a2d48] rounded-xl p-5 space-y-2.5 hover:border-[#1e3a5f] transition-colors">
                <span className="text-xs font-black text-cyan-400 font-mono block">{step.n}</span>
                <h3 className="text-white font-semibold text-sm leading-snug" style={{fontFamily:"var(--font-manrope)"}}>{step.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EXPLORE CTA */}
      <section id="explore" className="py-20 px-4 border-t border-[#1a2d48]">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold text-white leading-snug" style={{fontFamily:"var(--font-manrope)"}}>Explore the materials around you</h2>
          <p className="text-slate-500 text-base leading-relaxed">Understand what everyday products are really made of and find better alternatives.</p>
          <button onClick={() => { window.scrollTo({top:0,behavior:"smooth"}); setTimeout(()=>inputRef.current?.focus(),500); }}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] active:scale-95"
            style={{background:"#06b6d4",color:"#070b12",fontFamily:"var(--font-manrope)",boxShadow:"0 0 20px rgba(6,182,212,0.3)"}}>
            Scan your first product →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1a2d48] py-6 px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Image src="/assets/biolens_icon_128.png" alt="" width={20} height={20} className="rounded"/>
          <span className="text-white font-bold text-sm" style={{fontFamily:"var(--font-manrope)"}}>BioLens</span>
          <span className="text-slate-700 text-xs">Material Intelligence</span>
        </div>
        <p className="text-xs text-slate-700">Not financial or medical advice. Analysis is informational only.</p>
      </footer>
    </main>
  );
        }
