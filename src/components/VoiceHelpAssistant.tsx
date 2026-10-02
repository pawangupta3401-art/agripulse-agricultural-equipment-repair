"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { AlertCircle } from "lucide-react";
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
  onStatusChange?: (status: VoiceAssistantStatus) => void;
  onRequestBreakdown?: () => void;
}

export default function VoiceHelpAssistant({
  isOpen,
  onClose,
  context,
  onStatusChange,
}: VoiceHelpAssistantProps) {
  const [status, setStatus] = useState<VoiceAssistantStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const isClosingRef = useRef<boolean>(false);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isEn = context.language === "en";

  // Notify parent of status changes for in-header button state
  const updateStatus = useCallback(
    (newStatus: VoiceAssistantStatus) => {
      setStatus(newStatus);
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );

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
    updateStatus("idle");
    setErrorMessage(null);
  }, [updateStatus]);

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
      updateStatus("processing");
      setErrorMessage(null);

      try {
        const response: VoiceHelpResponse = await askVoiceHelp(queryText, context);

        if (isClosingRef.current) return;

        const textToSpeak =
          response.spokenText ||
          (isEn
            ? "I could not find the answer to this question. Please check the help section."
            : "मुझे इस सवाल का सही जवाब नहीं मिला। कृपया मदद सेक्शन से सहायता लें।");

        updateStatus("speaking");

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
        updateStatus("speaking");
        speakAloud(fallback, context.language, () => {
          if (!isClosingRef.current) {
            handleClose();
          }
        });
      }
    },
    [context, handleClose, isEn, updateStatus]
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
      updateStatus("error");
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
        updateStatus("listening");
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
          updateStatus("error");
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
          updateStatus("error");
          speakAloud(micMsg, context.language, () => {
            setTimeout(() => handleClose(), 2500);
          });
        } else if (event.error === "no-speech") {
          const noSpeechMsg = isEn
            ? "I could not hear you clearly. Please speak again."
            : "मुझे ठीक से सुनाई नहीं दिया। कृपया फिर से बोलें।";
          setErrorMessage(noSpeechMsg);
          updateStatus("error");
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
          updateStatus("error");
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
      updateStatus("error");
      speakAloud(micMsg, context.language, () => {
        setTimeout(() => handleClose(), 2500);
      });
    }
  }, [context.language, handleClose, handleStop, isEn, processQueryAndSpeak, status, updateStatus]);

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

  // If there's an error message, display an unobtrusive bottom toast (away from header)
  if (status === "error" && errorMessage) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-200"
      >
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 text-white shadow-lg text-xs font-semibold border border-slate-700 max-w-[90vw]">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="truncate">{errorMessage}</span>
        </div>
      </div>
    );
  }

  // Pure voice interaction: header button itself handles the visual state directly!
  // NO overlay, NO duplicate circle, NO floating bubble over header.
  return null;
}
