import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, ScanBarcode, ArrowRight, Leaf, ShieldAlert, 
  Database, Flag, Layers, Zap, Clock, ChevronRight 
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import BarcodeScanner from "@/components/BarcodeScanner";

export default function HomePage() {
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('biolens_recent_scans') || '[]');
      setRecentScans(stored.slice(0, 1)); // Show most recent scan
    } catch (e) {
      console.error('Failed to load recent scans:', e);
    }
  }, []);

  // ✅ ONLY NEW ADDITION: Barcode scanner integration
  const handleBarcodeScan = (barcode) => {
    console.log("📸 Scanned barcode:", barcode);
    setShowScanner(false);
    navigate(`/results?barcode=${encodeURIComponent(barcode)}`);
  };

  const quickSearches = [
    "polyester hoodie",
    "bamboo sheets", 
    "pet bottle",
    "cotton t-shirt",
    "nylon rope",
    "paper bag",
    "hemp shirt"
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F5F5F7' }}>
      
      {/* ═══ Hero Section ═══ */}
      <div className="pt-32 pb-20 px-6 md:px-12 lg:px-24">
        <div className="max-w-4xl mx-auto">
          {/* Main Headline */}
          <h1 
            className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-[1.1]"
            style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}
          >
            See what your products<br />
            are <span style={{ color: '#B45309' }}>really</span> made of.
          </h1>
          
          {/* Subtitle */}
          <p 
            className="text-lg md:text-xl mb-10 max-w-2xl"
            style={{ color: '#86868B' }}
          >
            Search or scan everyday products to uncover petrochemical dependency, 
            material classification, and better alternatives.
          </p>

          {/* Search Bar */}
          <div className="mb-6">
            <SearchBar size="large" placeholder='Try "plastic cutting board"' />
          </div>

          {/* Scan Product Button */}
          <button
            onClick={() => setShowScanner(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-white transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg mb-8"
            style={{ backgroundColor: '#B45309' }}
          >
            <ScanBarcode className="w-5 h-5" />
            Scan Product
          </button>

          {/* Quick Search Tags */}
          <div className="mb-16">
            <div className="flex flex-wrap gap-2 justify-start">
              {quickSearches.map((term, idx) => (
                <button
                  key={idx}
                  onClick={() => navigate(`/results?q=${encodeURIComponent(term)}`)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105"
                  style={{ 
                    backgroundColor: 'white',
                    color: '#1D1D1F',
                    border: '1px solid #E5E5E5'
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Featured Example Scan ═══ */}
      <div className="pb-12 px-6 md:px-12 lg:px-24">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: '#86868B' }}>
            Featured Scan
          </p>
          
          {/* Polyester Hoodie Card */}
          <div 
            className="bg-white rounded-3xl p-8 border shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden"
            style={{ borderColor: '#E5E5E5' }}
          >
            {/* Background Icon */}
            <div className="absolute top-6 right-6 opacity-5">
              <Zap className="w-24 h-24" style={{ color: '#EF4444' }} />
            </div>
            
            <div className="relative z-10">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#86868B' }}>
                    Petro-Based
                  </p>
                  <h3 
                    className="text-2xl font-extrabold mb-2"
                    style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}
                  >
                    Polyester Hoodie
                  </h3>
                  <p className="text-sm mb-4" style={{ color: '#86868B' }}>
                    Material: Polyester
                  </p>
                  
                  {/* Badge */}
                  <div className="flex items-center gap-2 mb-4">
                    <span 
                      className="px-3 py-1 rounded-full text-xs font-bold"
                      style={{ 
                        backgroundColor: '#EF444412',
                        color: '#EF4444'
                      }}
                    >
                      Petro-Based
                    </span>
                  </div>
                  
                  {/* Better Option */}
                  <div className="pt-4 border-t" style={{ borderColor: '#F3F4F6' }}>
                    <p className="text-xs" style={{ color: '#86868B' }}>
                      Better Option: <span className="font-semibold" style={{ color: '#22C55E' }}>Hemp</span>
                    </p>
                  </div>
                </div>
                
                {/* Large Score */}
                <div className="text-right">
                  <div 
                    className="text-6xl font-extrabold tabular-nums"
                    style={{ 
                      fontFamily: "'Manrope', sans-serif",
                      color: '#EF4444'
                    }}
                  >
                    95
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#86868B' }}>
                    PETROLOAD
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Stats Section ═══ */}
      <div className="pb-12 px-6 md:px-12 lg:px-24">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Products Analyzed */}
            <div className="bg-white rounded-2xl p-6 text-center border" style={{ borderColor: '#E5E5E5' }}>
              <div className="flex items-center justify-center mb-3">
                <Search className="w-6 h-6" style={{ color: '#B45309' }} />
              </div>
              <p className="text-3xl font-extrabold mb-1" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
                2,100+
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#86868B' }}>
                Products Analyzed
              </p>
            </div>

            {/* Materials Mapped */}
            <div className="bg-white rounded-2xl p-6 text-center border" style={{ borderColor: '#E5E5E5' }}>
              <div className="flex items-center justify-center mb-3">
                <Layers className="w-6 h-6" style={{ color: '#22C55E' }} />
              </div>
              <p className="text-3xl font-extrabold mb-1" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
                120+
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#86868B' }}>
                Materials Mapped
              </p>
            </div>

            {/* Scans Performed */}
            <div className="bg-white rounded-2xl p-6 text-center border" style={{ borderColor: '#E5E5E5' }}>
              <div className="flex items-center justify-center mb-3">
                <Flag className="w-6 h-6" style={{ color: '#3B82F6' }} />
              </div>
              <p className="text-3xl font-extrabold mb-1" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
                1,640+
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#86868B' }}>
                Scans Performed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Recent Scans ═══ */}
      {recentScans.length > 0 && (
        <div className="pb-16 px-6 md:px-12 lg:px-24">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" style={{ color: '#86868B' }} />
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#86868B' }}>
                  Recent Scans
                </p>
              </div>
              <button 
                onClick={() => {
                  localStorage.removeItem('biolens_recent_scans');
                  setRecentScans([]);
                }}
                className="text-xs font-semibold" 
                style={{ color: '#B45309' }}
              >
                Clear
              </button>
            </div>

            <div className="bg-white rounded-2xl p-6 border" style={{ borderColor: '#E5E5E5' }}>
              <button
                onClick={() => navigate(`/results?q=${encodeURIComponent(recentScans[0].query)}`)}
                className="w-full text-left group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#22C55E' }}>
                      {recentScans[0].materialClass || 'Material'}
                    </p>
                    <p className="text-base font-bold mb-1" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
                      {recentScans[0].query.charAt(0).toUpperCase() + recentScans[0].query.slice(1)}
                    </p>
                    <p className="text-xs" style={{ color: '#86868B' }}>
                      {recentScans[0].materialName || 'Unknown Material'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-extrabold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color: '#EF4444' }}>
                        {recentScans[0].petroloadScore || 0}
                      </p>
                      <p className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: '#86868B' }}>
                        Recent
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" style={{ color: '#86868B' }} />
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ How BioLens Works ═══ */}
      <div className="pb-16 px-6 md:px-12 lg:px-24">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h2 
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: '#86868B' }}
          >
            How BioLens Works
          </h2>
        </div>

        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#B4530912' }}>
              <Search className="w-8 h-8" style={{ color: '#B45309' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
              Search or Scan
            </h3>
            <p className="text-sm" style={{ color: '#86868B' }}>
              Enter a product name or scan its barcode
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#22C55E12' }}>
              <Layers className="w-8 h-8" style={{ color: '#22C55E' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
              Identify Material
            </h3>
            <p className="text-sm" style={{ color: '#86868B' }}>
              We match it to our library of materials and compounds
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#EF444412' }}>
              <ShieldAlert className="w-8 h-8" style={{ color: '#EF4444' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
              Score Dependence
            </h3>
            <p className="text-sm" style={{ color: '#86868B' }}>
              Petrochemical dependency scored 0-100
            </p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#3B82F612' }}>
              <Leaf className="w-8 h-8" style={{ color: '#3B82F6' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
              Better Alternatives
            </h3>
            <p className="text-sm" style={{ color: '#86868B' }}>
              We suggest similar products with lower impact
            </p>
          </div>
        </div>
      </div>

      {/* ═══ Explore Materials CTA ═══ */}
      <div className="pb-24 px-6 md:px-12 lg:px-24">
        <div className="max-w-4xl mx-auto">
          <div 
            className="rounded-3xl p-12 text-center"
            style={{ backgroundColor: '#1D1D1F' }}
          >
            <h2 
              className="text-3xl md:text-4xl font-extrabold mb-4"
              style={{ fontFamily: "'Manrope', sans-serif", color: 'white' }}
            >
              Explore the materials around you
            </h2>
            <p className="text-lg mb-8" style={{ color: '#86868B' }}>
              Browse our growing library of materials and learn what makes each one unique.
            </p>
            <button
              onClick={() => navigate('/explore')}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-white transition-all duration-200 hover:scale-105"
              style={{ backgroundColor: '#B45309' }}
            >
              Explore Materials
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* ═══ Barcode Scanner Modal ═══ */}
      {showScanner && (
        <BarcodeScanner 
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
