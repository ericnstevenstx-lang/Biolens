import { useRef, useCallback, useState } from "react";
import html2canvas from "html2canvas";
import { Share2, Download, X } from "lucide-react";
import { getPetroloadLevel, getConfidenceLabel } from "@/lib/biolens";
import { getMaterialDNA } from "@/components/MaterialDNA";

/**
 * Shareable scan card component.
 * Renders a hidden card, captures it with html2canvas, and offers sharing/download.
 */
export default function ShareCard({ result, query, onClose }) {
  const cardRef = useRef(null);
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);

  const petroLevel = getPetroloadLevel(result.petroloadScore);
  const confidence = getConfidenceLabel(result.confidenceScore);

  const generateImage = useCallback(async () => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: "#FFFFFF",
        useCORS: true,
        logging: false,
        width: 540,
        height: 720,
      });
      const url = canvas.toDataURL("image/png");
      setImageUrl(url);
      return { canvas, url };
    } catch (err) {
      console.error("Failed to generate share image:", err);
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleDownload = async () => {
    let url = imageUrl;
    if (!url) {
      const gen = await generateImage();
      if (gen) url = gen.url;
    }
    if (!url) return;
    const link = document.createElement("a");
    link.download = `biolens-${result.normalizedName || result.materialName || "scan"}.png`;
    link.href = url;
    link.click();
  };

  const handleDownloadStory = async () => {
    // Instagram story = 1080x1920 aspect ratio
    if (!cardRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: "#FFFFFF",
        useCORS: true,
        logging: false,
        width: 540,
        height: 720,
      });
      // Create story canvas with proper aspect ratio
      const storyCanvas = document.createElement("canvas");
      storyCanvas.width = 1080;
      storyCanvas.height = 1920;
      const ctx = storyCanvas.getContext("2d");
      ctx.fillStyle = "#F5F5F7";
      ctx.fillRect(0, 0, 1080, 1920);
      // Center the card
      const scale = Math.min(1080 / canvas.width, 1920 / canvas.height) * 0.85;
      const w = canvas.width * scale;
      const h = canvas.height * scale;
      const x = (1080 - w) / 2;
      const y = (1920 - h) / 2;
      ctx.drawImage(canvas, x, y, w, h);

      const url = storyCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `biolens-story-${result.normalizedName || "scan"}.png`;
      link.href = url;
      link.click();
    } catch (err) {
      console.error("Failed to generate story image:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleWebShare = async () => {
    let url = imageUrl;
    if (!url) {
      const gen = await generateImage();
      if (gen) url = gen.url;
    }
    if (!url) return;

    // Convert data URL to blob for sharing
    const res = await fetch(url);
    const blob = await res.blob();
    const file = new File([blob], "biolens-scan.png", { type: "image/png" });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: `BioLens Scan: ${result.materialName}`,
          text: `This product uses ${result.materialName} (${result.materialClass}). Petroload: ${result.petroloadScore}/100. See what your products are really made of.`,
          files: [file],
        });
      } catch (err) {
        if (err.name !== "AbortError") {
          // Fallback to text share
          try {
            await navigator.share({
              title: `BioLens Scan: ${result.materialName}`,
              text: `This product uses ${result.materialName} (${result.materialClass}). Petroload: ${result.petroloadScore}/100. See what your products are really made of.`,
              url: window.location.href,
            });
          } catch (e) { /* user cancelled */ }
        }
      }
    } else if (navigator.share) {
      // Text-only share
      try {
        await navigator.share({
          title: `BioLens Scan: ${result.materialName}`,
          text: `This product uses ${result.materialName} (${result.materialClass}). Petroload: ${result.petroloadScore}/100.`,
          url: window.location.href,
        });
      } catch (e) { /* user cancelled */ }
    } else {
      // Fallback: just download
      handleDownload();
    }
  };

  const topAlts = (result.alternatives || []).slice(0, 3);
  const dna = getMaterialDNA(result);

  return (
    <div
      data-testid="share-card-modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "#E5E5E5" }}>
          <h3
            className="text-sm font-semibold uppercase tracking-wider"
            style={{ fontFamily: "'Inter', sans-serif", color: "#1D1D1F" }}
          >
            Share This Scan
          </h3>
          <button
            data-testid="share-card-close"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200"
          >
            <X className="w-5 h-5" style={{ color: "#86868B" }} />
          </button>
        </div>

        {/* The renderable card (captured by html2canvas) */}
        <div className="p-5">
          <div
            ref={cardRef}
            style={{
              width: 540,
              height: 720,
              padding: 48,
              backgroundColor: "#FFFFFF",
              fontFamily: "'Inter', sans-serif",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              transform: "scale(0.56)",
              transformOrigin: "top left",
              marginBottom: "-310px",
            }}
          >
            {/* Top section */}
            <div>
              <p style={{ fontSize: 13, color: "#86868B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>
                BioLens Scan Result
              </p>
              <p style={{ fontSize: 14, color: "#86868B", marginBottom: 24 }}>
                {query ? `"${query.charAt(0).toUpperCase() + query.slice(1)}"` : ""}
              </p>

              {/* Material */}
              <h2 style={{ fontFamily: "'Manrope', sans-serif", fontSize: 36, fontWeight: 700, color: "#1D1D1F", marginBottom: 8, lineHeight: 1.2 }}>
                {result.materialName}
              </h2>
              <p style={{ fontSize: 14, color: petroLevel.color, fontWeight: 600, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {result.materialClass}
              </p>

              {/* Petroload */}
              <div style={{ margin: "28px 0", padding: "24px 0", borderTop: "1px solid #E5E5E5", borderBottom: "1px solid #E5E5E5" }}>
                <p style={{ fontSize: 12, color: "#86868B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                  Petroload Score
                </p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontFamily: "'Manrope', sans-serif", fontSize: 56, fontWeight: 700, color: petroLevel.color, lineHeight: 1 }}>
                    {result.petroloadScore ?? "—"}
                  </span>
                  <span style={{ fontSize: 18, color: "#86868B" }}>/ 100</span>
                </div>
                <p style={{ fontSize: 13, color: petroLevel.color, fontWeight: 600, marginTop: 4 }}>
                  {petroLevel.label}
                </p>
              </div>

              {/* Alternatives */}
              {topAlts.length > 0 && (
                <div>
                  <p style={{ fontSize: 12, color: "#86868B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                    Material DNA
                  </p>
                  <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                    {[
                      { label: "Petroleum", pct: dna.petroleum, color: "#EF4444" },
                      { label: "Natural", pct: dna.natural, color: "#22C55E" },
                      { label: "Semi-Synthetic", pct: dna.hybrid, color: "#EAB308" },
                    ].map(seg => (
                      <div key={seg.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: seg.color }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#1D1D1F" }}>{seg.pct}%</span>
                        <span style={{ fontSize: 11, color: "#86868B" }}>{seg.label}</span>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: 12, color: "#86868B", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                    Better Alternative
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {topAlts.map((alt) => (
                      <span
                        key={alt.name}
                        style={{
                          padding: "6px 16px",
                          borderRadius: 999,
                          fontSize: 13,
                          fontWeight: 500,
                          backgroundColor: "rgba(34, 197, 94, 0.08)",
                          color: "#22C55E",
                        }}
                      >
                        {alt.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom branding */}
            <div style={{ borderTop: "1px solid #E5E5E5", paddingTop: 20 }}>
              <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 18, fontWeight: 600, color: "#1D1D1F", marginBottom: 4 }}>
                BioLens
              </p>
              <p style={{ fontSize: 12, color: "#86868B" }}>
                Scan before you buy — BioLens
              </p>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-5 border-t space-y-3" style={{ borderColor: "#E5E5E5" }}>
          <button
            data-testid="share-native-button"
            onClick={handleWebShare}
            disabled={generating}
            className="btn-pill btn-primary w-full justify-center"
          >
            <Share2 className="w-4 h-4" />
            {generating ? "Generating..." : "Share"}
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button
              data-testid="share-download-button"
              onClick={handleDownload}
              disabled={generating}
              className="btn-pill btn-secondary w-full justify-center text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </button>
            <button
              data-testid="share-story-button"
              onClick={handleDownloadStory}
              disabled={generating}
              className="btn-pill btn-secondary w-full justify-center text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              Story Format
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
