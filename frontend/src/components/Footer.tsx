import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-[#1a2d48] mt-12 pt-8 pb-10">
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <p className="text-cyan-400 font-bold text-sm mb-2">BioLens</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            See what your products are really made of. Understand materials, reduce petroleum dependency, make better choices.
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Navigate</p>
          <div className="space-y-1.5">
            <Link href="/" className="block text-xs text-slate-500 hover:text-slate-300">Home</Link>
            <Link href="/explore" className="block text-xs text-slate-500 hover:text-slate-300">Explore Materials</Link>
            <Link href="/how-it-works" className="block text-xs text-slate-500 hover:text-slate-300">How It Works</Link>
            <Link href="/glossary" className="block text-xs text-slate-500 hover:text-slate-300">Glossary</Link>
            <Link href="/about" className="block text-xs text-slate-500 hover:text-slate-300">About</Link>
            <Link href="/faq" className="block text-xs text-slate-500 hover:text-slate-300">FAQ</Link>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ecosystem</p>
          <p className="text-xs text-slate-500 leading-relaxed">
            BioLens is a free educational tool that helps consumers understand the materials in everyday products. No sales. No politics. Just clarity.
          </p>
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
          <Link href="/privacy" className="hover:text-slate-400">Privacy</Link>
          <Link href="/terms" className="hover:text-slate-400">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
