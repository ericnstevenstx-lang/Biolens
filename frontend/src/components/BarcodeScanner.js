import { useState, useCallback } from "react";
import { useZxing } from "react-zxing";
import { X, Zap, Camera, RotateCcw } from "lucide-react";

/**
 * Barcode scanner using ZXing via react-zxing.
 * Decodes UPC/EAN/GTIN barcodes from camera feed.
 */
export default function BarcodeScanner({ onScan, onClose }) {
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(true);

  const handleDecodeResult = useCallback(
    (result) => {
      if (!scanning) return;
      const text = result.getText();
      if (text) {
        setScanning(false);
        onScan(text);
      }
    },
    [onScan, scanning]
  );

  const handleError = useCallback((err) => {
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
  });

  const handleRetry = () => {
    setScanning(true);
    setError(null);
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

      {/* Camera view */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {error ? (
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
          <>
            <video
              ref={ref}
              data-testid="scanner-video"
              className="w-full h-full object-cover"
              playsInline
              muted
            />
            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-72 h-40 rounded-xl border-2 relative"
                style={{ borderColor: "rgba(180, 83, 9, 0.6)" }}
              >
                {/* Corner accents */}
                <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: "#B45309" }} />
                <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: "#B45309" }} />
                <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: "#B45309" }} />
                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: "#B45309" }} />

                {/* Scan line animation */}
                {scanning && (
                  <div
                    className="absolute left-2 right-2 h-0.5"
                    style={{
                      backgroundColor: "#B45309",
                      animation: "scanLine 2s ease-in-out infinite",
                    }}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer hint */}
      <div className="p-4 text-center" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
        <div className="flex items-center justify-center gap-2 mb-1">
          <Zap className="w-3.5 h-3.5" style={{ color: "#B45309" }} />
          <span
            className="text-xs font-medium"
            style={{ fontFamily: "'Inter', sans-serif", color: "#F5F5F7" }}
          >
            {scanning ? "Point camera at a barcode" : "Barcode detected!"}
          </span>
        </div>
        <p
          className="text-xs"
          style={{ fontFamily: "'Inter', sans-serif", color: "#86868B" }}
        >
          Supports UPC, EAN, and GTIN barcodes
        </p>
      </div>
    </div>
  );
}
