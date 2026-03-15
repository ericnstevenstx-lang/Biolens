import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, AlertCircle, ShieldCheck, ShieldAlert, ShieldX,
  Leaf, Share2, ScanBarcode, CheckCircle2, HelpCircle, ExternalLink,
  Star, ArrowDown, ChevronDown, ChevronUp, Droplets, Zap, Recycle, Building2,
  Package, Box, ShoppingBag, Info, Sparkles, FlaskConical
} from "lucide-react";
import SearchBar from "@/components/SearchBar";
import PetroloadMeter from "@/components/PetroloadMeter";
import ShareCard from "@/components/ShareCard";
import PurchaseImpact from "@/components/PurchaseImpact";
import MaterialDNA from "@/components/MaterialDNA";
import {
  searchBioLens, 
  getConfidenceLabel, 
  getCategoryClass, 
  getRiskConfig,
  saveScanToHistory, 
  fetchAlternativeProducts, 
  fetchProductSources, 
  getPetroloadLevel,
  lookupProductByBarcode,
} from "@/lib/biolens";

const RISK_ICONS = { High: ShieldX, Medium: ShieldAlert, Low: ShieldCheck };

/* ═══════════════════════════════════════════════════════════════ */
/* ─── NEW ENHANCED COMPONENTS ──────────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════ */

/**
 * Confidence Banner - Shows analysis confidence with clear visual indicators
 */
function ConfidenceBanner({ confidenceLevel, analysisType, message, isInferred }) {
  if (!isInferred && confidenceLevel === 'high') return null; // Don't show for high-confidence curated data
  
  const configs = {
    high: {
      bg: 'rgba(34, 197, 94, 0.08)',
      border: 'rgba(34, 197, 94, 0.2)',
      color: '#22C55E',
      icon: CheckCircle2,
      title: 'High Confidence Analysis',
      description: 'Material composition verified from curated database or detailed product information.'
    },
    medium: {
      bg: 'rgba(59, 130, 246, 0.08)',
      border: 'rgba(59, 130, 246, 0.2)',
      color: '#3B82F6',
      icon: Info,
      title: 'Category-Based Analysis',
      description: 'Material profile estimated from typical products in this category.'
    },
    low: {
      bg: 'rgba(234, 179, 8, 0.08)',
      border: 'rgba(234, 179, 8, 0.2)',
      color: '#EAB308',
      icon: Sparkles,
      title: 'Estimated Material Profile',
      description: 'Analysis based on manufacturer and product category. Actual materials may vary.'
    }
  };

  const config = configs[confidenceLevel] || configs.low;
  const Icon = config.icon;

  return (
    <div 
      data-testid="confidence-banner"
      className="rounded-xl p-4 border animate-fade-up"
      style={{ backgroundColor: config.bg, borderColor: config.border }}
    >
      <div className="flex items-start gap-3">
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${config.color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color: config.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold mb-1" style={{ color: config.color }}>
            {config.title}
          </h4>
          <p className="text-xs leading-relaxed" style={{ color: '#4B5563' }}>
            {message || config.description}
          </p>
          {analysisType === 'category_inference' && (
            <p className="text-xs mt-2 italic" style={{ color: '#6B7280' }}>
              💡 For more accurate results, try searching for specific material names (e.g., "HDPE bottle", "polyester fabric")
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inferred Materials Breakdown - Shows likely materials with confidence indicators
 */
function InferredMaterialsBreakdown({ materials, estimatedPetroload, category }) {
  if (!materials || materials.length === 0) return null;

  return (
    <div 
      data-testid="inferred-materials-section"
      className="bg-white rounded-2xl p-6 md:p-8 border animate-fade-up"
      style={{ borderColor: '#E5E5E5' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <FlaskConical className="w-4 h-4" style={{ color: '#B45309' }} />
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em]" style={{ color: '#86868B' }}>
          Likely Material Composition
        </p>
      </div>
      
      <h3 className="text-base font-bold mb-4" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
        Typical Materials for {category?.replace(/_/g, ' ') || 'this product type'}
      </h3>

      <div className="space-y-4">
        {materials.map((material, idx) => {
          const petroLevel = getPetroloadLevel(material.petroloadScore || material.petroload);
          
          return (
            <div 
              key={idx}
              data-testid={`inferred-material-${idx}`}
              className="border rounded-xl p-4 hover:shadow-md transition-shadow"
              style={{ borderColor: '#E5E5E5' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold" style={{ color: '#1D1D1F' }}>
                      {material.name || material.material}
                    </h4>
                    {material.likelihood && (
                      <span 
                        className="px-2 py-0.5 rounded-full text-[0.6rem] font-semibold"
                        style={{ backgroundColor: `${petroLevel.color}12`, color: petroLevel.color }}
                      >
                        {Math.round(material.likelihood * 100)}% likely
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: '#86868B' }}>
                    {material.component}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-extrabold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color: petroLevel.color }}>
                    {material.petroloadScore || material.petroload}
                  </div>
                  <div className="text-[0.6rem] font-medium" style={{ color: '#86868B' }}>
                    Petroload
                  </div>
                </div>
              </div>

              <p className="text-xs leading-relaxed mb-3" style={{ color: '#4B5563' }}>
                {material.summary || material.description}
              </p>

              {/* Petroload bar */}
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                <div 
                  className="h-full rounded-full transition-all duration-700"
                  style={{ 
                    width: `${material.petroloadScore || material.petroload}%`, 
                    backgroundColor: petroLevel.color 
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall estimated score */}
      {estimatedPetroload && (
        <div 
          className="mt-5 pt-5 flex items-center justify-between"
          style={{ borderTop: '1px solid #F3F4F6' }}
        >
          <span className="text-xs font-medium" style={{ color: '#86868B' }}>
            Overall Estimated Petroload
          </span>
          <span 
            className="text-xl font-extrabold tabular-nums"
            style={{ 
              fontFamily: "'Manrope', sans-serif", 
              color: getPetroloadLevel(estimatedPetroload).color 
            }}
          >
            {estimatedPetroload}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Company Information Card - Shows manufacturer details and sustainability info
 */
function CompanyInfoCard({ companyInfo }) {
  if (!companyInfo) return null;

  const sustainabilityConfig = {
    'Good': { color: '#22C55E', bg: 'rgba(34, 197, 94, 0.08)', label: 'Strong Sustainability Efforts' },
    'Mixed': { color: '#EAB308', bg: 'rgba(234, 179, 8, 0.08)', label: 'Mixed Sustainability Record' },
    'Poor': { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.08)', label: 'Limited Sustainability Efforts' }
  };

  const sustainConfig = sustainabilityConfig[companyInfo.sustainability] || sustainabilityConfig.Mixed;

  return (
    <div 
      data-testid="company-info-card"
      className="bg-white rounded-2xl p-6 border animate-fade-up"
      style={{ borderColor: '#E5E5E5' }}
    >
      <div className="flex items-start gap-4">
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(180, 83, 9, 0.1)' }}
        >
          <Building2 className="w-6 h-6" style={{ color: '#B45309' }} />
        </div>
        
        <div className="flex-1">
          <h3 className="text-base font-bold mb-1" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
            {companyInfo.name}
          </h3>
          
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span 
              className="px-2.5 py-1 rounded-full text-xs font-medium"
              style={{ backgroundColor: '#F3F4F6', color: '#86868B' }}
            >
              {companyInfo.sector}
            </span>
            
            {companyInfo.categories && companyInfo.categories.length > 0 && (
              <span 
                className="px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ backgroundColor: 'rgba(180, 83, 9, 0.08)', color: '#B45309' }}
              >
                {companyInfo.categories[0]}
              </span>
            )}
          </div>

          <div 
            className="px-3 py-2 rounded-lg"
            style={{ backgroundColor: sustainConfig.bg }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: sustainConfig.color }}>
              {sustainConfig.label}
            </p>
            <p className="text-xs" style={{ color: '#6B7280' }}>
              {companyInfo.sustainability === 'Good' 
                ? 'This company has demonstrated commitment to sustainability initiatives and transparent reporting.'
                : companyInfo.sustainability === 'Mixed'
                ? 'This company has some sustainability efforts but significant room for improvement.'
                : 'This company lags behind industry leaders in sustainability practices and environmental transparency.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* ─── EXISTING COMPONENTS (Maintained) ────────────────────────── */
/* ═══════════════════════════════════════════════════════════════ */

function RiskSignalBar({ label, value, color }) {
  if (value == null) return null;
  return (
    <div data-testid={`risk-signal-${label.toLowerCase().replace(/\s+/g, '-')}`} className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium" style={{ color: '#1D1D1F' }}>{label}</span>
          <span className="text-xs font-bold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color }}>{value}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  );
}

function ComparisonBlock({ productName, result }) {
  const currentLevel = getPetroloadLevel(result.petroloadScore);
  const bestAlt = result.alternatives?.[0];
  if (!bestAlt) return null;

  const altPetro = bestAlt.materialClass === "Plant-Based" ? 12
    : bestAlt.materialClass === "Natural Material" ? 15
    : bestAlt.materialClass === "Transition Material" ? 35 : 20;
  const altLevel = getPetroloadLevel(altPetro);

  const isPetro = (result.materialClass || "").toLowerCase().includes("petro");
  const currentBullets = isPetro
    ? ["Fossil-derived synthetic fiber", "High petrochemical dependence", "High microplastic shedding risk"]
    : ["Partially processed material", "Moderate petrochemical input", "Environmental impact varies"];

  const altBullets = [
    `${bestAlt.materialClass || "Plant-based"} fiber system`,
    "Lower petrochemical dependence",
    "Lower synthetic microplastic risk",
    "More biodegradable",
  ];

  return (
    <div data-testid="comparison-card" className="bg-white rounded-2xl border overflow-hidden animate-fade-up" style={{ borderColor: '#E5E5E5' }}>
      <p className="px-6 pt-5 pb-0 text-[0.6rem] font-semibold uppercase tracking-[0.12em]" style={{ color: '#86868B' }}>
        This Product vs Better Option
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 relative">
        <div className="p-6" style={{ backgroundColor: `${currentLevel.color}04` }}>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: currentLevel.color }}>This Product</p>
          <p className="text-base font-extrabold mb-1" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
            {productName}
          </p>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-3xl font-extrabold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color: currentLevel.color }}>
              {result.petroloadScore ?? "—"}
            </span>
            <span className="text-[0.65rem] font-medium" style={{ color: '#86868B' }}>Petroload</span>
          </div>
          <ul className="space-y-1.5">
            {currentBullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#4B5563' }}>
                <span className="inline-block w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: currentLevel.color }} />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white border shadow-sm z-10" style={{ borderColor: '#E5E5E5' }}>
          <ArrowRight className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
        </div>
        <div className="md:hidden flex justify-center -my-3 relative z-10">
          <div className="w-7 h-7 rounded-full bg-white border shadow-sm flex items-center justify-center" style={{ borderColor: '#E5E5E5' }}>
            <ArrowDown className="w-3 h-3" style={{ color: '#22C55E' }} />
          </div>
        </div>

        <div className="p-6" style={{ backgroundColor: `${altLevel.color}04` }}>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: '#22C55E' }}>Better Option</p>
          <p className="text-base font-extrabold mb-1" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
            {bestAlt.name} {productName.split(' ').slice(-1)[0]}
          </p>
          <div className="flex items-baseline gap-1.5 mb-3">
            <span className="text-3xl font-extrabold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color: altLevel.color }}>
              {altPetro}
            </span>
            <span className="text-[0.65rem] font-medium" style={{ color: '#86868B' }}>Petroload</span>
          </div>
          <ul className="space-y-1.5">
            {altBullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-xs" style={{ color: '#4B5563' }}>
                <span className="inline-block w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: '#22C55E' }} />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function PlaceholderProductCard({ title, material, petroload }) {
  const level = getPetroloadLevel(petroload);
  return (
    <div className="card-lift rounded-xl border p-5" style={{ borderColor: '#E5E5E5' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="px-2 py-0.5 rounded-full text-[0.6rem] font-semibold" style={{ backgroundColor: `${level.color}12`, color: level.color }}>
          Petroload {petroload}
        </span>
        <Leaf className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
      </div>
      <p className="text-sm font-bold mb-0.5" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>{title}</p>
      <p className="text-xs" style={{ color: '#86868B' }}>Made with {material}</p>
    </div>
  );
}

function LiveProductCard({ product }) {
  const level = getPetroloadLevel(product.petroloadScore);
  return (
    <div data-testid={`product-card-${product.productId}`} className="card-lift rounded-xl border p-5" style={{ borderColor: '#E5E5E5' }}>
      <div className="flex items-center justify-between mb-3">
        <span className="px-2 py-0.5 rounded-full text-[0.6rem] font-semibold" style={{ backgroundColor: `${level.color}12`, color: level.color }}>
          Petroload {product.petroloadScore ?? '—'}%
        </span>
        {product.isFiberFoundry && <Star className="w-3.5 h-3.5" style={{ color: '#B45309' }} />}
      </div>
      <p className="text-sm font-bold mb-0.5" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>{product.title}</p>
      <p className="text-xs mb-1" style={{ color: '#86868B' }}>{product.brand}{product.alternativeMaterial ? ` - ${product.alternativeMaterial}` : ''}</p>
      {product.transparencyScore != null && (
        <p className="text-[0.65rem] mt-2" style={{ color: '#22C55E' }}>
          Transparency {Math.round(product.transparencyScore)}%{product.transparencyGrade ? ` (${product.transparencyGrade})` : ''}
        </p>
      )}
      {product.purchaseUrl && (
        <a href={product.purchaseUrl} target="_blank" rel="noopener noreferrer" data-testid={`buy-link-${product.productId}`}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: '#B45309' }}>
          View Product <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  );
}

function ScoringExplainer({ result, isInferred }) {
  const [open, setOpen] = useState(false);
  return (
    <div data-testid="scoring-explainer" className="bg-white rounded-2xl border animate-fade-up" style={{ borderColor: '#E5E5E5' }}>
      <button
        data-testid="scoring-explainer-toggle"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-6 text-left"
      >
        <h3 className="text-sm font-bold" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
          How BioLens Scored This
        </h3>
        {open ? <ChevronUp className="w-4 h-4" style={{ color: '#86868B' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#86868B' }} />}
      </button>
      {open && (
        <div className="px-6 pb-6 space-y-4" style={{ borderTop: '1px solid #F3F4F6' }}>
          <div className="pt-4">
            <p className="text-xs font-semibold mb-1" style={{ color: '#1D1D1F' }}>
              {isInferred ? 'Category-Based Inference' : 'Material Match'}
            </p>
            <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
              {isInferred 
                ? "Exact material data wasn't available, so BioLens estimated materials based on the product category and manufacturer patterns."
                : 'BioLens identifies the primary material by matching against our database of >120 classified materials and their known aliases.'
              }
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: '#1D1D1F' }}>Petrochemical Dependency</p>
            <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
              The Petroload score (0-100) estimates how dependent a material is on petroleum-derived feedstocks, processing chemicals, and fossil fuel energy inputs.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: '#1D1D1F' }}>Product Category Weighting</p>
            <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
              Scores are adjusted based on product category. Different product types use different material blends and processing requirements.
            </p>
          </div>
          {isInferred && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: '#1D1D1F' }}>Estimation Accuracy</p>
              <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
                Category-based estimates are typically 70-85% accurate for common product types. For precise analysis, search specific material names.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/* ─── MAIN RESULTS PAGE COMPONENT ─────────────────────────────── */
/* ═══════════════════════════════════════════════════════════════ */

export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const barcode = searchParams.get("barcode") || "";
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [altProducts, setAltProducts] = useState([]);
  const [altLoading, setAltLoading] = useState(false);
  const [productSources, setProductSources] = useState({});
  const [scannedProductData, setScannedProductData] = useState(null);

  useEffect(() => {
    if (!query && !barcode) return;
    
    const fetchResult = async () => {
      setLoading(true);
      setError(null);
      setResult(null);
      setAltProducts([]);
      setProductSources({});
      setScannedProductData(null);

      let effectiveQuery = query;

      try {
        // Step 1: Handle barcode lookup if present
        if (barcode && !query) {
          console.log('🔍 Processing barcode:', barcode);
          const barcodeResult = await lookupProductByBarcode(barcode);
          
          if (barcodeResult.success) {
            setScannedProductData(barcodeResult);
            effectiveQuery = barcodeResult.product.name;
            
            console.log('✅ Product resolved:', barcodeResult.product.name);
            console.log('📊 Confidence:', barcodeResult.confidenceLevel);
            console.log('🔬 Analysis type:', barcodeResult.inferredMaterials?.analysisType || 'direct');
            
            if (barcodeResult.companyInfo) {
              console.log('🏢 Company:', barcodeResult.companyInfo.name);
            }
          } else {
            setError(barcodeResult.message || "Product not found via barcode.");
            setLoading(false);
            return;
          }
        }

        // Step 2: Run material analysis on the effective query
        if (effectiveQuery) {
          const data = await searchBioLens(effectiveQuery);
          
          if (data) {
            // If we have inferred materials from barcode lookup, enhance the result
            if (scannedProductData?.isInferred && scannedProductData.inferredMaterials) {
              data.isInferred = true;
              data.inferredMaterials = scannedProductData.inferredMaterials;
              data.allMaterials = scannedProductData.materials;
            }
            
            setResult(data);
            saveScanToHistory(effectiveQuery, data);
            
            // Fetch alternative products
            setAltLoading(true);
            try {
              const products = await fetchAlternativeProducts(effectiveQuery, 6);
              setAltProducts(products);
              
              const nonFf = products.filter(p => !p.isFiberFoundry);
              if (nonFf.length > 0) {
                const srcResults = await Promise.all(
                  nonFf.map(p => fetchProductSources(p.productId).then(s => [p.productId, s]))
                );
                const srcMap = {};
                for (const [pid, srcs] of srcResults) { 
                  srcMap[pid] = srcs; 
                }
                setProductSources(srcMap);
              }
            } catch (e) { 
              console.error("Alt products fetch failed:", e); 
            } finally { 
              setAltLoading(false); 
            }
          }
        }
      } catch (err) {
        console.error("ResultsPage error:", err);
        setError(err.message || "Something went wrong.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchResult();
  }, [query, barcode]);

  // Empty state
  if (!query && !barcode) {
    return (
      <div className="pt-32 pb-24 px-6 md:px-12 lg:px-24 min-h-screen">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
            Search for a product
          </h1>
          <p className="mb-8 text-sm" style={{ color: '#86868B' }}>
            Enter a product name or scan a barcode to see its material classification and petroload.
          </p>
          <div className="flex justify-center"><SearchBar size="large" autoFocus /></div>
        </div>
      </div>
    );
  }

  // Display variables
  const productDisplayName = scannedProductData?.product?.name || 
                            (query ? query.charAt(0).toUpperCase() + query.slice(1) : 'Unknown Product');
  const materialClassification = result?.materialName || "";
  const companyInfo = scannedProductData?.companyInfo;
  const productBrand = scannedProductData?.product?.brand || companyInfo?.name || null;
  const productCategory = scannedProductData?.product?.category || companyInfo?.sector || null;
  const confidenceLevel = scannedProductData?.confidenceLevel || 'low';
  const inferredMaterials = scannedProductData?.inferredMaterials;
  const isInferred = result?.isInferred || scannedProductData?.isInferred || false;

  const riskConfig = result ? getRiskConfig(result.riskLevel) : null;
  const RiskIcon = result ? (RISK_ICONS[result.riskLevel] || ShieldCheck) : ShieldCheck;
  const categoryClass = result ? getCategoryClass(result.materialClass) : "cat-mixed";
  const confidenceLabel = result ? getConfidenceLabel(result.confidenceScore) : "";

  const ffProducts = altProducts.filter(p => p.isFiberFoundry);
  const externalProducts = altProducts.filter(p => !p.isFiberFoundry);
  const hasLiveProducts = ffProducts.length > 0 || externalProducts.length > 0;
  const displayProducts = ffProducts.length > 0 ? ffProducts : externalProducts.slice(0, 3);

  const riskSignals = result ? [
    { label: "Pesticide Risk", value: result.pesticideRisk, color: '#EF4444' },
    { label: "Synthetic Fertilizer", value: result.syntheticFertilizerRisk, color: '#F97316' },
    { label: "Processing Chemicals", value: result.processingChemicalRisk, color: '#B45309' },
    { label: "Herbicide Risk", value: result.herbicideRisk, color: '#9333EA' },
  ].filter(s => s.value != null) : [];

  const petroDep = result?.petroloadScore ?? null;
  const microplasticRisk = result?.petroloadScore != null ? Math.min(100, Math.round(result.petroloadScore * 0.85)) : null;
  const bioReplacement = result?.petroloadScore != null ? Math.max(0, 100 - result.petroloadScore) : null;

  const commonConcerns = result ? (() => {
    const cls = (result.materialClass || "").toLowerCase();
    if (cls.includes("petro")) return "Petroleum-derived materials depend on finite fossil fuel reserves, contribute to microplastic pollution through washing and wear, and persist in the environment for hundreds of years.";
    if (cls.includes("transition")) return "Semi-synthetic materials start from natural sources but undergo significant chemical processing. Environmental impact depends heavily on manufacturing practices.";
    if (cls.includes("plant") || cls.includes("natural")) return "While plant-based and natural materials have lower petrochemical dependency, they may still involve pesticides, water usage, or processing chemicals depending on cultivation methods.";
    return "Material impact varies based on sourcing, processing, and end-of-life disposal methods.";
  })() : "";

  const placeholderProducts = (result?.alternatives || []).slice(0, 3).map((alt, i) => ({
    title: `${alt.name} ${(scannedProductData?.product?.name || query).split(' ').slice(-1)[0] || 'Product'}`,
    material: alt.name,
    petroload: alt.materialClass === "Plant-Based" ? 10 + i * 2
      : alt.materialClass === "Natural Material" ? 12 + i * 3
      : 25 + i * 5,
  }));

  // Determine if this is a food product for packaging shortcuts
  const isFoodProduct = scannedProductData?.source === 'Open Food Facts' ||
                       /food|cereal|bread|snack|beverage|drink|yogurt|dairy/i.test(productCategory || '') ||
                       /bread|cereal|yogurt|milk|juice|soda|cola|chips/i.test(productDisplayName.toLowerCase());

  return (
    <div data-testid="results-page" className="pt-28 pb-24 px-6 md:px-12 lg:px-24 min-h-screen">
      <div className="max-w-3xl mx-auto">

        {/* Back + search */}
        <div className="mb-8 animate-fade-up">
          <button data-testid="back-button" onClick={() => navigate("/")}
            className="flex items-center gap-2 text-xs font-medium mb-5 transition-colors duration-200"
            style={{ color: '#86868B' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#1D1D1F'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#86868B'}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to search
          </button>
          <SearchBar size="small" initialQuery={query || productDisplayName} />
        </div>

        {/* Loading */}
        {loading && (
          <div data-testid="loading-state" className="mt-16 text-center">
            <div className="inline-block w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#E5E5E5', borderTopColor: '#B45309' }} />
            <p className="mt-4 text-xs" style={{ color: '#86868B' }}>
              {barcode ? 'Identifying product and analyzing materials...' : 'Analyzing product...'}
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div data-testid="error-state" className="mt-16 text-center">
            <AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: '#EF4444' }} />
            <p className="text-sm mb-2" style={{ color: '#EF4444' }}>{error}</p>
            {barcode && (
              <p className="text-xs mb-6" style={{ color: '#86868B' }}>
                Barcode: {barcode}
              </p>
            )}
            <button onClick={() => navigate("/")} className="btn-pill btn-secondary mt-6">Try another search</button>
          </div>
        )}

        {/* Product Found But Material Not Recognized */}
        {!result && !loading && !error && (query || barcode) && (
          <div data-testid="not-found-state" className="mt-16 animate-fade-up">
            <div className="bg-white rounded-2xl p-8 md:p-10 border text-center" style={{ borderColor: '#E5E5E5' }}>
              
              {scannedProductData ? (
                <>
                  <div className="flex flex-col items-center mb-8">
                    {scannedProductData.product?.image && (
                      <img 
                        src={scannedProductData.product.image} 
                        alt="Product" 
                        className="w-24 h-24 object-contain rounded-xl border border-gray-100 mb-4 bg-white shadow-sm"
                      />
                    )}
                    
                    <h2 className="text-2xl font-extrabold mb-3" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
                      {productDisplayName}
                    </h2>
                    
                    {productBrand && (
                      <div className="flex items-center gap-2 mb-4">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ backgroundColor: 'rgba(180, 83, 9, 0.1)' }}>
                          <Building2 className="w-3.5 h-3.5" style={{ color: '#B45309' }} />
                          <span className="text-sm font-semibold" style={{ color: '#B45309' }}>
                            {productBrand}
                          </span>
                        </div>
                        {productCategory && (
                          <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: '#F3F4F6', color: '#86868B' }}>
                            {productCategory}
                          </span>
                        )}
                      </div>
                    )}

                    {barcode && (
                      <div className="flex items-center gap-2 text-xs mb-6" style={{ color: '#86868B' }}>
                        <ScanBarcode className="w-3.5 h-3.5" />
                        <span>
                          Barcode: {barcode}
                          {scannedProductData.source && (
                            <span className="ml-2" style={{ color: '#22C55E' }}>• {scannedProductData.source}</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-6 rounded-xl mb-8 text-left" style={{ backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE' }}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#3B82F6' }}>
                        <Info className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-2" style={{ color: '#1E40AF' }}>
                          Product Identified Successfully
                        </h3>
                        <p className="text-sm mb-4" style={{ color: '#1E3A8A' }}>
                          We found your product, but BioLens analyzes <strong>materials</strong> (textiles, plastics, packaging) rather than {isFoodProduct ? 'food items themselves' : 'this product type'}. {isFoodProduct ? 'However, we can analyze the packaging materials for this product.' : 'Try searching for the specific materials used.'}
                        </p>
                        <p className="text-xs" style={{ color: '#3730A3' }}>
                          💡 <strong>Tip:</strong> {isFoodProduct ? 'Scan packaging materials or textile products for complete environmental analysis.' : 'Search for specific material names like "HDPE bottle" or "polyester fabric" for detailed analysis.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {isFoodProduct && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                      <button
                        onClick={() => navigate('/results?q=plastic+packaging')}
                        className="flex flex-col items-center gap-3 p-5 rounded-xl border transition-all hover:border-red-500 hover:bg-red-50 bg-white"
                        style={{ borderColor: '#E5E5E5' }}
                      >
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                          <Package className="w-6 h-6" style={{ color: '#EF4444' }} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold mb-1" style={{ color: '#1D1D1F' }}>Plastic Wrapper</p>
                          <p className="text-xs" style={{ color: '#86868B' }}>Analyze bag/wrapper material</p>
                        </div>
                      </button>

                      <button
                        onClick={() => navigate('/results?q=cardboard+box')}
                        className="flex flex-col items-center gap-3 p-5 rounded-xl border transition-all hover:border-green-500 hover:bg-green-50 bg-white"
                        style={{ borderColor: '#E5E5E5' }}
                      >
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                          <Box className="w-6 h-6" style={{ color: '#22C55E' }} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold mb-1" style={{ color: '#1D1D1F' }}>Cardboard Box</p>
                          <p className="text-xs" style={{ color: '#86868B' }}>Analyze container material</p>
                        </div>
                      </button>

                      <button
                        onClick={() => navigate('/results?q=paper+bag')}
                        className="flex flex-col items-center gap-3 p-5 rounded-xl border transition-all hover:border-orange-500 hover:bg-orange-50 bg-white"
                        style={{ borderColor: '#E5E5E5' }}
                      >
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'rgba(180, 83, 9, 0.1)' }}>
                          <ShoppingBag className="w-6 h-6" style={{ color: '#B45309' }} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-bold mb-1" style={{ color: '#1D1D1F' }}>Paper Bag</p>
                          <p className="text-xs" style={{ color: '#86868B' }}>Analyze paper material</p>
                        </div>
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <AlertCircle className="w-10 h-10 mx-auto mb-4" style={{ color: '#86868B' }} />
                  <h2 className="text-xl font-bold mb-3" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
                    Material not recognized
                  </h2>
                  <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: '#86868B' }}>
                    We couldn't identify the primary material for "<strong style={{ color: '#1D1D1F' }}>{productDisplayName}</strong>".
                  </p>
                </>
              )}

              <button data-testid="explore-materials-fallback" onClick={() => navigate("/explore")} className="btn-pill btn-secondary">
                Browse Materials <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════ MATERIAL ANALYSIS RESULTS ═══════════════ */}
        {result && !loading && (
          <div data-testid="result-found" className="mt-2 space-y-5">

            {/* Confidence Level Banner */}
            {(isInferred || confidenceLevel !== 'high') && (
              <ConfidenceBanner 
                confidenceLevel={confidenceLevel}
                analysisType={inferredMaterials?.analysisType}
                message={inferredMaterials?.message}
                isInferred={isInferred}
              />
            )}

            {/* Enhanced Product Header */}
            <div className="bg-white rounded-2xl p-6 md:p-8 border animate-fade-up" style={{ borderColor: '#E5E5E5' }}>
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: '#86868B' }}>
                    {barcode ? 'Scanned Product' : 'Product Searched'}
                  </p>
                  
                  <div className="flex items-start gap-4">
                    {scannedProductData?.product?.image && (
                      <img 
                        src={scannedProductData.product.image} 
                        alt="Product" 
                        className="w-16 h-16 object-contain rounded-lg border border-gray-100 bg-white hidden sm:block"
                      />
                    )}
                    
                    <div>
                      <h2 data-testid="result-product-name" className="text-xl md:text-2xl font-extrabold" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
                        {productDisplayName}
                      </h2>

                      {(companyInfo || productBrand) && (
                        <div className="flex flex-wrap items-center gap-2 mt-2 mb-2">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(180, 83, 9, 0.1)' }}>
                            <Building2 className="w-3 h-3" style={{ color: '#B45309' }} />
                            <span className="text-xs font-semibold" style={{ color: '#B45309' }}>
                              {companyInfo?.name || productBrand}
                            </span>
                          </div>
                          {(companyInfo?.sector || productCategory) && (
                            <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: '#F3F4F6', color: '#86868B' }}>
                              {companyInfo?.sector || productCategory}
                            </span>
                          )}
                        </div>
                      )}

                      {materialClassification && materialClassification.toLowerCase() !== productDisplayName.toLowerCase() && (
                        <p className="text-xs mt-0.5" style={{ color: '#86868B' }}>
                          Material: <span style={{ color: '#1D1D1F', fontWeight: 600 }}>{materialClassification}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <button data-testid="share-scan-button" onClick={() => setShowShare(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.65rem] font-medium border transition-colors duration-200"
                  style={{ color: '#1D1D1F', borderColor: '#E5E5E5', flexShrink: 0 }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#B45309'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#E5E5E5'}
                >
                  <Share2 className="w-3 h-3" /> Share
                </button>
              </div>

              {barcode && (
                <div className="flex items-center gap-2 mt-4 pt-3" style={{ borderTop: '1px solid #F3F4F6' }}>
                  <ScanBarcode className="w-3.5 h-3.5" style={{ color: '#86868B' }} />
                  <span className="text-[0.65rem]" style={{ color: '#86868B' }}>
                    Barcode: {barcode}
                    {scannedProductData?.source && (
                      <span className="ml-2" style={{ color: '#22C55E' }}>• {scannedProductData.source}</span>
                    )}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {isInferred ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                    <FlaskConical className="w-3.5 h-3.5" /> Category-Based Analysis
                  </span>
                ) : (
                  <span data-testid="result-category-badge" className={`category-badge ${categoryClass}`}>{result.materialClass}</span>
                )}
                
                {riskConfig && (
                  <span data-testid="result-risk-badge" className={`risk-badge ${riskConfig.className}`} style={{ padding: '4px 12px', fontSize: '0.7rem' }}>
                    <RiskIcon className="w-3.5 h-3.5" /> {riskConfig.label}
                  </span>
                )}
                
                <span data-testid="result-confidence-badge" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[0.65rem] font-medium"
                  style={{ backgroundColor: confidenceLabel === "High Confidence" ? 'rgba(34,197,94,0.08)' : '#F3F4F6', color: confidenceLabel === "High Confidence" ? '#22C55E' : '#86868B' }}
                >
                  {confidenceLabel === "High Confidence" || confidenceLabel === "Moderate Confidence" ? <CheckCircle2 className="w-3 h-3" /> : <HelpCircle className="w-3 h-3" />}
                  {confidenceLabel}
                </span>
              </div>
            </div>

            {/* Company Information Card */}
            {companyInfo && <CompanyInfoCard companyInfo={companyInfo} />}

            {/* Inferred Materials Breakdown */}
            {isInferred && result.allMaterials && (
              <InferredMaterialsBreakdown 
                materials={result.allMaterials}
                estimatedPetroload={inferredMaterials?.estimatedPetroload}
                category={inferredMaterials?.category}
              />
            )}

            {/* Petroload Score Panel */}
            <div className="bg-white rounded-2xl p-6 md:p-8 border animate-fade-up delay-100" style={{ borderColor: '#E5E5E5' }}>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: '#86868B' }}>
                {isInferred ? 'Estimated Petroload Score' : 'Petroload Score'}
              </p>
              <div className="flex justify-center mb-2">
                <PetroloadMeter score={result.petroloadScore} size="large" />
              </div>
              <p className="text-xs text-center font-medium mb-6" style={{ color: '#86868B' }}>
                {result.petroloadScore != null && result.petroloadScore >= 75 ? 'Very High Petrochemical Dependence'
                  : result.petroloadScore >= 50 ? 'High Petrochemical Dependence'
                  : result.petroloadScore >= 25 ? 'Moderate Petrochemical Dependence'
                  : 'Low Petrochemical Dependence'}
              </p>

              <div className="grid grid-cols-3 gap-4 pt-5" style={{ borderTop: '1px solid #F3F4F6' }}>
                {[
                  { label: "Petro Dependence", value: petroDep, icon: <Zap className="w-3.5 h-3.5" />, color: '#EF4444' },
                  { label: "Microplastic Risk", value: microplasticRisk, icon: <Droplets className="w-3.5 h-3.5" />, color: '#F97316' },
                  { label: "Bio-Replacement", value: bioReplacement, icon: <Recycle className="w-3.5 h-3.5" />, color: '#22C55E' },
                ].map((m) => m.value != null && (
                  <div key={m.label} data-testid={`metric-${m.label.toLowerCase().replace(/\s+/g, '-')}`} className="text-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5" style={{ backgroundColor: `${m.color}10`, color: m.color }}>
                      {m.icon}
                    </div>
                    <p className="text-lg font-extrabold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color: m.color }}>
                      {m.value}
                    </p>
                    <p className="text-[0.55rem] font-medium uppercase tracking-wider mt-0.5" style={{ color: '#86868B' }}>{m.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Material DNA (for non-inferred materials) */}
            {!isInferred && (
              <div data-testid="material-dna-section" className="bg-white rounded-2xl p-6 md:p-8 border animate-fade-up delay-200" style={{ borderColor: '#E5E5E5' }}>
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-5" style={{ color: '#86868B' }}>Material DNA</p>
                <MaterialDNA result={result} />
              </div>
            )}

            {/* Comparison Block */}
            {result.alternatives && result.alternatives.length > 0 && (
              <ComparisonBlock productName={productDisplayName} result={result} />
            )}

            {/* Material Analysis */}
            <div className="bg-white rounded-2xl p-6 md:p-8 border animate-fade-up" style={{ borderColor: '#E5E5E5' }}>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: '#86868B' }}>
                {isInferred ? 'Primary Material Identified' : 'Material Identified'}
              </p>
              <h3 data-testid="result-material-name" className="text-lg font-extrabold mb-2" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
                {result.materialName}
              </h3>

              <div className="mb-4">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: '#86868B' }}>Why It Matters</p>
                <p data-testid="result-explanation" className="text-sm leading-relaxed" style={{ color: '#4B5563' }}>
                  {result.explanation}
                </p>
              </div>

              {commonConcerns && (
                <div className="mb-4">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: '#86868B' }}>Common Concerns</p>
                  <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
                    {commonConcerns}
                  </p>
                </div>
              )}

              {result.healthScore != null && (
                <div className="mb-5 pb-5" style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium" style={{ color: '#86868B' }}>Material Health Score</span>
                    <span data-testid="health-score-value" className="text-sm font-bold tabular-nums" style={{ fontFamily: "'Manrope', sans-serif", color: result.healthScore >= 60 ? '#22C55E' : result.healthScore >= 40 ? '#EAB308' : '#EF4444' }}>
                      {result.healthScore}/100
                    </span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                    <div data-testid="health-score-bar" className="h-full rounded-full" style={{ width: `${result.healthScore}%`, backgroundColor: result.healthScore >= 60 ? '#22C55E' : result.healthScore >= 40 ? '#EAB308' : '#EF4444', transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              )}

              {riskSignals.length > 0 && (
                <div data-testid="risk-signals-section">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: '#86868B' }}>Risk Signals</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {riskSignals.map(s => <RiskSignalBar key={s.label} {...s} />)}
                  </div>
                </div>
              )}
            </div>

            {/* Better Material Paths */}
            {result.alternatives && result.alternatives.length > 0 && (
              <div data-testid="alternatives-section" className="bg-white rounded-2xl p-6 md:p-8 border animate-fade-up" style={{ borderColor: '#E5E5E5' }}>
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: '#86868B' }}>
                  Replace {result.materialName} With
                </p>
                <div className="flex items-center gap-2 mb-5">
                  <Leaf className="w-4 h-4" style={{ color: '#22C55E' }} />
                  <h3 className="text-base font-bold" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>Better Material Paths</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {result.alternatives.slice(0, 3).map((alt, idx) => (
                    <div key={`${alt.name}-${idx}`} data-testid={`alternative-${alt.name.toLowerCase().replace(/\s+/g, '-')}`}
                      className="card-lift rounded-xl p-4 border" style={{ borderColor: '#E5E5E5' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-bold text-sm" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>{alt.name}</p>
                          {alt.materialClass && <p className="text-[0.65rem] mt-0.5" style={{ color: '#22C55E' }}>{alt.materialClass}</p>}
                          {alt.reason && <p className="text-xs mt-1.5 leading-relaxed" style={{ color: '#86868B' }}>{alt.reason}</p>}
                        </div>
                        <Leaf className="w-3.5 h-3.5 flex-shrink-0 ml-2" style={{ color: '#22C55E' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Better Product Examples */}
            <div data-testid="where-to-buy-section" className="bg-white rounded-2xl p-6 md:p-8 border animate-fade-up" style={{ borderColor: '#E5E5E5' }}>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: '#86868B' }}>Curated Examples</p>
              <h3 className="text-base font-bold mb-5" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>Better Product Examples</h3>

              {altLoading ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#E5E5E5', borderTopColor: '#B45309' }} />
                </div>
              ) : hasLiveProducts ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {displayProducts.map(p => <LiveProductCard key={p.productId} product={p} />)}
                  </div>
                  <p className="mt-4 text-[0.65rem] text-center" style={{ color: '#86868B' }}>
                    Available on FiberFoundry (coming soon)
                  </p>
                </>
              ) : placeholderProducts.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {placeholderProducts.map((p, i) => <PlaceholderProductCard key={i} {...p} />)}
                  </div>
                  <p className="mt-4 text-[0.65rem] text-center" style={{ color: '#86868B' }}>
                    Available on FiberFoundry (coming soon)
                  </p>
                </>
              ) : null}
            </div>

            {/* How BioLens Scored This */}
            <ScoringExplainer result={result} isInferred={isInferred} />

            {/* Purchase Impact */}
            <PurchaseImpact result={result} />

            {/* No alternatives — good material */}
            {result.alternatives && result.alternatives.length === 0 && (
              <div data-testid="no-alternatives-section" className="bg-white rounded-2xl p-6 md:p-8 border animate-fade-up" style={{ borderColor: '#E5E5E5' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(34,197,94,0.1)' }}>
                    <ShieldCheck className="w-4.5 h-4.5" style={{ color: '#22C55E' }} />
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>This is already a great material choice</p>
                    <p className="text-xs mt-0.5" style={{ color: '#86868B' }}>{result.materialName} is a responsible material. Keep choosing products like this.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {showShare && result && <ShareCard result={result} query={productDisplayName} onClose={() => setShowShare(false)} />}
      </div>
    </div>
  );
}
