"use client";

import { useEffect, useState } from "react";
import {
  X,
  Download,
  MoreVertical,
  Share,
  Compass,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types & constants                                                   */
/* ------------------------------------------------------------------ */

type Platform = "ios" | "android-new" | "android-old" | "other";
type Lang = "ny" | "en";
type Art =
  | "open-safari"
  | "chrome-dots"
  | "menu-install"
  | "menu-add-home"
  | "dialog-shortcut"
  | "dialog-install"
  | "dialog-add"
  | "ios-share"
  | "ios-add-home"
  | "done";

type Step = { art: Art; en: string; ny: string };

const DISMISS_KEY = "pwa-dismissed-until";
const LANG_KEY = "pwa-lang";
const DISMISS_DAYS = 7;

/* ------------------------------------------------------------------ */
/* Words (Chichewa wording should be checked by a native speaker)      */
/* ------------------------------------------------------------------ */

const UI = {
  title: {
    en: "Put SchoolPay on your phone",
    ny: "Ikani SchoolPay pa foni yanu",
  },
  sub: {
    en: "See your child's school fees easily.",
    ny: "Onani ndalama za sukulu za mwana wanu mosavuta.",
  },
  install: { en: "Install app", ny: "Ikani app mu Foni" },
  howto: { en: "Show me how", ny: "Ndiwonetseni njira yake" },
  later: { en: "Not now", ny: "Pambuyo pake" },
  next: { en: "Next", ny: "Chotsatira" },
  back: { en: "Back", ny: "Kumbuyo" },
  close: { en: "Close", ny: "Tsekani" },
  step: { en: "Step", ny: "Gawo" },
  of: { en: "of", ny: "la" },
  doneTitle: { en: "Done!", ny: "Zatheka!" },
  doneText: {
    en: "Look for the SchoolPay picture on your phone screen.",
    ny: "Yang'anani chithunzi cha SchoolPay pa screen ya foni yanu.",
  },
} as const;

const STEPS: Record<Exclude<Platform, "other">, Step[]> = {
  "android-old": [
    {
      art: "chrome-dots",
      en: "Open Chrome. Tap the 3 dots at the top right.",
      ny: "Tsegulani Chrome. Dinani madontho atatu pamwamba kumanja.",
    },
    {
      art: "menu-add-home",
      en: "Tap “Add to Home screen”.",
      ny: "Dinani “Add to Home screen”.",
    },
    {
      art: "dialog-shortcut",
      en: "Tap “Add shortcut”. Do NOT tap “Install”.",
      ny: "Dinani “Add shortcut”. OSATI “Install”.",
    },
    {
      art: "dialog-add",
      en: "Tap “Add”.",
      ny: "Dinani “Add”.",
    },
    {
      art: "done",
      en: "",
      ny: "",
    },
  ],
  "android-new": [
    {
      art: "chrome-dots",
      en: "Open Chrome. Tap the 3 dots at the top right.",
      ny: "Tsegulani Chrome. Dinani madontho atatu pamwamba kumanja.",
    },
    {
      art: "menu-install",
      en: "Tap “Install app”.",
      ny: "Dinani “Install app”.",
    },
    {
      art: "dialog-install",
      en: "Tap “Install”.",
      ny: "Dinani “Install”.",
    },
    { art: "done", en: "", ny: "" },
  ],
  ios: [
    {
      art: "open-safari",
      en: "Open this page in Safari (the blue compass).",
      ny: "Tsegulani tsamba ili mu Safari (kampasi ya blue).",
    },
    {
      art: "ios-share",
      en: "Tap the Share button at the bottom of the screen.",
      ny: "Dinani batani ya Share pansi pa screen.",
    },
    {
      art: "ios-add-home",
      en: "Slide your finger up. Tap “Add to Home Screen”.",
      ny: "Yendetsani chala m'mwamba. Dinani “Add to Home Screen”.",
    },
    {
      art: "dialog-add",
      en: "Tap “Add” at the top right.",
      ny: "Dinani “Add” pamwamba kumanja.",
    },
    { art: "done", en: "", ny: "" },
  ],
};

/* ------------------------------------------------------------------ */
/* Platform detection                                                  */
/* ------------------------------------------------------------------ */

// Newer Chrome always says "Android 10" in the user agent, so ask
// userAgentData for the real version first.
async function detectPlatform(): Promise<Platform> {
  const ua = navigator.userAgent;

  const isIOS =
    /iPhone|iPad|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return "ios";
  if (!/Android/i.test(ua)) return "other";

  let version: number | null = null;
  try {
    const uaData = (navigator as any).userAgentData;
    if (uaData?.getHighEntropyValues) {
      const { platformVersion } = await uaData.getHighEntropyValues([
        "platformVersion",
      ]);
      const major = parseInt(String(platformVersion).split(".")[0], 10);
      if (!isNaN(major)) version = major;
    }
  } catch {
    /* fall back to UA */
  }
  if (version === null) {
    const m = ua.match(/Android\s(\d+)/);
    if (m) version = parseInt(m[1], 10);
  }

  // Android 8.x and older crash when opening the WebAPK Chrome builds
  return version !== null && version <= 8 ? "android-old" : "android-new";
}

/* ------------------------------------------------------------------ */
/* Small picture pieces (fake phone screens with a highlighted target) */
/* ------------------------------------------------------------------ */

// Yellow ring that pulses to show "tap here"
const Ring = ({ children }: { children: React.ReactNode }) => (
  <span className="relative inline-flex">
    <span className="absolute -inset-1.5 rounded-xl ring-4 ring-amber-400 motion-safe:animate-pulse" />
    <span className="relative">{children}</span>
  </span>
);

const Frame = ({ children }: { children: React.ReactNode }) => (
  <div className="w-full max-w-[17rem] mx-auto rounded-2xl border-2 border-gray-300 bg-gray-50 p-3 shadow-inner">
    {children}
  </div>
);

const Row = ({ label, target }: { label: string; target?: boolean }) =>
  target ? (
    <div className="my-1">
      <Ring>
        <div className="rounded-lg bg-amber-100 px-4 py-2.5 text-base font-bold text-gray-900 min-w-[13rem]">
          {label}
        </div>
      </Ring>
    </div>
  ) : (
    <div className="px-4 py-2.5 text-base text-gray-400">{label}</div>
  );

function Picture({ art }: { art: Art }) {
  switch (art) {
    case "open-safari":
      return (
        <Frame>
          <div className="flex justify-center py-4">
            <Ring>
              <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center">
                <Compass size={40} className="text-white" />
              </div>
            </Ring>
          </div>
        </Frame>
      );

    case "chrome-dots":
      return (
        <Frame>
          <div className="flex items-center gap-2 rounded-full bg-white border border-gray-200 pl-4 pr-2 py-2">
            <span className="flex-1 text-sm text-gray-400 truncate">
              schoolpay…
            </span>
            <Ring>
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100">
                <MoreVertical size={26} className="text-gray-900" />
              </span>
            </Ring>
          </div>
        </Frame>
      );

    case "menu-install":
      return (
        <Frame>
          <Row label="New tab" />
          <Row label="Install app" target />
          <Row label="Settings" />
        </Frame>
      );

    case "menu-add-home":
      return (
        <Frame>
          <Row label="New tab" />
          <Row label="Add to Home screen" target />
          <Row label="Settings" />
        </Frame>
      );

    case "dialog-shortcut":
      return (
        <Frame>
          <div className="rounded-xl bg-white border border-gray-200 p-3">
            <p className="text-sm font-semibold text-gray-500 mb-2">
              Add to Home screen
            </p>
            <Row label="Install" />
            <Row label="Add shortcut" target />
          </div>
        </Frame>
      );

    case "dialog-install":
      return (
        <Frame>
          <div className="rounded-xl bg-white border border-gray-200 p-3">
            <p className="text-base font-semibold text-gray-900 mb-3">
              Install app?
            </p>
            <div className="flex justify-end gap-3 items-center">
              <span className="text-base text-gray-400 px-3">Cancel</span>
              <Ring>
                <span className="block rounded-lg bg-amber-100 px-5 py-2 text-base font-bold text-gray-900">
                  Install
                </span>
              </Ring>
            </div>
          </div>
        </Frame>
      );

    case "dialog-add":
      return (
        <Frame>
          <div className="rounded-xl bg-white border border-gray-200 p-3">
            <p className="text-base font-semibold text-gray-900 mb-3">
              SchoolPay
            </p>
            <div className="flex justify-end gap-3 items-center">
              <span className="text-base text-gray-400 px-3">Cancel</span>
              <Ring>
                <span className="block rounded-lg bg-amber-100 px-5 py-2 text-base font-bold text-gray-900">
                  Add
                </span>
              </Ring>
            </div>
          </div>
        </Frame>
      );

    case "ios-share":
      return (
        <Frame>
          <div className="h-14 rounded-lg bg-white border border-gray-200 mb-3" />
          <div className="flex items-center justify-around rounded-lg bg-white border border-gray-200 py-2">
            <ChevronLeft size={22} className="text-gray-300" />
            <ChevronRight size={22} className="text-gray-300" />
            <Ring>
              <span className="flex items-center justify-center w-11 h-11 rounded-lg bg-amber-100">
                <Share size={26} className="text-blue-600" />
              </span>
            </Ring>
            <span className="w-5 h-5 rounded border-2 border-gray-300" />
          </div>
        </Frame>
      );

    case "ios-add-home":
      return (
        <Frame>
          <Row label="Copy" />
          <Row label="Add to Home Screen" target />
          <Row label="Print" />
        </Frame>
      );

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function InstallPWA() {
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [stage, setStage] = useState<"intro" | "steps">("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [lang, setLang] = useState<Lang>("ny");

  useEffect(() => {
    // 1. Register service worker
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("SW registration failed:", err);
      });
    }

    // 2. Already installed? Do nothing.
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as any).standalone === true;
    if (isStandalone) return;

    // 3. Remember language, and respect a recent "Not now"
    try {
      const saved = localStorage.getItem(LANG_KEY);
      if (saved === "en" || saved === "ny") setLang(saved);
      const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (until > Date.now()) return;
    } catch {
      /* storage blocked: just show it */
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let detected: Platform = "other";

    const onBeforeInstall = (e: any) => {
      e.preventDefault();
      if (detected === "android-old") return; // native install crashes here
      setDeferredPrompt(e);
      setVisible(true);
    };
    const onInstalled = () => {
      setDeferredPrompt(null);
      setVisible(false);
    };

    detectPlatform().then((p) => {
      if (cancelled) return;
      detected = p;
      setPlatform(p);
      if (p === "ios" || p === "android-old") {
        timer = setTimeout(() => setVisible(true), 3000);
      } else if (p === "android-new") {
        timer = setTimeout(() => setVisible(true), 6000);
      }
    });

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const chooseLang = (l: Lang) => {
    setLang(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
  };

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(
        DISMISS_KEY,
        String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000),
      );
    } catch {
      /* ignore */
    }
  };

  const nativeInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    if (outcome === "accepted") setVisible(false);
  };

  if (!visible || !platform || (platform === "other" && !deferredPrompt)) {
    return null;
  }

  const t = (k: keyof typeof UI) => UI[k][lang];
  const steps = platform !== "other" ? STEPS[platform] : [];
  const current = steps[stepIndex];
  const isDone = current?.art === "done";
  const canNative = !!deferredPrompt && platform !== "android-old";

  const LangSwitch = (
    <div className="inline-flex rounded-full bg-gray-100 p-1 text-sm font-semibold">
      {(["ny", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => chooseLang(l)}
          className={`px-4 py-1.5 rounded-full transition-colors ${
            lang === l
              ? "bg-white text-[var(--color-primary)] shadow-sm"
              : "text-gray-500"
          }`}
        >
          {l === "ny" ? "Chichewa" : "English"}
        </button>
      ))}
    </div>
  );

  return (
    <div
      role="dialog"
      aria-label={t("title")}
      className="fixed bottom-0 left-0 right-0 md:left-auto md:right-4 md:bottom-4 md:w-96 bg-white rounded-t-3xl md:rounded-3xl shadow-2xl border border-blue-100 p-5 z-50 max-h-[92vh] overflow-y-auto"
    >
      {/* Top row: language + close */}
      <div className="flex items-center justify-between mb-4">
        {LangSwitch}
        <button
          onClick={dismiss}
          aria-label={t("close")}
          className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
        >
          <X size={22} />
        </button>
      </div>

      {/* ------------------------- INTRO ------------------------- */}
      {stage === "intro" && (
        <div>
          <div className="flex items-center gap-4 mb-5">
            <img
              src="/icons/icon-192.png"
              alt="SchoolPay"
              className="w-16 h-16 rounded-2xl shrink-0"
            />
            <div>
              <h3 className="text-xl font-bold text-gray-900 leading-snug">
                {t("title")}
              </h3>
              <p className="text-base text-gray-600 mt-1 leading-snug">
                {t("sub")}
              </p>
            </div>
          </div>

          {canNative ? (
            <button
              onClick={nativeInstall}
              className="w-full min-h-14 flex items-center justify-center gap-2 text-lg font-bold text-white bg-[var(--color-primary)] rounded-2xl"
            >
              <Download size={22} /> {t("install")}
            </button>
          ) : (
            <button
              onClick={() => {
                setStepIndex(0);
                setStage("steps");
              }}
              className="w-full min-h-14 text-lg font-bold text-white bg-[var(--color-primary)] rounded-2xl"
            >
              {t("howto")}
            </button>
          )}
          <button
            onClick={dismiss}
            className="w-full min-h-12 mt-2 text-base font-medium text-gray-500"
          >
            {t("later")}
          </button>
        </div>
      )}

      {/* ------------------------- STEPS ------------------------- */}
      {stage === "steps" && current && (
        <div>
          {isDone ? (
            <div className="text-center py-4">
              <CheckCircle2 size={64} className="mx-auto text-green-600 mb-3" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {t("doneTitle")}
              </h3>
              <p className="text-lg text-gray-700 leading-snug">
                {t("doneText")}
              </p>
            </div>
          ) : (
            <>
              {/* progress dots */}
              <div className="flex items-center justify-center gap-2 mb-2">
                {steps.slice(0, -1).map((_, i) => (
                  <span
                    key={i}
                    className={`h-2.5 rounded-full transition-all ${
                      i === stepIndex
                        ? "w-8 bg-[var(--color-primary)]"
                        : i < stepIndex
                          ? "w-2.5 bg-[var(--color-primary)]/50"
                          : "w-2.5 bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <p className="text-center text-sm font-semibold text-gray-500 mb-3">
                {t("step")} {stepIndex + 1} {t("of")} {steps.length - 1}
              </p>

              <Picture art={current.art} />

              <p className="text-xl font-bold text-gray-900 text-center leading-snug mt-4 mb-1">
                {current[lang]}
              </p>
            </>
          )}

          {/* nav buttons */}
          <div className="flex gap-3 mt-5">
            {stepIndex > 0 && !isDone && (
              <button
                onClick={() => setStepIndex((i) => i - 1)}
                className="flex-1 min-h-14 flex items-center justify-center gap-1 text-lg font-semibold text-gray-700 bg-gray-100 rounded-2xl"
              >
                <ChevronLeft size={22} /> {t("back")}
              </button>
            )}
            {isDone ? (
              <button
                onClick={dismiss}
                className="flex-1 min-h-14 text-lg font-bold text-white bg-[var(--color-primary)] rounded-2xl"
              >
                {t("close")}
              </button>
            ) : (
              <button
                onClick={() => setStepIndex((i) => i + 1)}
                className="flex-[2] min-h-14 flex items-center justify-center gap-1 text-lg font-bold text-white bg-[var(--color-primary)] rounded-2xl"
              >
                {t("next")} <ChevronRight size={22} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
