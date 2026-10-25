"use client";

import { useEffect, useState } from "react";
import { Download, X, Smartphone } from "lucide-react";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showManual, setShowManual] = useState(false);

  useEffect(() => {
    // 1. Register SW
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("SW registration failed:", err);
      });
    }

    // 2. Don't show if already installed or permanently dismissed
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone;
    if (isStandalone || localStorage.getItem("pwa-installed") === "true")
      return;

    // 3. Listen for native prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // 4. Hide permanently when installed
    const installedHandler = () => {
      setShowPrompt(false);
      localStorage.setItem("pwa-installed", "true");
    };
    window.addEventListener("appinstalled", installedHandler);

    // 5. FALLBACK: if native prompt never fires, show manual instructions anyway after 6s
    const fallbackTimer = setTimeout(() => {
      setShowPrompt((prev) => prev || true);
    }, 6000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowPrompt(false);
        localStorage.setItem("pwa-installed", "true");
      }
      setDeferredPrompt(null);
    } else {
      // No native prompt available — show manual instructions
      setShowManual(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem("pwa-dismissed", "true");
  };

  if (!showPrompt || sessionStorage.getItem("pwa-dismissed") === "true")
    return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-2xl shadow-2xl border border-blue-100 p-4 z-50">
      {showManual ? (
        <div className="relative">
          <button
            onClick={handleDismiss}
            className="absolute -top-2 -right-2 text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 mb-3">
            <Smartphone className="text-[var(--color-primary)]" size={22} />
            <h3 className="text-sm font-bold text-gray-900">
              Install SchoolPay
            </h3>
          </div>
          <p className="text-xs text-gray-600 mb-3 leading-relaxed">
            To add this app to your home screen:
            <br />
            <br />
            1. Tap the <strong>three dots (⋮)</strong> in Chrome
            <br />
            2. Tap <strong>"Install app"</strong> or{" "}
            <strong>"Add to Home screen"</strong>
          </p>
          <button
            onClick={handleDismiss}
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
                  Quick access to your child's fees.
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleDismiss}
              className="flex-1 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg"
            >
              Not Now
            </button>
            <button
              onClick={handleInstallClick}
              className="flex-1 py-2 text-xs font-semibold text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] rounded-lg flex items-center justify-center gap-1.5"
            >
              <Download size={14} /> Install App
            </button>
          </div>
        </>
      )}
    </div>
  );
}
