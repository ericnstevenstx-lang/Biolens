import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Camera, Leaf, Shield, TrendingUp, Clock, ChevronRight, Sparkles } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import BarcodeScanner from "@/components/BarcodeScanner";

export default function HomePage() {
  const navigate = useNavigate();
  const [showScanner, setShowScanner] = useState(false);
  const [recentScans, setRecentScans] = useState([]);

  useEffect(() => {
    // Load recent scans from localStorage
    try {
      const stored = JSON.parse(localStorage.getItem('biolens_recent_scans') || '[]');
      setRecentScans(stored.slice(0, 6));
    } catch (e) {
      console.error('Failed to load recent scans:', e);
    }
  }, []);

  // ✅ CRITICAL: Barcode scan handler with navigation
  const handleBarcodeScan = async (barcode) => {
    console.log("📸 Scanned barcode:", barcode);
    setShowScanner(false);
    navigate(`/results?barcode=${encodeURIComponent(barcode)}`);
  };

  const features = [
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Material Intelligence",
      description: "Instant classification of 120+ materials with petrochemical dependency scoring",
      color: "#22C55E"
    },
    {
      icon: <Leaf className="w-6 h-6" />,
      title: "Better Alternatives",
      description: "Science-backed recommendations for lower-impact material choices",
      color: "#B45309"
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Impact Tracking",
      description: "Understand the environmental footprint of your material decisions",
      color: "#3B82F6"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="pt-32 pb-16 px-6 md:px-12 lg:px-24">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium mb-6">
            <Sparkles className="w-3 h-3" />
            <span>AI-Powered Material Intelligence</span>
          </div>
          
          <h1 
            className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight"
            style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}
          >
            Know What's In
            <br />
            <span style={{ color: '#B45309' }}>Your Products</span>
          </h1>
          
          <p 
            className="text-lg md:text-xl mb-12 max-w-2xl mx-auto leading-relaxed"
            style={{ color: '#86868B' }}
          >
            BioLens reveals the hidden material story behind everyday products. 
            Search by name or scan barcodes to discover petrochemical dependencies 
            and find better alternatives.
          </p>

          {/* Search + Scanner Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <div className="w-full sm:flex-1 max-w-xl">
              <SearchBar size="large" autoFocus />
            </div>
            
            {/* Scanner Button */}
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all duration-200 hover:scale-105 active:scale-95 shadow-lg"
              style={{ 
                backgroundColor: '#B45309', 
                color: 'white',
                border: 'none'
              }}
              aria-label="Open barcode scanner"
            >
              <Camera className="w-5 h-5" />
              <span className="font-semibold">Scan Barcode</span>
            </button>
          </div>

          <p className="text-sm" style={{ color: '#86868B' }}>
            Try searching: "polyester shirt", "cotton t-shirt", or scan any product barcode
          </p>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="pb-16 px-6 md:px-12 lg:px-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 border transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                style={{ borderColor: '#E5E5E5' }}
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${feature.color}10`, color: feature.color }}
                >
                  {feature.icon}
                </div>
                <h3 
                  className="text-lg font-bold mb-2"
                  style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}
                >
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#86868B' }}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Scans Section */}
      {recentScans.length > 0 && (
        <div className="pb-24 px-6 md:px-12 lg:px-24">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-5 h-5" style={{ color: '#B45309' }} />
              <h2 
                className="text-2xl font-bold"
                style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}
              >
                Recent Scans
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentScans.map((scan, index) => (
                <button
                  key={index}
                  onClick={() => navigate(`/results?q=${encodeURIComponent(scan.query)}`)}
                  className="bg-white rounded-xl p-5 border text-left transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group"
                  style={{ borderColor: '#E5E5E5' }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p 
                        className="font-bold text-sm mb-1"
                        style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}
                      >
                        {scan.query.charAt(0).toUpperCase() + scan.query.slice(1)}
                      </p>
                      {scan.materialName && (
                        <p className="text-xs" style={{ color: '#86868B' }}>
                          {scan.materialName}
                        </p>
                      )}
                    </div>
                    <ChevronRight 
                      className="w-4 h-4 transition-transform group-hover:translate-x-1" 
                      style={{ color: '#B45309' }} 
                    />
                  </div>
                  
                  {scan.petroloadScore != null && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: '#F3F4F6' }}>
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${scan.petroloadScore}%`,
                            backgroundColor: scan.petroloadScore >= 75 ? '#EF4444' 
                              : scan.petroloadScore >= 50 ? '#F97316'
                              : scan.petroloadScore >= 25 ? '#EAB308' 
                              : '#22C55E'
                          }}
                        />
                      </div>
                      <span 
                        className="text-xs font-bold tabular-nums"
                        style={{ 
                          fontFamily: "'Manrope', sans-serif",
                          color: scan.petroloadScore >= 75 ? '#EF4444' 
                            : scan.petroloadScore >= 50 ? '#F97316'
                            : scan.petroloadScore >= 25 ? '#EAB308' 
                            : '#22C55E'
                        }}
                      >
                        {scan.petroloadScore}
                      </span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner 
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
