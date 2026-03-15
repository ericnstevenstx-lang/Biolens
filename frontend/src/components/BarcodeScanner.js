import { useState, useCallback } from "react";
import { useZxing } from "react-zxing";
import { X, Zap, Camera, RotateCcw, CheckCircle, Keyboard } from "lucide-react";

export default function BarcodeScanner({ onScan, onClose }) {
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(true);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualCode, setManualCode] = useState("");

  const handleDecodeResult = useCallback(
    (result) => {
      if (!scanning) return;
      
      const text = result.getText();
      if (text && text.length >= 6) {
        console.log("📸 Barcode detected:", text);
        
        // ✅ CRITICAL: Show success feedback
        setScanSuccess(true);
        setScanning(false);
        
        // ✅ CRITICAL: Close modal first, then navigate
        setTimeout(() => {
          onClose(); // Remove modal so navigation is visible
          onScan(text); // Trigger navigation to results
          console.log("✅ Navigation triggered to:", text);
        }, 500); // Brief delay for user feedback
      }
    },
    [onScan, onClose, scanning]
  );

  const handleError = useCallback((err) => {
    // Only handle critical camera errors
    if (err?.message?.includes("NotAllowedError")) {
      setError("Camera access denied. Please allow camera permissions and try again.");
    } else if (err?.message?.includes("NotFoundError")) {
      setError("No camera found on this device.");
    }
    // Ignore decode errors (normal when no barcode in frame)
  }, []);

  const { ref } = useZxing({
    onDecodeResult: handleDecodeResult,
    onError: handleError,
    paused: !scanning,
    timeBetweenDecodingAttempts: 200,
    
    // ✅ Enhanced camera configuration for better barcode detection
    constraints: {
      video: {
        facingMode: { ideal: "environment" }, // Force back camera on mobile
        focusMode: "continuous",
      },
    },
    
    // ✅ Optional: Add format hints for better UPC/EAN detection
    // (Requires: import { BarcodeFormat } from "@zxing/library")
    /*
    hints: {
      possibleFormats: [
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E, 
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128,
      ],
    },
    */
  });

  const handleRetry = () => {
    setScanning(true);
    setScanSuccess(false);
    setError(null);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualCode.length >= 6) {
      console.log("📝 Manual entry:", manualCode);
      onClose();
      onScan(manualCode);
    }
  };

  return (
    <div
      data-testid="barcode-scanner-modal"
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ backgroundColor: "#000" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5 text-white" />
          <span
            className="text-sm font-medium text-white"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Scan Barcode
          </span>
        </div>
        <button
          data-testid="scanner-close-button"
          onClick={onClose}
          className="p-2 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {showManual ? (
          /* Manual Entry Form */
          <div className="w-full max-w-xs p-6 bg-white rounded-2xl mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Enter Barcode</h3>
            <form onSubmit={handleManualSubmit}>
              <input
                type="tel"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.replace(/\D/g, ''))}
                placeholder="030772161593"
                className="w-full p-4 mb-4 text-lg tracking-widest text-center border-2 border-gray-200 rounded-xl focus:border-orange-600 focus:outline-none"
                autoFocus
                maxLength="13"
              />
              <button
                type="submit"
                disabled={manualCode.length < 6}
                className="w-full py-3 bg-orange-600 text-white font-semibold rounded-xl disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                Search Product
              </button>
              <button
                type="button"
                onClick={() => setShowManual(false)}
                className="w-full mt-2 py-2 text-gray-500 font-medium"
              >
                Back to Camera
              </button>
            </form>
          </div>
        ) : error ? (
          /* Error State */
          <div className="text-center p-6">
            <Camera className="w-12 h-12 mx-auto mb-4" style={{ color: "#86868B" }} />
            <p
              className="text-sm mb-6"
              style={{ fontFamily: "'Inter', sans-serif", color: "#F5F5F7" }}
            >
              {error}
            </p>
            <button
              data-testid="scanner-retry-button"
              onClick={handleRetry}
              className="btn-pill btn-accent"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        ) : (
          /* Camera View */
          <>
            <video
              ref={ref}
              data-testid="scanner-video"
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            
            {/* Scan Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-72 h-40 rounded-xl border-2 relative"
                style={{ borderColor: scanSuccess ? "#22C55E" : "rgba(180, 83, 9, 0.6)" }}
              >
                {/* Corner Accents */}
                <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: scanSuccess ? "#22C55E" : "#B45309" }} />
                <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: scanSuccess ? "#22C55E" : "#B45309" }} />
                <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: scanSuccess ? "#22C55E" : "#B45309" }} />
                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: scanSuccess ? "#22C55E" : "#B45309" }} />

                {/* Scan Line Animation */}
                {scanning && (
                  <div
                    className="absolute left-2 right-2 h-0.5"
                    style={{
                      backgroundColor: "#B45309",
                      animation: "scanLine 2s ease-in-out infinite",
                    }}
                  />
                )}
                
                {/* Success Indicator */}
                {scanSuccess && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CheckCircle className="w-16 h-16" style={{ color: "#22C55E" }} />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 text-center" style={{ backgroundColor: scanSuccess ? "rgba(34, 197, 94, 0.1)" : "rgba(0,0,0,0.8)" }}>
        {scanSuccess ? (
          <div className="flex items-center justify-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4" style={{ color: "#22C55E" }} />
            <span
              className="text-xs font-semibold"
              style={{ fontFamily: "'Inter', sans-serif", color: "#22C55E" }}
            >
              Barcode detected! Loading product...
            </span>
          </div>
        ) : !showManual && !error ? (
          <>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-3.5 h-3.5" style={{ color: "#B45309" }} />
              <span
                className="text-xs font-medium"
                style={{ fontFamily: "'Inter', sans-serif", color: "#F5F5F7" }}
              >
                {scanning ? "Point camera at a barcode" : "Processing..."}
              </span>
            </div>
            <p
              className="text-xs mb-3"
              style={{ fontFamily: "'Inter', sans-serif", color: "#86868B" }}
            >
              Supports UPC, EAN, and GTIN barcodes
            </p>
            <button
              onClick={() => setShowManual(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-xs font-medium transition-colors"
            >
              <Keyboard className="w-3 h-3" />
              Enter Manually
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}
