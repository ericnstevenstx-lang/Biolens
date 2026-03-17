"use client";
import { useState } from "react";
import Image from "next/image";

type InputMode = "search" | "link" | "barcode";

function detectMode(v: string): InputMode {
  if (/^\d{8,14}$/.test(v.trim())) return "barcode";
  try {
    const u = new URL(v.trim().startsWith("http") ? v.trim() : "https://" + v.trim());
    if (u.hostname.includes(".")) return "link";
  } catch {}
  return "search";
}

function detectInputType(v: string) {
  if (/^\d{8,14}$/.test(v.trim())) return "barcode";
  try {
    const u = new URL(v.trim().startsWith("http") ? v.trim() : "https://" + v.trim());
    if (u.hostname.includes("amazon")) return "amazon";
    if (u.hostname.includes(".")) return "url";
  } catch {}
  return "search";
}

const MODE_PLACEHOLDERS: Record<InputMode, string> = {
  search: "Search product name — e.g. polyester fleece jacket",
  link: "Paste Amazon or retailer product URL",
  barcode: "Scan barcode or enter UPC — e.g. 012345678905",
};

const EXAMPLE_CHIPS = [
  { label: "Search by name", example: "polyester fleece jacket" },
  { label: "Amazon link", example: "amazon.com/dp/B08X..." },
  { label: "Retailer URL", example: "target.com/p/hoodie" },
  { label: "Barcode / UPC", example: "012345678905" },
];

const STEPS = [
  {
    n: "01",
    title: "Search, Paste Link, or Scan",
    desc: "Enter a product name, paste an Amazon or retailer URL, or scan a barcode.",
  },
  {
    n: "02",
    title: "Identify Materials",
    desc: "BioLens detects likely material composition and product class.",
  },
  {
    n: "03",
    title: "Score Dependence",
    desc: "BioLens estimates petrochemical dependency and flags risk level.",
  },
  {
    n: "04",
    title: "Better Alternatives",
    desc: "BioLens suggests lower-impact replacement materials or products.",
  },
];

export default function HomePage() {
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<InputMode>("search");
  const [manualMode, setManualMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activeMode = manualMode ? mode : (value ? detectMode(value) : mode);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setValue(v);
    if (!manualMode && v) setMode(detectMode(v));
  };

  const setManual = (m: InputMode) => { setMode(m); setManualMode(true); };

  const submit = async (q?: string) => {
    const val = q ?? value;
    if (!val.trim() || loading) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputType: detectInputType(val), value: val.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/results/" + encodeURIComponent(data.productId) + "?q=" + encodeURIComponent(val.trim()) + "&type=" + detectInputType(val);
      } else {
        setError(data.error || "Analysis failed. Try again.");
        setLoading(false);
      }
    } catch {
      setError("Connection error. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#070b12] text-[#f1f5f9]" style={{fontFamily:"var(--font-inter)"}}>

      {/* NAV */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#070b12]/95 backdrop-blur-md border-b border-[#1e293b] h-14 flex items-center px-6 justify-between">
        <div className="flex items-center gap-2">
          <Image src="/assets/biolens_icon_128.png" alt="" width={28} height={28} className="rounded-md" />
          <span className="font-bold text-white text-base tracking-tight" style={{fontFamily:"var(--font-manrope)"}}>BioLens</span>
          <span className="text-[#475569] text-xs hidden sm:inline ml-1">Material Intelligence</span>
        </div>
        <nav className="flex items-center gap-6 text-sm text-[#94a3b8]">
          <a href="#how-it-works" className="hover:text-white transition-colors hidden sm:inline">How it works</a>
          <a href="#explore" className="hover:text-white transition-colors hidden sm:inline">Explore Materials</a>
        </nav>
      </header>

      {/* HERO */}
      <section className="pt-32 pb-16 px-4 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 bg-[#06b6d4]/10 border border-[#06b6d4]/20 rounded-full px-4 py-1.5 text-xs text-[#06b6d4] mb-8" style={{fontFamily:"var(--font-manrope)"}}>
          <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] animate-pulse"></span>
          Supports Amazon links · Barcode scanning · Retailer URLs
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-5 max-w-3xl" style={{fontFamily:"var(--font-manrope)"}}>
          What is this product<br />
          <span className="text-[#06b6d4]">actually made of?</span>
        </h1>
        <p className="text-[#94a3b8] text-base sm:text-lg max-w-xl mb-10 leading-relaxed">
          Search by product name, paste an Amazon or product link, or scan a barcode to reveal petrochemical dependency, origin, material risk, and better alternatives.
        </p>

        {/* MODE TOGGLE */}
        <div className="flex items-center gap-1 bg-[#0c1220] border border-[#1e293b] rounded-xl p-1 mb-4">
          {(["search","link","barcode"] as InputMode[]).map((m) => {
            const labels: Record<InputMode, string> = { search: "Search", link: "Paste Link", barcode: "Barcode" };
            const icons: Record<InputMode, string> = { search: "⌕", link: "⎘", barcode: "⿸" };
            const active = activeMode === m;
            return (
              <button key={m} onClick={() => setManual(m)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${active ? "bg-[#06b6d4] text-[#070b12] font-semibold" : "text-[#94a3b8] hover:text-white"}`}
                style={{fontFamily:"var(--font-manrope)"}}>
                {labels[m]}
              </button>
            );
          })}
        </div>

        {/* INPUT */}
        <div className="w-full max-w-2xl">
          <div className={`flex items-center bg-[#111827] rounded-2xl border transition-all ${error ? "border-red-500/60" : "border-[#1e293b] focus-within:border-[#06b6d4]/50 focus-within:shadow-[0_0_0_3px_rgba(6,182,212,0.08)]"}`}>
            <span className="pl-4 text-[#475569] text-lg select-none">
              {activeMode === "barcode" ? "▦" : activeMode === "link" ? "⎘" : "⌕"}
            </span>
            <input
              type="text" value={value} onChange={handleChange}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={MODE_PLACEHOLDERS[activeMode]}
              disabled={loading}
              className="flex-1 py-4 px-3 bg-transparent text-white placeholder:text-[#475569] outline-none text-base disabled:opacity-50"
            />
            <button onClick={() => submit()} disabled={!value.trim() || loading}
              className={`mr-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${value.trim() && !loading ? "bg-[#06b6d4] text-[#070b12] hover:bg-[#22d3ee] active:scale-95" : "bg-[#1e293b] text-[#475569] cursor-not-allowed"}`}
              style={{fontFamily:"var(--font-manrope)"}}>
              {loading ? "Analyzing…" : "Analyze →"}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2 px-1 text-left">{error}</p>}
        </div>

        {/* HELPER CHIPS */}
        <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-2xl">
          {EXAMPLE_CHIPS.map(chip => (
            <button key={chip.label} onClick={() => { setValue(chip.example); if (!manualMode) setMode(detectMode(chip.example)); }}
              className="flex items-center gap-1.5 text-xs bg-[#0c1220] border border-[#1e293b] rounded-full px-3 py-1.5 text-[#94a3b8] hover:text-white hover:border-[#475569] transition-colors">
              <span className="text-[#06b6d4] font-semibold">{chip.label}</span>
              <span className="text-[#475569]">·</span>
              <span className="font-mono opacity-70">{chip.example}</span>
            </button>
          ))}
        </div>
      </section>

      {/* EXAMPLE RESULT CARD */}
      <section className="px-4 pb-16 flex justify-center">
        <div className="w-full max-w-xl bg-[#111827] border border-[#1e293b] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1e293b] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
            <span className="text-xs text-[#475569] font-mono">Example result preview</span>
          </div>
          <div className="p-5 flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[#0c1220] border border-[#1e293b] flex items-center justify-center text-2xl flex-shrink-0">🧥</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[#475569] text-xs uppercase tracking-widest mb-0.5" style={{fontFamily:"var(--font-manrope)"}}>Generic Brand</p>
                  <h3 className="text-white font-bold text-lg" style={{fontFamily:"var(--font-manrope)"}}>Polyester Hoodie</h3>
                  <p className="text-[#475569] text-sm">Apparel · Synthetic</p>
                </div>
                <div className="flex flex-col items-center bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-xl px-4 py-2">
                  <span className="font-black text-2xl text-[#ef4444] leading-none" style={{fontFamily:"var(--font-manrope)"}}>95</span>
                  <span className="text-xs text-[#ef4444] font-semibold">Petrochemical</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 rounded-full px-3 py-1 font-medium">Petro-Based</span>
                <span className="text-xs bg-[#ef4444]/10 text-[#ef4444] border border-[#ef4444]/20 rounded-full px-3 py-1 font-medium">High Petro-Risk</span>
                <span className="text-xs bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/20 rounded-full px-3 py-1 font-medium">Better Option: Hemp</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST METRICS */}
      <section className="border-t border-b border-[#1e293b] bg-[#0c1220]">
        <div className="max-w-3xl mx-auto px-4 py-8 grid grid-cols-3 gap-4 text-center">
          {[
            { n: "2,300+", label: "Products analyzed" },
            { n: "120+", label: "Materials mapped" },
            { n: "1,640+", label: "High petro-risk flags" },
          ].map(m => (
            <div key={m.label}>
              <p className="text-2xl sm:text-3xl font-black text-[#06b6d4]" style={{fontFamily:"var(--font-manrope)"}}>{m.n}</p>
              <p className="text-xs sm:text-sm text-[#475569] mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-[#475569] text-xs font-semibold uppercase tracking-widest mb-3" style={{fontFamily:"var(--font-manrope)"}}>How BioLens works</p>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-white mb-12" style={{fontFamily:"var(--font-manrope)"}}>Four steps to material truth</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STEPS.map((step) => (
              <div key={step.n} className="bg-[#0c1220] border border-[#1e293b] rounded-2xl p-5 space-y-3">
                <span className="text-xs font-black text-[#06b6d4] font-mono">{step.n}</span>
                <h3 className="text-white font-semibold text-sm leading-snug" style={{fontFamily:"var(--font-manrope)"}}>{step.title}</h3>
                <p className="text-[#475569] text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EXPLORE CTA */}
      <section id="explore" className="py-20 px-4 border-t border-[#1e293b]">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold text-white" style={{fontFamily:"var(--font-manrope)"}}>Explore the materials around you</h2>
          <p className="text-[#94a3b8] text-base leading-relaxed">Understand what everyday products are really made of and find better alternatives.</p>
          <button onClick={() => document.querySelector('input')?.focus()}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#06b6d4] text-[#070b12] rounded-xl font-bold text-sm hover:bg-[#22d3ee] transition-colors"
            style={{fontFamily:"var(--font-manrope)"}}>
            Start Scanning →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1e293b] py-6 px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Image src="/assets/biolens_icon_128.png" alt="" width={20} height={20} className="rounded" />
          <span className="text-white font-bold text-sm" style={{fontFamily:"var(--font-manrope)"}}>BioLens</span>
          <span className="text-[#475569] text-xs">Material Intelligence</span>
        </div>
        <p className="text-xs text-[#475569]">Not financial or medical advice. Analysis is informational only.</p>
      </footer>
    </main>
  );
          }
