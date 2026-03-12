import { useState, useEffect } from "react";
import { Download } from "lucide-react";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Hide if already installed
  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstall(false);
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  if (!showInstall) return null;

  return (
    <button
      data-testid="install-app-button"
      onClick={handleInstall}
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full shadow-lg transition-transform duration-200 hover:scale-105"
      style={{
        backgroundColor: '#1D1D1F',
        color: '#F5F5F7',
        fontFamily: "'Inter', sans-serif",
        fontSize: '0.8rem',
        fontWeight: 500,
      }}
    >
      <Download className="w-4 h-4" />
      Install BioLens
    </button>
  );
}
