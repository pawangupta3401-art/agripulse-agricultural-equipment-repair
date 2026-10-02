"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  Volume2,
  Square,
  RotateCcw,
  X,
  AlertCircle,
  Loader2,
  Sparkles,
  BookOpen,
  ShieldAlert,
  Wrench,
} from "lucide-react";
import { getSpeechRecognitionCode } from "@/i18n";
import {
  VoiceAssistantStatus,
  VoiceHelpScreenContext,
  VoiceHelpResponse,
} from "@/types/voiceAssistant";
import { askVoiceHelp, speakAloud, stopSpeech } from "@/services/voiceAssistantService";

interface VoiceHelpAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  context: VoiceHelpScreenContext;
  onRequestBreakdown?: () => void;
}

export default function VoiceHelpAssistant({
  isOpen,
  onClose,
  context,
  onRequestBreakdown,
}: VoiceHelpAssistantProps) {
  const [status, setStatus] = useState<VoiceAssistantStatus>("idle");
  const [spokenTranscript, setSpokenTranscript] = useState<string>("");
  const [assistantResponse, setAssistantResponse] = useState<string>("");
  const [detailedResponse, setDetailedResponse] = useState<VoiceHelpResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isClosingRef = useRef<boolean>(false);

  const isEn = context.language === "en";

  // Clean stop everything
  const handleStop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Safe catch
      }
      recognitionRef.current = null;
    }
    stopSpeech();
    setStatus("idle");
  }, []);

  // Safe close
  const handleClose = useCallback(() => {
    isClosingRef.current = true;
    handleStop();
    onClose();
  }, [handleStop, onClose]);

  // Process question through 1000 Q&A Knowledge Base and speak answer
  const processQueryAndSpeak = useCallback(
    async (queryText: string) => {
      if (isClosingRef.current) return;
      setStatus("processing");
      setAssistantResponse("");
      setDetailedResponse(null);

      try {
        const response: VoiceHelpResponse = await askVoiceHelp(queryText, context);

        if (isClosingRef.current) return;

        setDetailedResponse(response);
        const textToSpeak =
          response.spokenText ||
          (isEn
            ? "Currently unable to assist by voice. You can proceed using the options on screen."
            : "अभी मैं आपकी आवाज़ से मदद नहीं कर पा रहा हूँ। आप स्क्रीन पर दिए विकल्पों से आगे बढ़ सकते हैं।");

        setAssistantResponse(textToSpeak);
        setStatus("speaking");

        speakAloud(
          textToSpeak,
          context.language,
          () => {
            if (!isClosingRef.current) {
              setStatus("idle");
            }
          },
          () => {
            if (!isClosingRef.current) {
              setStatus("idle");
            }
          }
        );
      } catch {
        if (isClosingRef.current) return;
        const fallback = isEn
          ? "Currently unable to assist by voice. You can proceed using the options on screen."
          : "अभी मैं आपकी आवाज़ से मदद नहीं कर पा रहा हूँ। आप स्क्रीन पर दिए विकल्पों से आगे बढ़ सकते हैं।";
        setAssistantResponse(fallback);
        setStatus("speaking");
        speakAloud(fallback, context.language, () => setStatus("idle"));
      }
    },
    [context, isEn]
  );

  // Start listening flow
  const startListening = useCallback(() => {
    handleStop();
    setErrorMessage(null);
    setSpokenTranscript("");
    isClosingRef.current = false;

    // Check Web Speech API support
    const windowObj = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = windowObj ? ((windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition) as any) : null;

    if (!SpeechRecognition) {
      const msg = isEn
        ? "Microphone is not supported in this browser. Please use the options on screen."
        : "इस फोन या ब्राउज़र में माइक्रोफोन उपलब्ध नहीं है। कृपया नीचे दिए विकल्पों पर टैप करें।";
      setErrorMessage(msg);
      setStatus("error");
      speakAloud(msg, context.language);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      const speechCode = getSpeechRecognitionCode(context.language);
      recognition.lang = speechCode;
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setStatus("listening");
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        const currentText = finalTranscript || interimTranscript;
        setSpokenTranscript(currentText);

        if (finalTranscript.trim()) {
          try {
            recognition.stop();
          } catch {}
          processQueryAndSpeak(finalTranscript.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[VoiceHelp] Recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          const micMsg = isEn
            ? "Microphone permission not granted. Tap any question below to get the voice answer."
            : "माइक्रोफोन की अनुमति नहीं मिली। नीचे दिए किसी भी प्रश्न पर टैप करके आवाज़ में जवाब सुनें।";
          setErrorMessage(micMsg);
          setStatus("error");
          speakAloud(micMsg, context.language);
        } else if (event.error === "no-speech") {
          const noSpeechMsg = isEn
            ? "I didn't hear anything. Tap 'Speak Again' when you're ready."
            : "आपकी आवाज़ नहीं सुनाई दी। तैयार होने पर 'फिर से बोलें' बटन दबाएं।";
          setErrorMessage(noSpeechMsg);
          setStatus("idle");
        } else {
          setStatus("idle");
        }
      };

      recognition.onend = () => {
        if (status === "listening" && !spokenTranscript) {
          setStatus("idle");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("[VoiceHelp] Start error:", err);
      const errTxt = isEn
        ? "Unable to start microphone. Please proceed using the on-screen options."
        : "माइक्रोफोन शुरू करने में समस्या आई। नीचे दिए प्रश्नों पर टैप करके जवाब सुनें।";
      setErrorMessage(errTxt);
      setStatus("error");
    }
  }, [context.language, handleStop, isEn, processQueryAndSpeak, spokenTranscript, status]);

  // Trigger listening when opened
  useEffect(() => {
    if (isOpen) {
      startListening();
    } else {
      handleStop();
    }
    return () => {
      handleStop();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const quickQuestions = [
    { textHi: "ट्रैक्टर स्टार्ट नहीं हो रहा, कट-कट आवाज आती है", icon: "🚜", label: "स्टार्टिंग समस्या" },
    { textHi: "ट्रैक्टर लोड पर बहुत ज्यादा काला धुआं दे रहा है", icon: "💨", label: "काला धुआं" },
    { textHi: "सफेद धुआं निकल रहा है और पानी टपक रहा है", icon: "💧", label: "सफेद धुआं" },
    { textHi: "हाइड्रोलिक लिफ्ट रोटावेटर को ऊपर नहीं उठा रही", icon: "⚙️", label: "लिफ्ट समस्या" },
    { textHi: "मोटर चल रही है लेकिन पंप पानी नहीं उठा रहा", icon: "💦", label: "पंप प्राइमिंग" },
    { textHi: "पावर टिलर की रस्सी बहुत टाइट खिंचती है", icon: "🌾", label: "टिलर रिकॉइल" },
  ];

  return (
    <div
      role="region"
      aria-label="Voice AI Assistant"
      className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header */}
        <div className="bg-emerald-800 text-white px-4 py-3.5 flex items-center justify-between border-b border-emerald-900">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl p-1 bg-emerald-700/60 rounded-lg">🗣️✨</span>
            <div>
              <h3 className="text-base font-bold leading-tight">
                {isEn ? "AgriPulse Voice AI Assistant" : "AgriPulse वॉयस AI सहायक"}
              </h3>
              <p className="text-[11px] text-emerald-200 font-medium flex items-center gap-1 mt-0.5">
                <BookOpen className="w-3 h-3 text-emerald-300" />
                <span>{isEn ? "1000+ Agricultural Q&A Knowledge Base" : "1000+ कृषि मशीन Q&A ज्ञानकोश से सुसज्जित"}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-emerald-200 hover:text-white p-1 rounded-md hover:bg-emerald-700/60 cursor-pointer transition-colors"
            title="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 6-Stage Flow Banner */}
        <div className="bg-emerald-50/80 px-3.5 py-2 border-b border-emerald-100 flex items-center justify-between text-[11px] font-semibold text-emerald-900 overflow-x-auto whitespace-nowrap gap-2">
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center text-[10px] font-bold">1</span>
            <span>किसान बोलता है</span>
          </span>
          <span className="text-emerald-300">➔</span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center text-[10px] font-bold">2</span>
            <span>प्रश्न समझता है</span>
          </span>
          <span className="text-emerald-300">➔</span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center text-[10px] font-bold">3</span>
            <span>1000 Q&A खोज</span>
          </span>
          <span className="text-emerald-300">➔</span>
          <span className="flex items-center gap-1">
            <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center text-[10px] font-bold">4</span>
            <span>सरल हिन्दी वॉयस उत्तर</span>
          </span>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Main Status & Avatar */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="flex items-center gap-3">
              <div className="relative">
                {status === "listening" && (
                  <span className="absolute -inset-1 rounded-full bg-emerald-500/30 animate-ping" />
                )}
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    status === "listening"
                      ? "bg-emerald-700 text-white shadow-md ring-4 ring-emerald-100"
                      : status === "speaking"
                      ? "bg-emerald-600 text-white shadow-md ring-4 ring-emerald-100"
                      : status === "processing"
                      ? "bg-amber-500 text-white ring-4 ring-amber-100"
                      : status === "error"
                      ? "bg-rose-100 text-rose-700 border border-rose-300"
                      : "bg-white text-emerald-800 border border-slate-300"
                  }`}
                >
                  {status === "listening" ? (
                    <Mic className="w-6 h-6 animate-pulse" />
                  ) : status === "speaking" ? (
                    <Volume2 className="w-6 h-6 animate-bounce" />
                  ) : status === "processing" ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : status === "error" ? (
                    <AlertCircle className="w-6 h-6" />
                  ) : (
                    <Mic className="w-6 h-6" />
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                  {status === "listening"
                    ? "🎤 किसान की आवाज़ सुनी जा रही है..."
                    : status === "processing"
                    ? "🔍 1000 Q&A ज्ञानकोश में खोज जारी है..."
                    : status === "speaking"
                    ? "🔊 सरल हिन्दी में उत्तर बोला जा रहा है..."
                    : "तैयार (Ready) — माइक दबाएं या प्रश्न चुनें"}
                </div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {status === "listening" ? (
                    spokenTranscript ? (
                      `"${spokenTranscript}"`
                    ) : (
                      "कृपया अपनी मशीन या समस्या के बारे में बोलें..."
                    )
                  ) : spokenTranscript ? (
                    `पूछा: "${spokenTranscript}"`
                  ) : (
                    "आप खेती की किसी भी मशीन की खराबी पूछ सकते हैं"
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Button in Status Bar */}
            {(status === "listening" || status === "speaking") ? (
              <button
                type="button"
                onClick={handleStop}
                className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-800 hover:bg-rose-200 border border-rose-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>रोकें</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={startListening}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>बोलें</span>
              </button>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Relevant Answer Section */}
          {assistantResponse && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 animate-fadeIn">
              {detailedResponse?.categoryHi && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300">
                    📚 {detailedResponse.categoryHi}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakAloud(assistantResponse, context.language)}
                    className="text-xs font-bold text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-2xs"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>दोबारा सुनें</span>
                  </button>
                </div>
              )}

              {/* Main Spoken Answer Text */}
              <div className="text-sm font-bold text-slate-900 leading-relaxed bg-white p-3 rounded-lg border border-emerald-100">
                &quot;{assistantResponse}&quot;
              </div>

              {/* Action Steps */}
              {detailedResponse?.steps && detailedResponse.steps.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                    ✓ किसान भाई क्या करें (Action Steps):
                  </span>
                  <ul className="space-y-1 text-xs text-slate-700 font-medium">
                    {detailedResponse.steps.map((st, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="font-bold text-emerald-700 shrink-0">{i + 1}.</span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warning if present */}
              {detailedResponse?.warning && (
                <div className="p-2.5 bg-amber-100/80 border border-amber-300 rounded-lg text-xs font-semibold text-amber-950 flex items-start gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                  <span>{detailedResponse.warning}</span>
                </div>
              )}

              {/* CTA to book mechanic */}
              {onRequestBreakdown && (
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      onRequestBreakdown();
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>इस समस्या के लिए मैकेनिक बुलाएं ➔</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 1000 Q&A Suggested Questions */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>ज्ञानकोश से अक्सर पूछे जाने वाले सवाल:</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-400">टैप करके सुनें</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {quickQuestions.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSpokenTranscript(q.textHi);
                    processQueryAndSpeak(q.textHi);
                  }}
                  className="p-2.5 text-left rounded-lg border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/60 bg-white transition-all text-xs font-medium text-slate-800 flex items-center gap-2 cursor-pointer shadow-2xs group"
                >
                  <span className="text-lg shrink-0 group-hover:scale-110 transition-transform">{q.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-slate-900 truncate">{q.label}</div>
                    <div className="text-[11px] text-slate-500 truncate">{q.textHi}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>AgriPulse 1000+ Q&A AI Engine</span>
          <button
            type="button"
            onClick={startListening}
            className="text-emerald-800 font-bold hover:underline flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>नया सवाल पूछें</span>
          </button>
        </div>
      </div>
    </div>
  );
}
