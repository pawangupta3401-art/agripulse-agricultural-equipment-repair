"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Volume2, Loader2, AlertCircle } from "lucide-react";
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
}: VoiceHelpAssistantProps) {
  const [status, setStatus] = useState<VoiceAssistantStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isClosingRef = useRef<boolean>(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isEn = context.language === "en";

  // Stop recognition and speech cleanly
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
    activeUtteranceRef.current = null;
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  // Safe close
  const handleClose = useCallback(() => {
    isClosingRef.current = true;
    handleStop();
    onClose();
  }, [handleStop, onClose]);

  // Process farmer's question through 1000 Q&A Knowledge Base & Speak aloud
  const processQueryAndSpeak = useCallback(
    async (queryText: string) => {
      if (isClosingRef.current) return;
      setStatus("processing");
      setErrorMessage(null);

      try {
        const response: VoiceHelpResponse = await askVoiceHelp(queryText, context);

        if (isClosingRef.current) return;

        const textToSpeak =
          response.spokenText ||
          (isEn
            ? "I could not find the answer to this question. Please check the help section."
            : "मुझे इस सवाल का सही जवाब नहीं मिला। कृपया मदद सेक्शन से सहायता लें।");

        setStatus("speaking");

        activeUtteranceRef.current = speakAloud(
          textToSpeak,
          context.language,
          () => {
            // Once spoken answer finishes, automatically stop & close
            if (!isClosingRef.current) {
              handleClose();
            }
          },
          () => {
            if (!isClosingRef.current) {
              handleClose();
            }
          }
        );
      } catch {
        if (isClosingRef.current) return;
        const fallback = isEn
          ? "I could not find the answer to this question. Please check the help section."
          : "मुझे इस सवाल का सही जवाब नहीं मिला। कृपया मदद सेक्शन से सहायता लें।";
        setStatus("speaking");
        speakAloud(fallback, context.language, () => {
          if (!isClosingRef.current) {
            handleClose();
          }
        });
      }
    },
    [context, handleClose, isEn]
  );

  // Start listening flow immediately upon tap
  const startListening = useCallback(() => {
    handleStop();
    isClosingRef.current = false;
    setErrorMessage(null);

    // Check Web Speech API support
    const windowObj = typeof window !== "undefined" ? (window as unknown as Record<string, unknown>) : null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = windowObj ? ((windowObj.SpeechRecognition || windowObj.webkitSpeechRecognition) as any) : null;

    if (!SpeechRecognition) {
      const msg = isEn
        ? "Microphone is not supported in this browser."
        : "माइक्रोफोन की अनुमति दें, फिर दोबारा कोशिश करें।";
      setErrorMessage(msg);
      setStatus("error");
      speakAloud(msg, context.language, () => {
        setTimeout(() => handleClose(), 2000);
      });
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      const speechCode = getSpeechRecognitionCode(context.language);
      recognition.lang = speechCode;
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setStatus("listening");
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        const query = finalTranscript.trim();
        if (query) {
          try {
            recognition.stop();
          } catch {}
          processQueryAndSpeak(query);
        } else {
          const noHeardMsg = isEn
            ? "I could not hear you clearly. Please speak again."
            : "मुझे ठीक से सुनाई नहीं दिया। कृपया फिर से बोलें।";
          setErrorMessage(noHeardMsg);
          setStatus("error");
          speakAloud(noHeardMsg, context.language, () => {
            setTimeout(() => handleClose(), 2500);
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("[VoiceAI] Recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          const micMsg = isEn
            ? "Please grant microphone permission and try again."
            : "माइक्रोफोन की अनुमति दें, फिर दोबारा कोशिश करें।";
          setErrorMessage(micMsg);
          setStatus("error");
          speakAloud(micMsg, context.language, () => {
            setTimeout(() => handleClose(), 2500);
          });
        } else if (event.error === "no-speech") {
          const noSpeechMsg = isEn
            ? "I could not hear you clearly. Please speak again."
            : "मुझे ठीक से सुनाई नहीं दिया। कृपया फिर से बोलें।";
          setErrorMessage(noSpeechMsg);
          setStatus("error");
          speakAloud(noSpeechMsg, context.language, () => {
            setTimeout(() => handleClose(), 2500);
          });
        } else {
          handleClose();
        }
      };

      recognition.onend = () => {
        // If ended without transcript or processing
        if (status === "listening") {
          const noSpeechMsg = isEn
            ? "I could not hear you clearly. Please speak again."
            : "मुझे ठीक से सुनाई नहीं दिया। कृपया फिर से बोलें।";
          setErrorMessage(noSpeechMsg);
          setStatus("error");
          speakAloud(noSpeechMsg, context.language, () => {
            setTimeout(() => handleClose(), 2500);
          });
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error("[VoiceAI] Start error:", err);
      const micMsg = isEn
        ? "Please grant microphone permission and try again."
        : "माइक्रोफोन की अनुमति दें, फिर दोबारा कोशिश करें।";
      setErrorMessage(micMsg);
      setStatus("error");
      speakAloud(micMsg, context.language, () => {
        setTimeout(() => handleClose(), 2500);
      });
    }
  }, [context.language, handleClose, handleStop, isEn, processQueryAndSpeak, status]);

  // When isOpen changes, trigger voice-only interaction
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

  if (!isOpen && status === "idle") return null;

  // VOICE-ONLY UX:
  // Render ONLY a very small temporary listening/speaking indicator.
  // NO modal backdrop, NO card, NO popup, NO screen takeover.
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto transition-all duration-200"
    >
      {status === "listening" && (
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-950/90 text-white shadow-xl backdrop-blur-md border border-emerald-500/40 text-xs font-bold animate-pulse">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
          </span>
          <span>{isEn ? "🎤 Listening..." : "🎤 सुन रहा हूँ..."}</span>
          <button
            type="button"
            onClick={handleClose}
            className="ml-1 text-emerald-300 hover:text-white text-xs px-1"
            title="रद्द करें"
          >
            ✕
          </button>
        </div>
      )}

      {status === "processing" && (
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-950/90 text-white shadow-xl backdrop-blur-md border border-slate-700 text-xs font-bold animate-fadeIn">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
          <span>{isEn ? "⏳ Understanding..." : "⏳ समझ रहा हूँ..."}</span>
        </div>
      )}

      {status === "speaking" && (
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-emerald-900/95 text-white shadow-xl backdrop-blur-md border border-emerald-400/50 text-xs font-bold animate-fadeIn">
          <Volume2 className="w-3.5 h-3.5 text-emerald-300 animate-bounce" />
          <span>{isEn ? "🔊 Answering..." : "🔊 जवाब दे रहा हूँ..."}</span>
          <button
            type="button"
            onClick={handleClose}
            className="ml-1 text-emerald-200 hover:text-white text-xs px-1"
            title="रोकें"
          >
            ✕
          </button>
        </div>
      )}

      {status === "error" && errorMessage && (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-950/90 text-rose-100 shadow-xl backdrop-blur-md border border-rose-500/50 text-xs font-semibold animate-fadeIn max-w-[90vw]">
          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span className="truncate">{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
