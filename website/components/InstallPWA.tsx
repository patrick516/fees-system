"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 1. Check if the app is ALREADY installed (running in standalone mode)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone;
    if (isStandalone) {
      return; // Don't show the install prompt if they already installed it
    }

    // 2. Register the Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.log("Service Worker registration failed:", err);
      });
    }

    // 3. Listen for the browser's install prompt
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // 🎯 Show the prompt IMMEDIATELY when the browser says it's ready
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // 4. Hide the prompt if the app gets installed
    const installedHandler = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the native install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-2xl shadow-2xl border border-blue-100 p-4 z-50 animate-in slide-in-from-bottom-5">
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
    </div>
  );
}
