"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, Volume2, Square, RotateCcw, X, AlertCircle, Loader2 } from "lucide-react";
import { LanguageCode, getSpeechRecognitionCode, t } from "@/i18n";
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
}

export default function VoiceHelpAssistant({
  isOpen,
  onClose,
  context,
}: VoiceHelpAssistantProps) {
  const [status, setStatus] = useState<VoiceAssistantStatus>("idle");
  const [spokenTranscript, setSpokenTranscript] = useState<string>("");
  const [assistantResponse, setAssistantResponse] = useState<string>("");
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

  // Process question through AI backend and speak answer
  const processQueryAndSpeak = useCallback(
    async (queryText: string) => {
      if (isClosingRef.current) return;
      setStatus("processing");
      setAssistantResponse("");

      try {
        const response: VoiceHelpResponse = await askVoiceHelp(queryText, context);

        if (isClosingRef.current) return;

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
            // Speech finished
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
        : "इस ब्राउज़र में माइक्रोफोन उपलब्ध नहीं है। कृपया स्क्रीन पर दिए विकल्पों का उपयोग करें।";
      setErrorMessage(msg);
      setStatus("error");
      speakAloud(msg, context.language);
      return;
    }

    try {
      setStatus("listening");
      const recognition = new SpeechRecognition();
      recognition.lang = getSpeechRecognitionCode(context.language);
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((res: any) => res[0].transcript)
          .join("");
        setSpokenTranscript(transcript);

        if (event.results[0]?.isFinal) {
          recognition.stop();
          processQueryAndSpeak(transcript);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.warn("[VoiceHelp] Recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          const micMsg = isEn
            ? "Microphone permission not granted. You can proceed using the options on the screen."
            : "माइक्रोफोन की अनुमति नहीं मिली। आप चाहें तो नीचे दिए विकल्पों से आगे बढ़ सकते हैं।";
          setErrorMessage(micMsg);
          setStatus("error");
          speakAloud(micMsg, context.language);
        } else if (event.error === "no-speech") {
          const noSpeechMsg = isEn
            ? "I didn't hear anything. Tap 'Speak Again' when you're ready."
            : "आपकी आवाज़ नहीं सुनाई दी। तैयार होने पर 'फिर से बोलें' दबाएं।";
          setErrorMessage(noSpeechMsg);
          setStatus("idle");
        } else {
          setStatus("idle");
        }
      };

      recognition.onend = () => {
        // If still listening and no transcript captured, transition to idle
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
        : "माइक्रोफोन शुरू करने में समस्या आई। कृपया स्क्रीन पर दिए विकल्पों से आगे बढ़ें।";
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
  }, [isOpen]); // Only rerun when isOpen changes

  if (!isOpen) return null;

  return (
    <div
      role="region"
      aria-label="Voice Help Assistant"
      className="w-full bg-[#f2faf3] border-b border-[#bbf7d0] px-4 py-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-200 transition-all"
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Indicator & Status / Answer */}
        <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
          {/* Animated Icon Avatar */}
          <div className="relative flex-shrink-0 mt-0.5 sm:mt-0">
            {status === "listening" && (
              <span className="absolute -inset-1 rounded-full bg-[#22c55e]/30 animate-ping" />
            )}
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all ${
                status === "listening"
                  ? "bg-[#165420] text-white border-[#165420] shadow-sm"
                  : status === "speaking"
                  ? "bg-[#059669] text-white border-[#059669] shadow-sm"
                  : status === "processing"
                  ? "bg-[#eab308] text-white border-[#ca8a04]"
                  : status === "error"
                  ? "bg-[#fef2f2] text-[#dc2626] border-[#fecaca]"
                  : "bg-white text-[#165420] border-[#cbd5e1]"
              }`}
            >
              {status === "listening" ? (
                <Mic className="w-5 h-5 animate-pulse" />
              ) : status === "speaking" ? (
                <Volume2 className="w-5 h-5 animate-bounce" />
              ) : status === "processing" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : status === "error" ? (
                <AlertCircle className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </div>
          </div>

          {/* Spoken Text & Contextual Guidance */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#165420]">
                {status === "listening"
                  ? isEn ? "🎤 Listening..." : "🎤 सुन रहा हूँ..."
                  : status === "processing"
                  ? isEn ? "⏳ Thinking..." : "⏳ सोच रहा हूँ..."
                  : status === "speaking"
                  ? isEn ? "🔊 Speaking..." : "🔊 बोल रहा हूँ..."
                  : isEn ? "AgriPulse Voice Guide" : "AgriPulse बोलकर मदद"}
              </span>
            </div>

            {/* Main message */}
            <p className="text-sm font-semibold text-[#0f172a] mt-0.5 leading-snug break-words">
              {status === "listening" ? (
                spokenTranscript ? (
                  `"${spokenTranscript}"`
                ) : (
                  isEn ? "I am listening... Please speak your question." : "मैं सुन रहा हूँ... कृपया अपनी समस्या या प्रश्न बोलिए।"
                )
              ) : status === "processing" ? (
                isEn ? "Processing your question..." : "आपके सवाल का समाधान तैयार हो रहा है..."
              ) : assistantResponse ? (
                assistantResponse
              ) : errorMessage ? (
                errorMessage
              ) : (
                isEn
                  ? "Tap 'Speak Again' if you need help navigating login or registration."
                  : "लॉगिन या खाता चुनने में सहायता के लिए 'फिर से बोलें' पर टैप करें।"
              )}
            </p>
          </div>
        </div>

        {/* Right: Simple Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
          {/* Stop Button (active during listening or speaking) */}
          {(status === "listening" || status === "speaking") && (
            <button
              type="button"
              onClick={handleStop}
              className="h-8 px-2.5 rounded-md bg-[#fee2e2] text-[#991b1b] border border-[#fecaca] text-xs font-bold flex items-center gap-1 active:scale-95 transition-all hover:bg-[#fecaca] cursor-pointer"
              title={isEn ? "Stop" : "रोकें"}
              aria-label={isEn ? "Stop" : "रोकें"}
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>{isEn ? "Stop" : "रोकें"}</span>
            </button>
          )}

          {/* Retry / Speak Again Button */}
          {status !== "listening" && status !== "processing" && (
            <button
              type="button"
              onClick={startListening}
              className="h-8 px-3 rounded-md bg-[#165420] text-white text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all hover:bg-[#124219] cursor-pointer shadow-2xs"
              title={isEn ? "Speak Again" : "फिर से बोलें"}
              aria-label={isEn ? "Speak Again" : "फिर से बोलें"}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isEn ? "Speak Again" : "फिर से बोलें"}</span>
            </button>
          )}

          {/* Close Button */}
          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-md bg-white text-[#64748b] hover:text-[#0f172a] hover:bg-[#e2e8f0] border border-[#cbd5e1] flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            title={isEn ? "Close" : "बंद करें"}
            aria-label={isEn ? "Close" : "बंद करें"}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
