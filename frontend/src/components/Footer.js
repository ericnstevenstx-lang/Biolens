import { Link } from "react-router-dom";
import { Search } from "lucide-react";

export default function Footer() {
  return (
    <footer
      data-testid="footer"
      style={{ backgroundColor: '#1D1D1F', color: '#F5F5F7' }}
      className="mt-auto"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Search className="w-5 h-5" style={{ color: '#B45309' }} />
              <span
                className="text-xl font-semibold tracking-tight"
                style={{ fontFamily: "'Manrope', sans-serif" }}
              >
                BioLens
              </span>
            </div>
            <p
              className="text-sm leading-relaxed"
              style={{ color: '#86868B', fontFamily: "'Inter', sans-serif" }}
            >
              See what your products are really made of. Understand materials, reduce petroleum dependency, make better choices.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4
              className="text-sm font-semibold mb-4 uppercase tracking-wider"
              style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
            >
              Navigate
            </h4>
            <div className="flex flex-col gap-3">
              {[
                { to: "/", label: "Home" },
                { to: "/explore", label: "Explore Materials" },
                { to: "/how-it-works", label: "How It Works" },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  data-testid={`footer-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                  className="text-sm transition-colors duration-200"
                  style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
                  onMouseEnter={(e) => e.target.style.color = '#F5F5F7'}
                  onMouseLeave={(e) => e.target.style.color = '#86868B'}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* About */}
          <div>
            <h4
              className="text-sm font-semibold mb-4 uppercase tracking-wider"
              style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
            >
              About
            </h4>
            <p
              className="text-sm leading-relaxed"
              style={{ color: '#86868B', fontFamily: "'Inter', sans-serif" }}
            >
              BioLens is a free educational tool that helps consumers understand
              the materials in everyday products. No sales. No politics. Just clarity.
            </p>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="mt-16 pt-8"
          style={{ borderTop: '1px solid #333333' }}
        >
          <p
            className="text-xs"
            style={{ color: '#86868B', fontFamily: "'Inter', sans-serif" }}
          >
            {new Date().getFullYear()} BioLens. Built for transparency.
          </p>
        </div>
      </div>
    </footer>
  );
}
