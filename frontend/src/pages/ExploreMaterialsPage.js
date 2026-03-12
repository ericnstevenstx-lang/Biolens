import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Filter } from "lucide-react";
import axios from "axios";
import { getPetroloadLevel } from "@/lib/biolens";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CATEGORY_FILTERS = [
  { key: "all", label: "All" },
  { key: "petro-based", label: "Petro-Based" },
  { key: "plant-based", label: "Plant-Based" },
  { key: "transition", label: "Transition" },
  { key: "natural", label: "Natural" },
  { key: "mineral", label: "Mineral" },
];

const CATEGORY_CLASS = {
  "petro-based": "cat-petro",
  "plant-based": "cat-plant",
  "transition": "cat-transition",
  "natural": "cat-natural",
  "mineral": "cat-mineral",
  "mixed": "cat-mixed",
};

// Estimated petroload by category for display
const ESTIMATED_PETROLOAD = {
  "petro-based": 85,
  "plant-based": 10,
  "transition": 40,
  "natural": 8,
  "mineral": 15,
  "mixed": 45,
};

// Estimated health score by category
const ESTIMATED_HEALTH = {
  "petro-based": 35,
  "plant-based": 82,
  "transition": 55,
  "natural": 88,
  "mineral": 75,
  "mixed": 50,
};

export default function ExploreMaterialsPage() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const res = await axios.get(`${API}/materials`);
        setMaterials(res.data);
      } catch (err) {
        console.error("Failed to fetch materials", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, []);

  const filtered = activeFilter === "all" ? materials : materials.filter((m) => m.category === activeFilter);

  return (
    <div data-testid="explore-materials-page" className="pt-28 pb-24 px-6 md:px-12 lg:px-24 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-12 animate-fade-up">
          <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-4" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
            Material Library
          </h1>
          <p className="text-base leading-relaxed" style={{ color: '#6B7280' }}>
            Browse materials. Understand their petrochemical dependency, health scores, and classifications.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-10 flex flex-wrap gap-2 animate-fade-up delay-100">
          <Filter className="w-4 h-4 mr-1 mt-2" style={{ color: '#86868B' }} />
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.key}
              data-testid={`filter-${f.key}`}
              onClick={() => setActiveFilter(f.key)}
              className="px-4 py-2 rounded-full text-xs font-medium transition-all duration-200"
              style={{
                fontFamily: "'Inter', sans-serif",
                backgroundColor: activeFilter === f.key ? '#1D1D1F' : 'white',
                color: activeFilter === f.key ? '#F5F5F7' : '#1D1D1F',
                border: `1px solid ${activeFilter === f.key ? '#1D1D1F' : '#E5E5E5'}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div data-testid="materials-loading" className="mt-16 text-center">
            <div className="inline-block w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#E5E5E5', borderTopColor: '#B45309' }} />
          </div>
        )}

        {/* Grid */}
        {!loading && (
          <div data-testid="materials-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 animate-fade-up delay-200">
            {filtered.map((mat) => {
              const petroload = ESTIMATED_PETROLOAD[mat.category] || 50;
              const health = ESTIMATED_HEALTH[mat.category] || 50;
              const level = getPetroloadLevel(petroload);
              const healthColor = health >= 60 ? '#22C55E' : health >= 40 ? '#EAB308' : '#EF4444';

              return (
                <div
                  key={mat.slug}
                  data-testid={`material-card-${mat.slug}`}
                  className="card-lift bg-white rounded-2xl p-5 border cursor-pointer group"
                  style={{ borderColor: '#E5E5E5' }}
                  onClick={() => navigate(`/results?q=${encodeURIComponent(mat.name.toLowerCase())}`)}
                >
                  {/* Category badge */}
                  <span className={`category-badge ${CATEGORY_CLASS[mat.category] || 'cat-mixed'} mb-3 inline-block`}>
                    {mat.category_label}
                  </span>

                  {/* Material name */}
                  <h3 className="text-base font-bold mb-1.5" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
                    {mat.name}
                  </h3>

                  {/* Description */}
                  <p className="text-xs leading-relaxed mb-4 line-clamp-2" style={{ color: '#6B7280' }}>
                    {mat.description}
                  </p>

                  {/* Scores row */}
                  <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                    <div>
                      <p className="text-[0.6rem] font-medium uppercase tracking-wider" style={{ color: '#86868B' }}>Petroload</p>
                      <p className="text-lg font-extrabold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color: level.color }}>
                        {petroload}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[0.6rem] font-medium uppercase tracking-wider" style={{ color: '#86868B' }}>Health</p>
                      <p className="text-lg font-extrabold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color: healthColor }}>
                        {health}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" style={{ color: '#86868B' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="mt-16 text-center">
            <p className="text-sm" style={{ color: '#86868B' }}>No materials found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}
