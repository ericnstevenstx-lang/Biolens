"use client";
import { useState } from "react";
import Link from "next/link";

function detectType(v: string): string {
  if (/^\d{8,14}$/.test(v.trim())) return "barcode";
  try { const u = new URL(v.trim().startsWith("http") ? v.trim() : "https://" + v.trim()); if (u.hostname.includes("amazon")) return "amazon"; if (u.hostname.includes(".")) return "url"; } catch {}
  return "search";
}

export default function HomePage() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!value.trim() || loading) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/intake", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ inputType: detectType(value), value: value.trim() }) });
      const data = await res.json();
      if (data.success) { window.location.href = "/results/" + encodeURIComponent(data.productId) + "?q=" + encodeURIComponent(value.trim()) + "&type=" + detectType(value); }
      else { setError(data.error || "Analysis failed"); setLoading(false); }
    } catch (e) { setError("Connection error. Try again."); setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-[#070b12] flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#070b12]/90 backdrop-blur-md border-b border-[#1e293b] h-14 flex items-center px-6">
        <span className="font-bold text-[#06b6d4] text-lg tracking-tight" style={{fontFamily:"var(--font-manrope)"}}>BioLens</span>
      </header>
      <section className="flex-1 flex flex-col items-center justify-center px-4 pt-20 pb-16">
        <div className="w-3 h-3 rounded-full bg-[#06b6d4] mb-8 shadow-[0_0_24px_#06b6d4]" />
        <h1 className="text-4xl sm:text-5xl font-bold text-center text-white leading-tight mb-4 max-w-2xl" style={{fontFamily:"var(--font-playfair)"}}>
          What is this product <em className="text-[#06b6d4]">actually</em> made of?
        </h1>
        <p className="text-[#94a3b8] text-center max-w-md mb-10 text-base leading-relaxed">
          Scan a barcode, paste a product link, or search by name. BioLens reveals petrochemical dependency, origin, toxicity, and better alternatives.
        </p>
        <div className="w-full max-w-xl">
          <div className={`flex items-center bg-[#111827] rounded-2xl border transition-all ${error ? "border-red-500" : "border-[#1e293b] focus-within:border-[#06b6d4]/60"}`}>
            <svg className="ml-4 text-[#475569] shrink-0" width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5"/><path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <input type="text" value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Scan barcode · Paste product link · Search product" disabled={loading} className="flex-1 py-4 px-3 bg-transparent text-white placeholder:text-[#475569] outline-none text-base disabled:opacity-50" />
            <button onClick={submit} disabled={!value.trim() || loading} className={`mr-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${value.trim() && !loading ? "bg-[#06b6d4] text-[#070b12] hover:bg-[#22d3ee]" : "bg-[#1e293b] text-[#475569] cursor-not-allowed"}`} style={{fontFamily:"var(--font-manrope)"}}>
              {loading ? "Analyzing..." : "Analyze"}
            </button>
          </div>
          {error && <p className="text-red-400 text-sm mt-2 px-1">{error}</p>}
        </div>
        <div className="flex flex-wrap gap-2 mt-6 justify-center">
          {["bamboo bed sheets","polyester fleece jacket","PET water bottle","hemp t-shirt"].map(q => (
            <button key={q} onClick={() => { setValue(q); }} className="text-xs text-[#475569] border border-[#1e293b] rounded-full px-3 py-1.5 hover:text-[#94a3b8] hover:border-[#475569] transition-colors">
              {q}
            </button>
          ))}
        </div>
      </section>
      <footer className="border-t border-[#1e293b] py-4 px-6 flex items-center justify-between">
        <span className="text-[#06b6d4] font-bold text-sm" style={{fontFamily:"var(--font-manrope)"}}>BioLens</span>
        <span className="text-xs text-[#475569]">Material intelligence. Not financial or medical advice.</span>
      </footer>
    </main>
  );
}
