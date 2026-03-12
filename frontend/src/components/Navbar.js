import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Menu, X } from "lucide-react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/explore", label: "Explore Materials" },
    { to: "/how-it-works", label: "How It Works" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav
      data-testid="navbar"
      className={`glass-nav fixed top-0 left-0 right-0 z-50 transition-shadow duration-300 ${scrolled ? "nav-scrolled" : ""}`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            data-testid="nav-logo"
            className="flex items-center gap-2"
          >
            <Search className="w-5 h-5" style={{ color: '#B45309' }} />
            <span
              className="text-xl font-semibold tracking-tight"
              style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}
            >
              BioLens
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                data-testid={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-sm font-medium transition-colors duration-200"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: isActive(link.to) ? '#1D1D1F' : '#86868B',
                }}
                onMouseEnter={(e) => { if (!isActive(link.to)) e.target.style.color = '#1D1D1F'; }}
                onMouseLeave={(e) => { if (!isActive(link.to)) e.target.style.color = '#86868B'; }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            data-testid="nav-mobile-toggle"
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            data-testid="nav-mobile-menu"
            className="md:hidden pb-6 pt-2 animate-fade-in"
          >
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                data-testid={`nav-mobile-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                className="block py-3 text-sm font-medium"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  color: isActive(link.to) ? '#1D1D1F' : '#86868B',
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
