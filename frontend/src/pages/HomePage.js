import { useNavigate } from "react-router-dom";
import { Scan, AlertTriangle, Leaf, ArrowRight, ChevronDown } from "lucide-react";
import SearchBar from "@/components/SearchBar";

const EXAMPLE_SEARCHES = [
  "polyester hoodie",
  "plastic cutting board",
  "nylon rope",
  "bamboo sheets",
  "wool sweater",
  "glass bottle",
];

export default function HomePage() {
  const navigate = useNavigate();

  const scrollToCards = () => {
    document.getElementById("how-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div data-testid="home-page">
      {/* Hero */}
      <section
        data-testid="hero-section"
        className="pt-32 pb-24 md:pt-44 md:pb-32 px-6 md:px-12 lg:px-24"
      >
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <h1
              className="text-4xl sm:text-5xl lg:text-6xl font-semibold leading-tight animate-fade-up"
              style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}
            >
              See what your products are{" "}
              <span style={{ color: '#B45309' }}>really</span> made of.
            </h1>

            <p
              className="mt-6 text-base md:text-lg leading-relaxed animate-fade-up delay-100 max-w-xl"
              style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
            >
              Search everyday products and instantly learn whether they are
              petroleum-based, plant-based, or transition materials.
            </p>

            {/* Search bar */}
            <div className="mt-10 animate-fade-up delay-200">
              <SearchBar size="large" />
            </div>

            {/* Quick examples */}
            <div className="mt-6 flex flex-wrap gap-2 animate-fade-up delay-300">
              <span
                className="text-xs font-medium mr-1"
                style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
              >
                Try:
              </span>
              {EXAMPLE_SEARCHES.map((term) => (
                <button
                  key={term}
                  data-testid={`example-search-${term.replace(/\s+/g, '-')}`}
                  onClick={() => navigate(`/results?q=${encodeURIComponent(term)}`)}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200"
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    backgroundColor: 'rgba(29, 29, 31, 0.05)',
                    color: '#1D1D1F',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#B45309';
                    e.target.style.color = '#B45309';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = 'transparent';
                    e.target.style.color = '#1D1D1F';
                  }}
                >
                  {term}
                </button>
              ))}
            </div>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap gap-4 animate-fade-up delay-400">
              <button
                data-testid="cta-how-it-works"
                onClick={scrollToCards}
                className="btn-pill btn-secondary flex items-center gap-2"
              >
                How it Works
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Explainer cards */}
      <section
        id="how-section"
        data-testid="explainer-cards-section"
        className="py-24 md:py-32 px-6 md:px-12 lg:px-24"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: <Scan className="w-6 h-6" />,
                title: "Material Check",
                description: "Find out whether a product is petroleum-based, plant-based, or transitional.",
                color: "#B45309",
                delay: "delay-100",
              },
              {
                icon: <AlertTriangle className="w-6 h-6" />,
                title: "Why It Matters",
                description: "Learn about plastics, microplastics, and better material options.",
                color: "#BE123C",
                delay: "delay-200",
              },
              {
                icon: <Leaf className="w-6 h-6" />,
                title: "Better Alternatives",
                description: "See materials that can replace petroleum-heavy products.",
                color: "#15803d",
                delay: "delay-300",
              },
            ].map((card) => (
              <div
                key={card.title}
                data-testid={`explainer-card-${card.title.toLowerCase().replace(/\s+/g, '-')}`}
                className={`card-lift bg-white rounded-2xl p-8 md:p-10 border animate-fade-up ${card.delay}`}
                style={{ borderColor: '#E5E5E5' }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: `${card.color}10`, color: card.color }}
                >
                  {card.icon}
                </div>
                <h3
                  className="text-xl font-semibold mb-3"
                  style={{ fontFamily: "'Playfair Display', serif", color: '#1D1D1F' }}
                >
                  {card.title}
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
                >
                  {card.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section
        data-testid="cta-section"
        className="py-24 md:py-32 px-6 md:px-12 lg:px-24"
      >
        <div className="max-w-7xl mx-auto">
          <div
            className="rounded-2xl p-12 md:p-16 text-center"
            style={{ backgroundColor: '#1D1D1F' }}
          >
            <h2
              className="text-3xl sm:text-4xl font-semibold mb-4 animate-fade-up"
              style={{ fontFamily: "'Playfair Display', serif", color: '#F5F5F7' }}
            >
              Explore the materials around you
            </h2>
            <p
              className="text-base mb-8 animate-fade-up delay-100 max-w-lg mx-auto"
              style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
            >
              Browse our growing library of materials and learn what makes each one unique.
            </p>
            <button
              data-testid="cta-explore-materials"
              onClick={() => navigate("/explore")}
              className="btn-pill btn-accent animate-fade-up delay-200"
            >
              Explore Materials
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
