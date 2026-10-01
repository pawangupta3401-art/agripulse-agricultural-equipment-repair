"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  User,
  Star,
  HelpCircle,
  CreditCard,
  Wrench,
  ShieldCheck,
  History,
  Globe,
  Bell,
  LogOut,
  ChevronRight,
  X,
  CheckCircle2,
  Phone,
  Check,
} from "lucide-react";
import { AuthUser, isTechnicianRole } from "@/services/authService";
import { LanguageCode, SUPPORTED_LANGUAGES } from "@/i18n";

export interface ProfileScreenProps {
  user: AuthUser;
  currentLanguage: LanguageCode;
  onBack: () => void;
  onOpenLanguageModal: () => void;
  onLogout: () => void;
  onNavigateToRepairs?: () => void;
  onNavigateToMachines?: () => void;
  onNavigateToServiceHistory?: () => void;
  onOpenHelp?: () => void;
}

export default function ProfileScreen({
  user,
  currentLanguage,
  onBack,
  onOpenLanguageModal,
  onLogout,
  onNavigateToRepairs,
  onNavigateToMachines,
  onNavigateToServiceHistory,
  onOpenHelp,
}: ProfileScreenProps) {
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<
    "rating" | "payments" | "safety" | "notifications" | null
  >(null);

  const [smsNotifications, setSmsNotifications] = useState(true);
  const [statusNotifications, setStatusNotifications] = useState(true);

  const isTech = isTechnicianRole(user.role);
  const isEn = currentLanguage === "en";

  const currentLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage);
  const currentLangDisplay = currentLangObj
    ? `${currentLangObj.nativeName} (${currentLangObj.name})`
    : "हिन्दी (Hindi)";

  const farmerRating = typeof user.rating === "number" ? user.rating.toFixed(1) : "5.0";

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-slate-900 pb-20 select-none">
      {/* ================= 1. CLEAN TOP HEADER ================= */}
      <header className="bg-white border-b border-slate-200 px-4 py-3.5 sticky top-0 z-30">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            type="button"
            id="profile-back-btn"
            onClick={onBack}
            className="flex items-center gap-1.5 p-1.5 -ml-1.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label={isEn ? "Back" : "वापस"}
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
            <span className="text-sm font-semibold">{isEn ? "Back" : "वापस"}</span>
          </button>

          <h1 className="text-base font-bold text-slate-900">
            {isEn ? "Profile" : "प्रोफ़ाइल"}
          </h1>

          <div className="w-12" aria-hidden="true" />
        </div>
      </header>

      {/* ================= MAIN PROFILE CONTENT ================= */}
      <main className="max-w-md mx-auto">
        {/* ================= 2. TOP PROFILE ROW ================= */}
        <div className="bg-white border-b border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-13 h-13 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                <User className="w-6 h-6 text-slate-700" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-bold text-slate-900 truncate">
                    {user.nameHi || user.name || (isEn ? "AgriPulse User" : "एग्रीपल्स उपयोगकर्ता")}
                  </h2>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                </div>
                <div className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>+91 {user.phone}</span>
                </div>
                <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
                  {isTech ? (isEn ? "Technician Account" : "टेक्नीशियन खाता") : (isEn ? "Verified Farmer" : "सत्यापित किसान खाता")}
                </div>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
          </div>
        </div>

        {/* ================= 3. RATING ROW ================= */}
        <div className="bg-white border-b border-slate-200 mt-2">
          <button
            type="button"
            id="profile-rating-row"
            onClick={() => setActiveModal("rating")}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-medium">
                  {isEn ? "My Rating" : "मेरी रेटिंग"}
                </div>
                <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <span>{farmerRating}</span>
                  <span className="text-xs font-normal text-slate-500">
                    {isEn ? "(Good Standing)" : "(उत्कृष्ट रेटिंग)"}
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </div>

        {/* ================= 4. SERVICE-APP OPTIONS LIST ================= */}
        <div className="bg-white border-y border-slate-200 divide-y divide-slate-100 mt-2">
          {/* Help */}
          <button
            type="button"
            id="profile-help-row"
            onClick={() => {
              if (onOpenHelp) onOpenHelp();
              else onBack();
            }}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {isEn ? "Help & Support" : "सहायता (Help)"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Payments / Billing */}
          <button
            type="button"
            id="profile-payments-row"
            onClick={() => setActiveModal("payments")}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <CreditCard className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {isEn ? "Payments / Billing" : "भुगतान / बिलिंग (Payments)"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* My Repairs */}
          <button
            type="button"
            id="profile-repairs-row"
            onClick={() => {
              if (onNavigateToRepairs) onNavigateToRepairs();
              else onBack();
            }}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <Wrench className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {isEn ? "My Repairs" : "मेरी मरम्मत (My Repairs)"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Safety */}
          <button
            type="button"
            id="profile-safety-row"
            onClick={() => setActiveModal("safety")}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {isEn ? "Safety & Data Protection" : "सुरक्षा (Safety)"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Service History */}
          <button
            type="button"
            id="profile-history-row"
            onClick={() => {
              if (onNavigateToServiceHistory) onNavigateToServiceHistory();
              else onBack();
            }}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <History className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {isEn ? "Service History" : "सेवा इतिहास (Service History)"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Language */}
          <button
            type="button"
            id="profile-language-row"
            onClick={onOpenLanguageModal}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">
                  {isEn ? "Language" : "भाषा (Language)"}
                </div>
                <div className="text-xs text-slate-500 font-medium truncate">
                  {currentLangDisplay}
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Notifications */}
          <button
            type="button"
            id="profile-notifications-row"
            onClick={() => setActiveModal("notifications")}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-900">
                {isEn ? "Notifications" : "सूचनाएं (Notifications)"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>
        </div>

        {/* ================= 5. LOGOUT ROW ================= */}
        <div className="bg-white border-y border-slate-200 mt-2">
          <button
            type="button"
            id="profile-logout-row-btn"
            onClick={() => setIsLogoutConfirmOpen(true)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-rose-50/60 active:bg-rose-100/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                <LogOut className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-rose-600">
                {isEn ? "Logout" : "लॉगआउट (Logout)"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-400 shrink-0" />
          </button>
        </div>

        {/* Platform Footer Note */}
        <div className="px-5 py-6 text-center text-xs text-slate-400 space-y-1">
          <p className="font-semibold text-slate-500">AgriPulse v2.4</p>
          <p>{isEn ? "Agricultural Service & Equipment Platform" : "कृषि यंत्र मरम्मत एवं सेवा मंच"}</p>
        </div>
      </main>

      {/* ================= 6. LOGOUT CONFIRMATION MODAL ================= */}
      {isLogoutConfirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-confirm-title"
        >
          <div className="bg-white rounded-lg max-w-sm w-full p-5 space-y-4 border border-slate-200 shadow-lg">
            <div className="w-11 h-11 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto text-xl">
              <LogOut className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h3
                id="logout-confirm-title"
                className="text-base font-bold text-slate-900"
              >
                {isEn ? "Confirm Logout" : "लॉगआउट"}
              </h3>
              <p className="text-sm font-medium text-slate-700">
                {isEn
                  ? "Are you sure you want to logout?"
                  : "क्या आप लॉगआउट करना चाहते हैं?"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                id="logout-cancel-btn"
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="w-full py-2.5 px-4 rounded-md border border-slate-300 hover:bg-slate-50 active:bg-slate-100 text-slate-700 font-semibold text-sm transition-colors cursor-pointer"
              >
                {isEn ? "Cancel" : "रद्द करें"}
              </button>

              <button
                type="button"
                id="logout-confirm-btn"
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  onLogout();
                }}
                className="w-full py-2.5 px-4 rounded-md bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-sm transition-colors cursor-pointer"
              >
                {isEn ? "Logout" : "लॉगआउट"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= 7. PAYMENTS / BILLING MODAL ================= */}
      {activeModal === "payments" && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg max-w-sm w-full p-5 space-y-4 border border-slate-200 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {isEn ? "Payments & Billing" : "भुगतान एवं बिलिंग"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 font-medium">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1.5">
                <div className="font-bold text-slate-900">
                  {isEn ? "Transparent Repair Billing" : "पारदर्शी मरम्मत बिलिंग"}
                </div>
                <p className="text-slate-600 text-xs">
                  {isEn
                    ? "Service charges and spare parts are confirmed before work begins. Payment is settled directly upon repair verification via cash or UPI."
                    : "काम शुरू होने से पहले सेवा शुल्क और पार्ट्स की कीमत की पुष्टि की जाती है। काम पूरा होने पर नकद या UPI द्वारा भुगतान किया जाता है।"}
                </p>
              </div>

              <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-md">
                <div className="font-bold text-emerald-950">
                  {isEn ? "Accepted Payment Methods" : "स्वीकृत भुगतान विधियां"}
                </div>
                <div className="text-emerald-800 text-xs mt-1">
                  ✓ Cash on Delivery (नकद) • UPI (PhonePe, GPay, Paytm)
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 px-4 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              {isEn ? "Done" : "ठीक है"}
            </button>
          </div>
        </div>
      )}

      {/* ================= 8. RATING MODAL ================= */}
      {activeModal === "rating" && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg max-w-sm w-full p-5 space-y-4 border border-slate-200 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500 fill-amber-400" />
                <h3 className="text-base font-bold text-slate-900">
                  {isEn ? "Account Standing" : "खाता रेटिंग"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-2 space-y-1">
              <div className="text-3xl font-bold text-slate-900">{farmerRating}</div>
              <div className="flex justify-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-slate-600 font-medium pt-2">
                {isEn
                  ? "Based on successful repair completions and timely verifications with technicians."
                  : "सफल मरम्मत कार्य और तकनीशियनों के साथ समय पर सत्यापन के आधार पर।"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 px-4 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              {isEn ? "Close" : "बंद करें"}
            </button>
          </div>
        </div>
      )}

      {/* ================= 9. NOTIFICATIONS MODAL ================= */}
      {activeModal === "notifications" && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg max-w-sm w-full p-5 space-y-4 border border-slate-200 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-slate-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {isEn ? "Notifications" : "सूचनाएं"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {isEn ? "SMS Status Updates" : "SMS स्थिति अपडेट"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {isEn ? "Receive repair milestones on phone" : "फोन पर मरम्मत प्रगति SMS प्राप्त करें"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSmsNotifications(!smsNotifications)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    smsNotifications ? "bg-emerald-700" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      smsNotifications ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {isEn ? "Technician Arrival Alerts" : "टेक्नीशियन आगमन अलर्ट"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {isEn ? "Alerts when technician is nearby" : "जब टेक्नीशियन पास पहुंचे"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStatusNotifications(!statusNotifications)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    statusNotifications ? "bg-emerald-700" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`block w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      statusNotifications ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 px-4 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              {isEn ? "Save Preferences" : "सहेजें (Save)"}
            </button>
          </div>
        </div>
      )}

      {/* ================= 10. SAFETY MODAL ================= */}
      {activeModal === "safety" && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-lg max-w-sm w-full p-5 space-y-4 border border-slate-200 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">
                  {isEn ? "Safety & Data Protection" : "सुरक्षा व डेटा संरक्षण"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 font-medium">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                <div className="font-bold text-slate-900">
                  {isEn ? "Offline-First Data Storage" : "ऑफलाइन-सुरक्षित डेटा"}
                </div>
                <p>
                  {isEn
                    ? "Machine records and repair tickets are saved on your phone and synced automatically when network is available."
                    : "आपकी मशीन और मरम्मत के रिकॉर्ड आपके फोन पर सुरक्षित रहते हैं और नेटवर्क मिलने पर सर्वर से सिंक होते हैं।"}
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                <div className="font-bold text-slate-900">
                  {isEn ? "Verified Mobile Authentication" : "सत्यापित मोबाइल सुरक्षा"}
                </div>
                <p>
                  {isEn
                    ? "Your phone number is authenticated using a secure one-time passcode (OTP)."
                    : "आपका फोन नंबर सुरक्षित एकमुश्त पासवर्ड (OTP) द्वारा सत्यापित है।"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 px-4 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors cursor-pointer"
            >
              {isEn ? "Close" : "बंद करें"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
