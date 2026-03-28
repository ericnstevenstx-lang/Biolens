"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/explore", label: "Explore" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/glossary", label: "Glossary" },
];

export default function Nav({ breadcrumb }: { breadcrumb?: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#070b12]/95 backdrop-blur border-b border-[#1e3a5f]">
      <div className="h-12 flex items-center px-4 sm:px-6 gap-3">
        {/* Logo + wordmark */}
        <Link href="/" className="flex items-center gap-2 flex-shrink-0">
          <Image
            src="/assets/biolens_icon_128.png"
            alt="BioLens"
            width={24}
            height={24}
            className="rounded"
          />
          <span
            className="text-cyan-400 font-bold text-sm hidden sm:inline"
            style={{ fontFamily: "var(--font-manrope)" }}
          >
            BioLens
          </span>
        </Link>

        {/* Breadcrumb (results page) */}
        {breadcrumb && (
          <>
            <span className="text-slate-600">/</span>
            <span className="text-slate-400 text-sm truncate">{breadcrumb}</span>
          </>
        )}

        {/* Desktop nav links */}
        <nav className="hidden md:flex items-center gap-1 ml-4">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
                  active
                    ? "text-cyan-400 bg-cyan-400/10"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2 flex-shrink-0">
          {pathname !== "/" && (
            <Link
              href="/"
              className="text-xs text-slate-400 border border-[#1e3a5f] px-3 py-1.5 rounded-lg hover:text-white transition-colors"
            >
              New Scan
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-1.5 text-slate-400 hover:text-white transition-colors"
            aria-label="Menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              {menuOpen ? (
                <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                <>
                  <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <nav className="md:hidden border-t border-[#1e3a5f] bg-[#070b12] px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block text-sm px-3 py-2 rounded-lg transition-colors ${
                  active
                    ? "text-cyan-400 bg-cyan-400/10"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
