import { LanguageCode, getSpeechRecognitionCode } from "@/i18n";
import { VoiceHelpRequest, VoiceHelpResponse, VoiceHelpScreenContext } from "@/types/voiceAssistant";

/**
 * Sends farmer voice question with full screen context to the server-side assistant API.
 */
export async function askVoiceHelp(
  userQuery: string,
  context: VoiceHelpScreenContext
): Promise<VoiceHelpResponse> {
  const isEn = context.language === "en";
  const defaultFallback = isEn
    ? "Currently unable to assist by voice. You can proceed using the options on screen."
    : "अभी मैं आपकी आवाज़ से मदद नहीं कर पा रहा हूँ। आप स्क्रीन पर दिए विकल्पों से आगे बढ़ सकते हैं।";

  try {
    const payload: VoiceHelpRequest = {
      userQuery,
      context,
    };

    const res = await fetch("/api/assistant/voice-help", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data: VoiceHelpResponse = await res.json();
      return data;
    }
  } catch (err) {
    console.warn("[VoiceAssistantService] Offline or network error, falling back locally:", err);
  }

  // Graceful failure fallback
  return {
    success: true,
    spokenText: defaultFallback,
    fallbackUsed: true,
  };
}

/**
 * Text-to-Speech Engine using window.speechSynthesis.
 */
export function speakAloud(
  text: string,
  language: LanguageCode = "hi",
  onEnd?: () => void,
  onError?: () => void
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    onEnd?.();
    return null;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const speechCode = getSpeechRecognitionCode(language);
    utterance.lang = speechCode;
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    // Pick best matching voice if available
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(
      (v) => v.lang === speechCode || v.lang.startsWith(language)
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onend = () => {
      onEnd?.();
    };

    utterance.onerror = () => {
      onError?.();
    };

    window.speechSynthesis.speak(utterance);
    return utterance;
  } catch {
    onError?.();
    return null;
  }
}

/**
 * Immediately cancels any active TTS speech playback.
 */
export function stopSpeech(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}
