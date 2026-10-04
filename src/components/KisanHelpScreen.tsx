"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Volume2, VolumeX, ArrowLeft, Wrench, RefreshCw, AlertCircle } from "lucide-react";
import { LanguageCode, getSpeechRecognitionCode } from "@/i18n";
import { askVoiceHelp, speakAloud, stopSpeech } from "@/services/voiceAssistantService";
import { VoiceHelpResponse, FarmerHelpType } from "@/types/voiceAssistant";

export interface KisanHelpScreenProps {
  currentLanguage: LanguageCode;
  onBack: () => void;
}

interface ConversationTurn {
  farmerText: string;
  aiResponse: string;
  helpType?: FarmerHelpType;
  technicianRequired?: boolean;
  clarificationNeeded?: boolean;
}

export default function KisanHelpScreen({
  currentLanguage = "hi",
  onBack,
}: KisanHelpScreenProps) {
  const isEn = currentLanguage === "en";

  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState<ConversationTurn | null>(null);

  const recognitionRef = useRef<any>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      stopSpeech();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  // Process voice query with AgriPulse AI
  const handleProcessQuery = useCallback(
    async (spokenQuery: string) => {
      if (!isMountedRef.current || !spokenQuery.trim()) return;

      setVoiceState("processing");
      setErrorMessage(null);

      try {
        const response: VoiceHelpResponse = await askVoiceHelp(spokenQuery, {
          currentPage: "kisan_help",
          language: currentLanguage,
        });

        if (!isMountedRef.current) return;

        const aiText =
          response.spokenText ||
          (isEn
            ? "I understood your request. How else can I assist with your farm equipment?"
            : "मैं समझ गया। आपकी मशीन या समस्या के बारे में और क्या जानकारी चाहिए?");

        const turn: ConversationTurn = {
          farmerText: spokenQuery,
          aiResponse: aiText,
          helpType: response.helpType,
          technicianRequired: response.technicianRequired,
          clarificationNeeded: response.clarificationNeeded,
        };

        setCurrentTurn(turn);
        setVoiceState("speaking");

        activeUtteranceRef.current = speakAloud(
          aiText,
          currentLanguage,
          () => {
            if (isMountedRef.current) {
              setVoiceState("idle");
            }
          },
          () => {
            if (isMountedRef.current) {
              setVoiceState("idle");
            }
          }
        );
      } catch (err) {
        if (!isMountedRef.current) return;
        setVoiceState("idle");
        setErrorMessage(
          isEn
            ? "Sorry, a technical issue occurred. Please try speaking again in a moment."
            : "माफ कीजिए, अभी तकनीकी समस्या आ रही है। कृपया थोड़ी देर बाद प्रयास करें।"
        );
      }
    },
    [currentLanguage, isEn]
  );

  // Start microphone listening
  const handleStartListening = useCallback(() => {
    stopSpeech();
    setErrorMessage(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(
        isEn
          ? "Microphone is not supported in this browser. Please use Chrome."
          : "इस ब्राउज़र में बोलकर पूछने की सुविधा उपलब्ध नहीं है। कृपया क्रोम (Chrome) का उपयोग करें।"
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = getSpeechRecognitionCode(currentLanguage);

      recognition.onstart = () => {
        if (isMountedRef.current) {
          setVoiceState("listening");
        }
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript?.trim();
        if (transcript) {
          handleProcessQuery(transcript);
        } else {
          setVoiceState("idle");
          setErrorMessage(
            isEn
              ? "Could not hear clearly. Please try speaking again."
              : "मैं आपकी बात ठीक से समझ नहीं पाया। कृपया दोबारा बोलें।"
          );
        }
      };

      recognition.onerror = (event: any) => {
        if (!isMountedRef.current) return;
        setVoiceState("idle");
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setErrorMessage(
            isEn
              ? "Please allow microphone access to speak."
              : "माइक की अनुमति दें ताकि आप बोलकर मदद ले सकें।"
          );
        } else if (event.error === "no-speech") {
          setErrorMessage(
            isEn
              ? "No speech detected. Please press the button and speak clearly."
              : "कोई आवाज़ सुनाई नहीं दी। बटन दबाकर साफ आवाज़ में बोलें।"
          );
        } else {
          setErrorMessage(
            isEn
              ? "Could not capture voice. Please try again."
              : "आवाज़ रिकॉर्ड नहीं हो सकी। कृपया दोबारा प्रयास करें।"
          );
        }
      };

      recognition.onend = () => {
        // Handled in onresult or onerror
      };

      recognition.start();
    } catch {
      setVoiceState("idle");
      setErrorMessage(
        isEn
          ? "Failed to start microphone. Please check permissions."
          : "माइक शुरू नहीं हो सका। कृपया अनुमति जांचें।"
      );
    }
  }, [currentLanguage, handleProcessQuery, isEn]);

  // Stop speech playback
  const handleStopSpeaking = () => {
    stopSpeech();
    setVoiceState("idle");
  };

  return (
    <div className="space-y-4 animate-fadeIn pb-8 max-w-md mx-auto">
      {/* Top Breadcrumb & Heading */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="h-9 w-9 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
            aria-label={isEn ? "Back" : "वापस जाएं"}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight flex items-center gap-1.5">
              <span>🗣️✨</span>
              <span>{isEn ? "Farmer Help" : "किसान हेल्प"}</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
              {isEn ? "Ask anything by voice" : "किसी भी समस्या के बारे में बोलकर पूछें"}
            </p>
          </div>
        </div>
      </div>

      {/* Main Voice Interactive Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-center space-y-4">
        {/* Subtle Animated Visual Icon */}
        <div className="flex justify-center pt-2">
          <div
            className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
              voiceState === "listening"
                ? "bg-red-100 text-red-600 ring-8 ring-red-50 animate-pulse scale-105"
                : voiceState === "processing"
                ? "bg-blue-100 text-blue-600 ring-8 ring-blue-50 animate-bounce"
                : voiceState === "speaking"
                ? "bg-emerald-100 text-emerald-700 ring-8 ring-emerald-50"
                : "bg-emerald-50 text-emerald-800 border-2 border-emerald-200"
            }`}
          >
            {voiceState === "listening" ? (
              <span className="text-4xl select-none animate-pulse">🎙️</span>
            ) : voiceState === "processing" ? (
              <RefreshCw className="w-10 h-10 animate-spin text-blue-600" />
            ) : voiceState === "speaking" ? (
              <Volume2 className="w-10 h-10 animate-bounce text-emerald-700" />
            ) : (
              <span className="text-4xl select-none">🗣️✨</span>
            )}
          </div>
        </div>

        {/* Status Text & Prompts */}
        <div className="space-y-1">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">
            {voiceState === "listening"
              ? isEn
                ? "Listening... Speak now"
                : "सुन रहा हूँ... बोलिए"
              : voiceState === "processing"
              ? isEn
                ? "Thinking..."
                : "सोच रहा हूँ..."
              : voiceState === "speaking"
              ? isEn
                ? "Speaking answer..."
                : "जवाब सुन रहे हैं..."
              : isEn
              ? "Describe your problem"
              : "अपनी समस्या बताइए"}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            {voiceState === "listening"
              ? isEn
                ? "Tell your machine symptom, mechanic need, or app question"
                : "ट्रैक्टर, पंप, मिस्त्री या ऐप से जुड़ी बात बोलें"
              : isEn
              ? "Speak for machine repair, technician, or app questions"
              : "मशीन, टेक्नीशियन या ऐप से जुड़ी मदद के लिए बोलें"}
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="pt-2">
          {voiceState === "listening" ? (
            <div className="h-14 w-full rounded-2xl bg-red-600 text-white font-bold text-base flex items-center justify-center gap-2 shadow-md animate-pulse select-none">
              <span className="w-3 h-3 rounded-full bg-white animate-ping" />
              <span>{isEn ? "Listening to your voice..." : "सुन रहा हूँ..."}</span>
            </div>
          ) : voiceState === "speaking" ? (
            <button
              type="button"
              onClick={handleStopSpeaking}
              className="h-14 w-full rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-base flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
            >
              <VolumeX className="w-5 h-5" />
              <span>{isEn ? "Stop Speaking" : "आवाज़ रोकें (Stop)"}</span>
            </button>
          ) : (
            <button
              type="button"
              id="kisan-help-speak-btn"
              disabled={voiceState === "processing"}
              onClick={handleStartListening}
              className="h-14 w-full rounded-2xl bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white font-bold text-base flex items-center justify-center gap-2.5 shadow-md cursor-pointer transition-all border border-emerald-800"
            >
              <Mic className="w-5 h-5 stroke-[2.5]" />
              <span>{isEn ? "🎤 Start Speaking" : "🎤 बोलना शुरू करें"}</span>
            </button>
          )}
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs sm:text-sm font-semibold text-red-900 flex items-center gap-2 text-left animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Small, Clean Response Area */}
      {currentTurn && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3 animate-fadeIn">
          {/* Farmer's Captured Speech */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs sm:text-sm">
            <span className="text-[11px] font-bold text-slate-500 uppercase block mb-0.5">
              {isEn ? "🧑‍🌾 Your words:" : "🧑‍🌾 आपकी बात:"}
            </span>
            <p className="font-semibold text-slate-800 italic">
              &ldquo;{currentTurn.farmerText}&rdquo;
            </p>
          </div>

          {/* AI Spoken Answer */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3 text-xs sm:text-sm">
            <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800 mb-1">
              <span className="flex items-center gap-1">
                <span>🗣️✨</span>
                <span>{isEn ? "YANTRIQ Assistant:" : "YANTRIQ सहायक:"}</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  stopSpeech();
                  speakAloud(currentTurn.aiResponse, currentLanguage);
                }}
                className="text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer font-bold"
                title={isEn ? "Listen again" : "दोबारा सुनें"}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>{isEn ? "Replay" : "दोबारा सुनें"}</span>
              </button>
            </div>
            <p className="font-bold text-emerald-950 leading-relaxed">
              {currentTurn.aiResponse}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-1">
            {/* Speak again for follow-up question or clarification */}
            <button
              type="button"
              id="kisan-help-speak-again-btn"
              onClick={handleStartListening}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl text-sm border border-emerald-800 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 shadow-xs"
            >
              <Mic className="w-4 h-4 stroke-[2.5]" />
              <span>{isEn ? "🎤 Speak Again / Answer Question" : "🎤 दोबारा बोलें / सवाल पूछें"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Helpful Audio Prompt / Sample Inquiries */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-600 space-y-2">
        <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wide">
          {isEn ? "💡 You can ask questions like:" : "💡 आप ऐसे सवाल पूछ सकते हैं:"}
        </span>
        <div className="grid grid-cols-1 gap-1.5 font-medium">
          <div
            onClick={() => handleProcessQuery(isEn ? "Smoke is coming from my tractor" : "मेरे ट्रैक्टर से धुआं निकल रहा है")}
            className="p-2 bg-white rounded-lg border border-slate-200/70 hover:border-emerald-400 cursor-pointer flex items-center gap-2 transition-colors"
          >
            <span>🚜</span>
            <span>{isEn ? '"Smoke is coming from my tractor"' : '"मेरे ट्रैक्टर से धुआं निकल रहा है"'}</span>
          </div>
          <div
            onClick={() => handleProcessQuery(isEn ? "How much oil should I put in the tractor?" : "ट्रैक्टर में तेल कितना डालना चाहिए?")}
            className="p-2 bg-white rounded-lg border border-slate-200/70 hover:border-emerald-400 cursor-pointer flex items-center gap-2 transition-colors"
          >
            <span>🛢️</span>
            <span>{isEn ? '"How much oil in tractor?"' : '"ट्रैक्टर में तेल कितना डालना चाहिए?"'}</span>
          </div>
          <div
            onClick={() => handleProcessQuery(isEn ? "How to clean the sprayer?" : "स्प्रेयर कैसे साफ करें?")}
            className="p-2 bg-white rounded-lg border border-slate-200/70 hover:border-emerald-400 cursor-pointer flex items-center gap-2 transition-colors"
          >
            <span>🚿</span>
            <span>{isEn ? '"How to clean sprayer?"' : '"स्प्रेयर कैसे साफ करें?"'}</span>
          </div>
          <div
            onClick={() => handleProcessQuery(isEn ? "Why is water pump pressure low?" : "पंप से पानी का प्रेशर कम क्यों है?")}
            className="p-2 bg-white rounded-lg border border-slate-200/70 hover:border-emerald-400 cursor-pointer flex items-center gap-2 transition-colors"
          >
            <span>💧</span>
            <span>{isEn ? '"Why is water pump pressure low?"' : '"पंप से पानी का प्रेशर कम क्यों है?"'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
