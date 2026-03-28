"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "@/components/Nav";

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [inputType, setInputType] = useState<"search" | "barcode" | "amazon" | "url">("search");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    const encoded = encodeURIComponent(q);
    router.push(`/results/${encoded}?type=${inputType}&q=${encoded}`);
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
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholders[inputType]}
              className="flex-1 bg-[#0c1829] border border-[#1e3a5f] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition-colors"
              autoFocus
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
