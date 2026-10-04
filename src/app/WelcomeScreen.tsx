"use client";

/**
 * AgriPulse WelcomeScreen — Final Polish
 *
 * Shown ONLY on first launch (before the user has authenticated).
 * After tapping "शुरू करें", the existing LoginScreen (role-selection + OTP flow) is shown.
 *
 * Visual & UX Hierarchy:
 *  1. Top-right: Clean Language selector ("हिन्दी ⌄") connected to existing i18n
 *  2. Upper-middle: High-contrast AgriPulse logo + brand name
 *  3. Two-line balanced Hindi heading:
 *       "खेती की मशीनों की मदद,
 *        एक जगह"
 *  4. High-contrast subtitle:
 *       "मशीन की समस्या बताएं, सही मदद पाएं"
 *  5. Lower portion: Prominent, elderly-friendly "शुरू करें" CTA button
 *
 * Requirements:
 *  - NO AI button on this screen (Voice AI is reserved for login/flow screens)
 *  - NO debug / camera / orientation text (clean authentic agricultural photography)
 *  - Clean typography with strong readability over natural farm background
 *  - Preserves all existing routing, storage, and authentication logic
 */

import React, { useState, useCallback } from "react";
import { Languages, ChevronDown, Check, X } from "lucide-react";
import {
  LanguageCode,
  t,
  SUPPORTED_LANGUAGES,
  setStoredLanguage,
} from "@/i18n";

// ─── localStorage helpers (Existing logic preserved) ─────────────────────────

export const WELCOME_SEEN_KEY = "agripulse_welcome_seen_v1";

export function markWelcomeSeen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, "true");
  } catch {
    // Private mode / quota exceeded safe fallback
  }
}

export function hasSeenWelcome(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) === "true";
  } catch {
    return false;
  }
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface WelcomeScreenProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  onGetStarted: () => void;
}

export default function WelcomeScreen({
  currentLanguage,
  onLanguageChange,
  onGetStarted,
}: WelcomeScreenProps) {
  const [showLangPicker, setShowLangPicker] = useState(false);

  // ── Language selection ─────────────────────────────────────────────────────
  const handleSelectLang = useCallback(
    (lang: LanguageCode) => {
      onLanguageChange(lang);
      setStoredLanguage(lang);
      setShowLangPicker(false);
    },
    [onLanguageChange]
  );

  const nativeLangName =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage)?.nativeName ?? "हिन्दी";

  const popularLangs = SUPPORTED_LANGUAGES.filter((l) => l.isPopular);
  const otherLangs = SUPPORTED_LANGUAGES.filter((l) => !l.isPopular);

  // Fallback labels via existing localization system
  const headingText = t("welcomeScreen.heading", currentLanguage);
  const subtitleText = t("welcomeScreen.subheading", currentLanguage);
  const getStartedText = t("welcomeScreen.getStartedBtn", currentLanguage);

  return (
    <div
      className="relative w-full flex flex-col justify-between overflow-hidden select-none"
      style={{ minHeight: "100dvh" }}
    >
      {/* ── 1. Pristine Agricultural Background ────────────────────────────── */}
      <div
        className="absolute inset-0 bg-cover bg-no-repeat pointer-events-none"
        style={{
          backgroundImage: "url('/agripulse-farm-bg.jpg')",
          backgroundPosition: "center 35%",
          backgroundSize: "cover",
        }}
        aria-hidden="true"
      />

      {/* ── 2. Subtle Balanced Gradient Overlay for High Contrast ───────────── */}
      {/* Darker at top and bottom to make text razor-sharp while keeping tractor in view */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, rgba(8, 24, 10, 0.72) 0%, rgba(8, 24, 10, 0.32) 32%, rgba(8, 24, 10, 0.42) 65%, rgba(6, 18, 8, 0.88) 100%)",
        }}
        aria-hidden="true"
      />

      {/* ── 3. Language Picker Modal ───────────────────────────────────────── */}
      {showLangPicker && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowLangPicker(false)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white pb-8 pt-5 px-5 shadow-2xl border-t border-slate-200"
            onClick={(e) => e.stopPropagation()}
            style={{ maxHeight: "80vh", overflowY: "auto" }}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Languages className="w-5 h-5 text-[#165420]" />
                <h2 className="text-base font-extrabold text-[#165420]">
                  भाषा चुनें / Select Language
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowLangPicker(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 cursor-pointer transition-colors"
                aria-label="बंद करें"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Popular Languages */}
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              प्रमुख भाषाएं
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {popularLangs.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLang(lang.code)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl border text-left cursor-pointer active:scale-[0.98] transition-all ${
                    currentLanguage === lang.code
                      ? "bg-[#ecfdf5] border-[#165420] text-[#165420] shadow-xs"
                      : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="font-bold text-sm leading-tight">{lang.nativeName}</p>
                    <p className="text-xs text-slate-500 font-medium">{lang.name}</p>
                  </div>
                  {currentLanguage === lang.code && (
                    <Check className="w-4 h-4 text-[#165420] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            {/* Other Indian Languages */}
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              अन्य क्षेत्रीय भाषाएं
            </p>
            <div className="grid grid-cols-2 gap-2">
              {otherLangs.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLang(lang.code)}
                  className={`flex items-center justify-between px-3.5 py-3 rounded-xl border text-left cursor-pointer active:scale-[0.98] transition-all ${
                    currentLanguage === lang.code
                      ? "bg-[#ecfdf5] border-[#165420] text-[#165420] shadow-xs"
                      : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <p className="font-bold text-sm leading-tight">{lang.nativeName}</p>
                    <p className="text-xs text-slate-500 font-medium">{lang.name}</p>
                  </div>
                  {currentLanguage === lang.code && (
                    <Check className="w-4 h-4 text-[#165420] flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. Main Foreground Content (Header, Center, Footer) ─────────────── */}
      <div className="relative z-10 flex flex-col justify-between flex-1 w-full max-w-md mx-auto px-5 py-6">

        {/* ── TOP BAR: Top-Right Language Switcher ─────────────────────────── */}
        <header className="flex justify-end items-center pt-2">
          <button
            type="button"
            id="welcomeLangBtn"
            onClick={() => setShowLangPicker(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full cursor-pointer active:scale-95 transition-all shadow-md bg-black/40 hover:bg-black/55 backdrop-blur-md border border-white/25 text-white"
            aria-label="भाषा चुनें / Select Language"
          >
            <Languages className="w-4 h-4 text-emerald-300 flex-shrink-0" />
            <span className="text-xs font-bold tracking-wide">{nativeLangName}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80 flex-shrink-0" />
          </button>
        </header>

        {/* ── CENTER AREA: Logo + Two-Line Heading + Subtitle ────────────── */}
        <div className="flex flex-col items-center text-center my-auto py-8">

          {/* AgriPulse Logo & Brand Badge */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-emerald-950/70 border border-emerald-400/40 shadow-xl backdrop-blur-md flex items-center justify-center mb-3">
              <span className="text-4xl sm:text-5xl select-none" role="img" aria-label="AgriPulse emblem">
                🌾
              </span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/35 backdrop-blur-xs border border-white/20">
              <span className="text-xl sm:text-2xl font-black text-white tracking-tight leading-none">
                YANTRIQ
              </span>
            </div>
          </div>

          {/* Main Hindi Heading: Exactly 2 balanced lines */}
          <h1 className="text-white font-extrabold tracking-tight text-center leading-[1.28] text-2xl sm:text-3xl md:text-[34px] drop-shadow-lg mb-4">
            <span className="block">खेती की मशीनों की मदद,</span>
            <span className="block text-emerald-300 mt-1">एक जगह</span>
          </h1>

          {/* Subtitle: High contrast, instantly clear to elderly farmers */}
          <div className="max-w-xs sm:max-w-sm px-4 py-2 rounded-xl bg-black/30 backdrop-blur-xs border border-white/15">
            <p className="text-white text-sm sm:text-base font-semibold leading-relaxed tracking-wide">
              {subtitleText || "मशीन की समस्या बताएं, सही मदद पाएं"}
            </p>
          </div>
        </div>

        {/* ── LOWER AREA: Primary CTA Button ──────────────────────────────── */}
        <div className="w-full flex flex-col items-center pb-4 sm:pb-6">
          <button
            type="button"
            id="welcomeGetStartedBtn"
            onClick={onGetStarted}
            className="w-full h-13 sm:h-14 bg-[#165420] hover:bg-[#124219] active:scale-[0.99] text-white font-bold text-base sm:text-lg rounded-xl shadow-xl border border-emerald-500/30 flex items-center justify-center cursor-pointer transition-all tracking-wide"
            aria-label={getStartedText || "शुरू करें"}
          >
            {getStartedText || "शुरू करें"}
          </button>
        </div>

      </div>
    </div>
  );
}
