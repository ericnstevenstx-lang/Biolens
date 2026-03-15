import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, AlertCircle, ShieldCheck, ShieldAlert, ShieldX,
  Leaf, Share2, ScanBarcode, CheckCircle2, HelpCircle, ExternalLink,
  Star, ArrowDown, ChevronDown, ChevronUp, Droplets, Zap, Recycle, Building2,
  Package, Box, ShoppingBag,
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

/* ─── Risk Signal Bar ──────────────────────── */
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

/* ─── Comparison Block with Enhanced Product Name Handling ──────── */
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

/* ─── Product Cards ──────────────────────── */
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

/* ─── How BioLens Scored This (expandable) ── */
function ScoringExplainer({ result }) {
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
            <p className="text-xs font-semibold mb-1" style={{ color: '#1D1D1F' }}>Material Match</p>
            <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
              BioLens identifies the primary material in your product by matching it against our database of {'>'}120 classified materials and their known aliases.
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
              Scores are adjusted based on the product category. Apparel, home textiles, and industrial materials are weighted differently based on typical material blends and processing requirements.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: '#1D1D1F' }}>Replacement Pathway</p>
            <p className="text-xs leading-relaxed" style={{ color: '#6B7280' }}>
              Alternatives are suggested based on functional equivalence. We recommend materials that can serve the same purpose with lower petrochemical dependence.
              {result?.materialName === "Bamboo Viscose" && " Note: Bamboo apparel is treated as semi-synthetic unless verified mechanically processed."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════ */
/* ─── Main Results Page ──────────────────── */
/* ════════════════════════════════════════════ */
export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const barcode = searchParams.get("barcode") || ""; // ✅ CRITICAL: Read barcode parameter
  const navigate = useNavigate();

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showShare, setShowShare] = useState(false);
  const [altProducts, setAltProducts] = useState([]);
  const [altLoading, setAltLoading] = useState(false);
  const [productSources, setProductSources] = useState({});
  const [scannedProductData, setScannedProductData] = useState(null); // ✅ Store barcode results

  // ✅ ENHANCED: Complete barcode and material analysis logic
  useEffect(() => {
    if (!query && !barcode) return; // ✅ Check both parameters
    
    const fetchResult = async () => {
      setLoading(true);
      setError(null);
      setResult(null);
      setAltProducts([]);
      setProductSources({});
      setScannedProductData(null);

      let effectiveQuery = query;
      let productData = null;

      try {
        // ✅ Step 1: Handle barcode lookup first if barcode parameter exists
        if (barcode && !query) {
          console.log('🔍 Processing barcode parameter:', barcode);
          const barcodeResult = await lookupProductByBarcode(barcode);
          
          if (barcodeResult.success) {
            productData = barcodeResult;
            setScannedProductData(barcodeResult);
            effectiveQuery = barcodeResult.product.name;
            console.log('✅ Product resolved:', barcodeResult.product.name);
            if (barcodeResult.companyInfo) {
              console.log('🏢 Company:', barcodeResult.companyInfo.name, '-', barcodeResult.companyInfo.sector);
            }
            if (barcodeResult.product.brand) {
              console.log('🏷️ Brand:', barcodeResult.product.brand);
            }
          } else {
            setError(barcodeResult.message || "Product not found via barcode.");
            setLoading(false);
            return;
          }
        }

        // ✅ Step 2: Run material analysis on the effective query
        if (effectiveQuery) {
          const data = await searchBioLens(effectiveQuery);
          setResult(data);
          
          if (data) {
            saveScanToHistory(effectiveQuery, data);
            setAltLoading(true);
            try {
              const products = await fetchAlternativeProducts(effectiveQuery, 6);
              setAltProducts(products);
              const nonFf = products.filter(p => !p.isFiberFoundry);
              if (nonFf.length > 0) {
                const srcResults = await Promise.all(nonFf.map(p => fetchProductSources(p.productId).then(s => [p.productId, s])));
                const srcMap = {};
                for (const [pid, srcs] of srcResults) { srcMap[pid] = srcs; }
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
  }, [query, barcode]); // ✅ CRITICAL: Add barcode dependency

  // ✅ CRITICAL: Check both parameters before showing search screen
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

  // ✅ Enhanced display variables with comprehensive fallbacks
  const productDisplayName = scannedProductData?.product?.name || 
                            (query ? query.charAt(0).toUpperCase() + query.slice(1) : 'Unknown Product');
  const materialClassification = result?.materialName || "";
  const companyInfo = scannedProductData?.companyInfo;
  const productBrand = scannedProductData?.product?.brand || companyInfo?.name || null;
  const productCategory = scannedProductData?.product?.category || companyInfo?.sector || null;

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
              {barcode ? 'Identifying product from barcode...' : 'Analyzing product...'}
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

        {/* ✅ ENHANCED: Product Found But Material Not Recognized */}
        {!result && !loading && !error && (query || barcode) && (
          <div data-testid="not-found-state" className="mt-16 animate-fade-up">
            <div className="bg-white rounded-2xl p-8 md:p-10 border text-center" style={{ borderColor: '#E5E5E5' }}>
              
              {/* Enhanced Product Display for Barcode Scans */}
              {scannedProductData ? (
                <>
                  <div className="flex flex-col items-center mb-8">
                    {/* Product Image */}
                    {scannedProductData.product?.image && (
                      <img 
                        src={scannedProductData.product.image} 
                        alt="Product" 
                        className="w-24 h-24 object-contain rounded-xl border border-gray-100 mb-4 bg-white shadow-sm"
                      />
                    )}
                    
                    {/* Product Name */}
                    <h2 className="text-2xl font-extrabold mb-3" style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}>
                      {productDisplayName}
                    </h2>
                    
                    {/* Company/Brand Information */}
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

                    {/* Barcode Information */}
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

                  {/* Explanation Card */}
                  <div className="p-6 rounded-xl mb-8 text-left" style={{ backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE' }}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#3B82F6' }}>
                        <span className="text-xl">🍞</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-2" style={{ color: '#1E40AF' }}>
                          Product Identified Successfully
                        </h3>
                        <p className="text-sm mb-4" style={{ color: '#1E3A8A' }}>
                          We found your product and extracted all available information, but BioLens analyzes <strong>materials</strong> (like textiles, plastics, packaging) rather than food items themselves. However, we can analyze the packaging materials used for this product.
                        </p>
                        <p className="text-xs" style={{ color: '#3730A3' }}>
                          💡 <strong>Tip:</strong> For complete environmental impact analysis, try scanning the packaging materials or textile products instead.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Smart Packaging Analysis Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <button
                      onClick={() => navigate('/results?q=plastic+packaging')}
                      className="flex flex-col items-center gap-3 p-5 rounded-xl border transition-all hover:border-red-500 hover:bg-red-50 bg-white group"
                      style={{ borderColor: '#E5E5E5' }}
                    >
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                        <Package className="w-6 h-6" style={{ color: '#EF4444' }} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold mb-1" style={{ color: '#1D1D1F' }}>Plastic Wrapper</p>
                        <p className="text-xs" style={{ color: '#86868B' }}>Analyze bag/wrapper material</p>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate('/results?q=cardboard+box')}
                      className="flex flex-col items-center gap-3 p-5 rounded-xl border transition-all hover:border-green-500 hover:bg-green-50 bg-white group"
                      style={{ borderColor: '#E5E5E5' }}
                    >
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                        <Box className="w-6 h-6" style={{ color: '#22C55E' }} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold mb-1" style={{ color: '#1D1D1F' }}>Cardboard Box</p>
                        <p className="text-xs" style={{ color: '#86868B' }}>Analyze container material</p>
                      </div>
                    </button>

                    <button
                      onClick={() => navigate('/results?q=paper+bag')}
                      className="flex flex-col items-center gap-3 p-5 rounded-xl border transition-all hover:border-orange-500 hover:bg-orange-50 bg-white group"
                      style={{ borderColor: '#E5E5E5' }}
                    >
                      <div className="w-12 h-12 rounded-lg flex items-center justify-center transition-colors" style={{ backgroundColor: 'rgba(180, 83, 9, 0.1)' }}>
                        <ShoppingBag className="w-6 h-6" style={{ color: '#B45309' }} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold mb-1" style={{ color: '#1D1D1F' }}>Paper Bag</p>
                        <p className="text-xs" style={{ color: '#86868B' }}>Analyze paper material</p>
                      </div>
                    </button>
                  </div>
                </>
              ) : (
                /* Standard Not Found State */
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

        {/* ════════════════ MATERIAL ANALYSIS RESULTS ════════════════ */}
        {result && !loading && (
          <div data-testid="result-found" className="mt-2 space-y-5">

            {/* ── S1: Enhanced Product Header ── */}
            <div className="bg-white rounded-2xl p-6 md:p-8 border animate-fade-up" style={{ borderColor: '#E5E5E5' }}>
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-1.5" style={{ color: '#86868B' }}>
                    {barcode ? 'Scanned Product' : 'Product Searched'}
                  </p>
                  
                  <div className="flex items-start gap-4">
                    {/* Product Image */}
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

                      {/* Enhanced Company/Brand Display */}
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

                      {/* Material Classification */}
                      {materialClassification && materialClassification.toLowerCase() !== productDisplayName.toLowerCase() && (
                        <p className="text-xs mt-0.5" style={{ color: '#86868B' }}>
                          Material Classification: <span style={{ color: '#1D1D1F', fontWeight: 600 }}>{materialClassification}</span>
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

              {/* Enhanced Barcode Information */}
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

              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span data-testid="result-category-badge" className={`category-badge ${categoryClass}`}>{result.materialClass}</span>
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

            {/* ── S2: Petroload Score Panel ── */}
            <div className="bg-white rounded-2xl p-6 md:p-8 border animate-fade-up delay-100" style={{ borderColor: '#E5E5E5' }}>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: '#86868B' }}>Petroload Score</p>
              <div className="flex justify-center mb-2">
                <PetroloadMeter score={result.petroloadScore} size="large" />
              </div>
              <p className="text-xs text-center font-medium mb-6" style={{ color: '#86868B' }}>
                {result.petroloadScore != null && result.petroloadScore >= 75 ? 'Very High Petrochemical Dependence'
                  : result.petroloadScore >= 50 ? 'High Petrochemical Dependence'
                  : result.petroloadScore >= 25 ? 'Moderate Petrochemical Dependence'
                  : 'Low Petrochemical Dependence'}
              </p>

              {/* Supporting Metrics */}
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

            {/* ── S3: Material DNA ── */}
            <div data-testid="material-dna-section" className="bg-white rounded-2xl p-6 md:p-8 border animate-fade-up delay-200" style={{ borderColor: '#E5E5E5' }}>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-5" style={{ color: '#86868B' }}>Material DNA</p>
              <MaterialDNA result={result} />
            </div>

            {/* ── S4: Comparison Block ── */}
            {result.alternatives && result.alternatives.length > 0 && (
              <ComparisonBlock productName={productDisplayName} result={result} />
            )}

            {/* ── S5: Material Analysis ── */}
            <div className="bg-white rounded-2xl p-6 md:p-8 border animate-fade-up" style={{ borderColor: '#E5E5E5' }}>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: '#86868B' }}>Material Identified</p>
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

              {/* Health Score */}
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

              {/* Risk Signals */}
              {riskSignals.length > 0 && (
                <div data-testid="risk-signals-section">
                  <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: '#86868B' }}>Risk Signals</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {riskSignals.map(s => <RiskSignalBar key={s.label} {...s} />)}
                  </div>
                </div>
              )}
            </div>

            {/* ── S6: Better Material Paths ── */}
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

            {/* ── Better Product Examples ── */}
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

            {/* ── S7: How BioLens Scored This ── */}
            <ScoringExplainer result={result} />

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
