import Link from "next/link";

const dimensions = [
  {
    name: "Petroload Index",
    description: "How petroleum-dependent is this product?",
  },
  {
    name: "Health Effects",
    description: "Endocrine disruption, carcinogenicity, microplastic exposure",
  },
  {
    name: "Capital Flow",
    description:
      "Where does your money actually go? Tariff exposure, foreign leakage",
  },
  {
    name: "Lifecycle Intelligence",
    description: "Recyclability, biodegradability, end-of-life pathway",
  },
  {
    name: "Origin Intelligence",
    description: "Where was this made? Supply chain transparency",
  },
  {
    name: "Material Alternatives",
    description: "Better options exist. We show you what they are.",
  },
];

const dataPoints = [
  { value: "998", label: "materials with full classification and toxicity profiles" },
  { value: "9,604", label: "concern assessments across 14 health dimensions" },
  { value: "1,292", label: "tariff comparisons for economic impact analysis" },
];

const dataSources = [
  "Open Food Facts, Open Beauty Facts, and web-sourced product data",
  "Neo4j material relationship graph for alternative discovery",
];

const ecosystem = [
  {
    name: "Now We Evolve",
    tagline: "The movement",
    href: "https://nowweevolve.com",
  },
  {
    name: "BioeconomyFoundation.org",
    tagline: "The research",
    href: "https://bioeconomyfoundation.org",
  },
  {
    name: "FiberFoundry",
    tagline: "The marketplace",
    href: "https://fiberfoundry.co",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100">
      {/* Nav Header */}
      <header className="sticky top-0 z-50 bg-[#070b12]/95 backdrop-blur border-b border-[#1e3a5f] h-12 flex items-center px-4 gap-6">
        <a href="/" className="text-cyan-400 font-bold text-sm" style={{ fontFamily: "var(--font-manrope)" }}>BioLens</a>
        <nav className="hidden sm:flex gap-4 ml-auto text-xs text-slate-400">
          <a href="/" className="hover:text-white transition-colors">Home</a>
          <a href="/explore" className="hover:text-white transition-colors">Explore Materials</a>
          <a href="/how-it-works" className="hover:text-white transition-colors">How It Works</a>
          <a href="/about" className="hover:text-white transition-colors font-semibold text-white">About</a>
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-16 pb-20">
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-10 text-center">
          About BioLens
        </h1>

        {/* Mission */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">Our Mission</h2>
          <div className="space-y-4 text-slate-400 text-sm leading-relaxed">
            <p>
              BioLens exists to make the invisible visible. Every product you buy is made of materials — and those materials have consequences for your health, your economy, and your planet.
            </p>
            <p>
              We built BioLens to answer one simple question: <span className="text-slate-200 font-medium">What is this really made of?</span>
            </p>
          </div>
        </section>

        {/* What We Do */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">What We Do</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            BioLens is a material intelligence engine. We analyze products across 6 dimensions:
          </p>
          <div className="space-y-3">
            {dimensions.map((dim, i) => (
              <div
                key={dim.name}
                className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-4 flex gap-4 items-start"
              >
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xs">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{dim.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{dim.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Our Data */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">Our Data</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            BioLens intelligence is built on:
          </p>

          {/* Stats grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {dataPoints.map((dp) => (
              <div
                key={dp.value}
                className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-5 text-center"
              >
                <p className="text-2xl font-bold text-cyan-400">{dp.value}</p>
                <p className="text-xs text-slate-500 mt-1 leading-snug">{dp.label}</p>
              </div>
            ))}
          </div>

          <ul className="space-y-2 text-sm text-slate-400">
            {dataSources.map((src) => (
              <li key={src} className="flex items-start gap-2">
                <span className="text-cyan-500 mt-0.5">&#8226;</span>
                <span>{src}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Independence */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">Independence</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            BioLens is not sponsored by any brand, retailer, or manufacturer. We have no financial relationship with any product we analyze. Our assessments are derived from published research, regulatory data, and material science — not marketing claims.
          </p>
        </section>

        {/* Part of the Ecosystem */}
        <section className="mb-8">
          <h2 className="text-xl font-bold text-cyan-400 mb-4">Part of the Ecosystem</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            BioLens is part of a broader movement to shift the economy from petrochemical dependency to bio-based production.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ecosystem.map((org) => (
              <a
                key={org.name}
                href={org.href}
                target="_blank"
                rel="noopener"
                className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-5 hover:border-cyan-500/40 transition-colors group"
              >
                <p className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                  {org.name}
                </p>
                <p className="text-xs text-slate-500 mt-1">{org.tagline}</p>
              </a>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <div className="border-t border-[#1a2d48] mt-12 pt-8 pb-10">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <p className="text-cyan-400 font-bold text-sm mb-2">BioLens</p>
            <p className="text-xs text-slate-500 leading-relaxed">See what your products are really made of. Understand materials, reduce petroleum dependency, make better choices.</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Navigate</p>
            <div className="space-y-1.5">
              <a href="/" className="block text-xs text-slate-500 hover:text-slate-300">Home</a>
              <a href="/explore" className="block text-xs text-slate-500 hover:text-slate-300">Explore Materials</a>
              <a href="/how-it-works" className="block text-xs text-slate-500 hover:text-slate-300">How It Works</a>
              <a href="/glossary" className="block text-xs text-slate-500 hover:text-slate-300">Glossary</a>
              <a href="/about" className="block text-xs text-slate-500 hover:text-slate-300">About</a>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">About</p>
            <p className="text-xs text-slate-500 leading-relaxed">BioLens is a free educational tool that helps consumers understand the materials in everyday products. No sales. No politics. Just clarity.</p>
            <div className="flex gap-4 mt-3 text-xs text-slate-600">
              <a href="https://nowweevolve.com" target="_blank" rel="noopener" className="hover:text-slate-400">Now We Evolve</a>
              <a href="https://bioeconomyfoundation.org" target="_blank" rel="noopener" className="hover:text-slate-400">BioeconomyFoundation.org</a>
              <a href="https://fiberfoundry.co" target="_blank" rel="noopener" className="hover:text-slate-400">FiberFoundry</a>
            </div>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-4 mt-8 pt-4 border-t border-[#1a2d48] flex justify-between text-xs text-slate-600">
          <span>2026 BioLens. Built for transparency.</span>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-slate-400">Privacy</a>
            <a href="/terms" className="hover:text-slate-400">Terms</a>
          </div>
        </div>
      </div>
    </div>
  );
}
