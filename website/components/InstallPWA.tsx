"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  useEffect(() => {
    // 1. Check if already installed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone;
    if (isStandalone) return;

    // 2. Register SW
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.log);
    }

    // 3. Listen for the event
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Fallback: If event doesn't fire after 5 seconds, show the manual prompt anyway
    // This guarantees the user sees an install option, even if Chrome blocks the event
    const timer = setTimeout(() => {
      if (!deferredPrompt) setShowPrompt(true);
    }, 5000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, [deferredPrompt]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // If the browser fired the event, show the native prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setShowPrompt(false);
      setDeferredPrompt(null);
    } else {
      // If no event (Chrome blocked it), show manual instructions
      setShowManualInstructions(true);
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-2xl shadow-2xl border border-blue-100 p-4 z-50 animate-in slide-in-from-bottom-5">
      {showManualInstructions ? (
        <div className="relative">
          <button
            onClick={() => setShowPrompt(false)}
            className="absolute -top-2 -right-2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <Smartphone className="text-[var(--color-primary)]" size={24} />
            <h3 className="text-sm font-bold text-gray-900">How to Install</h3>
          </div>
          <p className="text-xs text-gray-600 mb-3 leading-relaxed">
            To add this app to your home screen:
            <br />
            <br />
            1. Tap the three dots <strong>(⋮)</strong> in Chrome.
            <br />
            2. Tap <strong>"Add to Home screen"</strong> or{" "}
            <strong>"Install app"</strong>.
          </p>
          <button
            onClick={() => setShowPrompt(false)}
            className="w-full py-2 text-xs font-semibold text-white bg-[var(--color-primary)] rounded-lg"
          >
            Got it
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <img
                  src="/icons/icon-192.png"
                  alt="Logo"
                  className="w-8 h-8 object-contain rounded-md"
                />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Install SchoolPay
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Add to home screen for quick access to your child's fees.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowPrompt(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setShowPrompt(false)}
              className="flex-1 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Not Now
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2 text-xs font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] rounded-lg flex items-center justify-center gap-1.5 transition-colors"
            >
              <Download size={14} /> Install App
            </button>
          </div>
        </>
      )}
    </div>
  );
}
