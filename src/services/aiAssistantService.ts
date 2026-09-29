/**
 * AI Assistant Service — AgriPulse Gemini Integration
 *
 * Secure client-side abstraction connecting the UI to the server-side Gemini API route.
 * - NEVER calls Gemini directly from the browser.
 * - Passes the farmer's selected language so Gemini responds in the right language.
 * - Passes the photo as base64 to the server for Gemini Vision analysis.
 * - Preserves complete local/offline fallback via the deterministic diagnosis engine.
 */

import {
  AIDiagnosisResult,
  DiagnosisUrgency,
  Machine,
  PhotoAnalysisResult,
  ProblemSeverity,
  StructuredAIDiagnosisResponse,
  UrgencyType,
} from "@/types";
import { LanguageCode } from "@/i18n";
import { runDemoAIDiagnosis } from "./diagnosisService";

export interface AIDiagnosisRequestParams {
  machine?: Machine;
  problemDescription: string;
  hasPhoto?: boolean;
  photoAnalysis?: PhotoAnalysisResult;
  urgency?: UrgencyType;
  /** The farmer's currently selected app language — passed to Gemini for localized response */
  language?: LanguageCode;
  /** Raw base64 photo data URL for Gemini Vision — server strips prefix before sending to API */
  imageBase64?: string | null;
}

const MANDATORY_DANGER_WARNING = "⚠️ मशीन बंद रखें और सुरक्षित दूरी बनाए रखें।";

/**
 * Checks for inherently dangerous machine conditions.
 * Safety rules must run BEFORE displaying the AI recommendation.
 */
export function checkDangerousCondition(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const dangerousKeywords = [
    "धुआं", "धुआ", "धुंआ", "smoke", "काला धुआं", "सफेद धुआं",
    "आग", "fire", "ज्वाला", "लपट", "चिनगारी", "spark", "sparking",
    "स्परकिंग", "ओवरहीट", "overheat", "overheating", "अत्यधिक गरम", "बहुत गरम",
    "ईंधन रिसाव", "fuel leak", "oil leak", "डीजल रिसाव", "पेट्रोल रिसाव",
    "बड़ा रिसाव", "वायरिंग", "शॉर्ट सर्किट", "electrical damage", "कटा तार", "शॉर्ट",
  ];
  return dangerousKeywords.some((kw) => lower.includes(kw));
}

/**
 * Applies strict safety sanitization to any diagnosis result before display.
 */
function applySafetySanitization(
  diag: AIDiagnosisResult,
  params: AIDiagnosisRequestParams
): AIDiagnosisResult {
  const isDangerous =
    checkDangerousCondition(params.problemDescription) ||
    checkDangerousCondition(params.photoAnalysis?.detectedIssue || "") ||
    checkDangerousCondition(diag.possibleProblem) ||
    diag.severity === "critical" ||
    !!diag.safetyWarning;

  if (isDangerous) {
    return {
      ...diag,
      safetyWarning: MANDATORY_DANGER_WARNING,
      safeAction:
        "मशीन तुरंत बंद रखें और सुरक्षित दूरी बनाए रखें। किसी भी सूरत में मशीन चालू न करें और तुरंत प्रमाणित मैकेनिक को दिखाएं।",
      urgencyLevel: "high",
      urgencyText: "🔴 तुरंत मदद चाहिए",
      urgencyColor: "bg-red-100 text-red-900 border-red-300",
      severity: "critical",
    };
  }

  return diag;
}

/**
 * Unified AI Diagnosis Request function.
 *
 * Flow:
 * 1. Offline → runs local deterministic engine immediately (no network call).
 * 2. Online  → calls /api/diagnosis (server-side Gemini, with language + optional image).
 * 3. If the cloud request fails → seamlessly falls back to the local engine.
 * 4. Safety rules always run client-side before returning the result to the UI.
 */
export async function requestAIDiagnosis(
  params: AIDiagnosisRequestParams,
  isOnline: boolean
): Promise<AIDiagnosisResult> {
  const isActuallyOnline =
    isOnline && (typeof navigator === "undefined" || navigator.onLine);

  // When offline, use the local deterministic engine — no network calls
  if (!isActuallyOnline) {
    const localResult = runDemoAIDiagnosis({
      machine: params.machine,
      problemDescription: params.problemDescription,
      hasPhoto: params.hasPhoto,
      photoAnalysis: params.photoAnalysis,
    });

    return applySafetySanitization(
      { ...localResult, provider: "local_engine", isFallback: true, fallbackNote: "अभी सामान्य जाँच उपलब्ध है।" },
      params
    );
  }

  // When online, call the secure server-side Gemini route
  try {
    const payload: Record<string, unknown> = {
      machineType: params.machine?.type || params.machine?.nameHi || "कृषि मशीन",
      machineModel: params.machine?.name || "",
      farmerComplaint: params.problemDescription.trim(),
      detectedVisualIssue: params.photoAnalysis?.isClear
        ? `${params.photoAnalysis.detectedIssue} (${params.photoAnalysis.evidence.join(", ")})`
        : "",
      urgency: params.urgency || "today",
      recentHistory: params.machine
        ? `चालू समय: ${params.machine.operatingHours || "0 घंटे"}, पिछली सर्विस: ${params.machine.lastService || "अज्ञात"}`
        : "",
      // Pass language for localized Gemini response
      language: params.language || "hi",
    };

    // Include photo for Gemini Vision if available
    // Only send if within a reasonable size limit (~3MB base64 ≈ ~2MB image)
    if (params.imageBase64 && params.imageBase64.length > 200 && params.imageBase64.length < 4_000_000) {
      payload.imageBase64 = params.imageBase64;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s for vision requests

    const response = await fetch("/api/diagnosis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (response && response.ok) {
      const data = await response.json().catch(() => null);

      if (data && data.success && data.result) {
        const res = data.result as StructuredAIDiagnosisResponse & {
          immediate_actions?: string[];
          should_stop_machine?: boolean;
          mechanic_required?: boolean;
          farmer_message?: string;
          has_image_analysis?: boolean;
        };

        const confidenceVal = Math.round(
          res.confidence <= 1 ? res.confidence * 100 : res.confidence
        );

        const urgencyLevel: DiagnosisUrgency =
          res.severity === "critical" || res.severity === "high"
            ? "high"
            : res.severity === "medium"
            ? "medium"
            : "low";

        const urgencyText =
          urgencyLevel === "high"
            ? "🔴 तुरंत मदद चाहिए"
            : urgencyLevel === "medium"
            ? "🟠 जल्द मरम्मत करें"
            : "🟢 सामान्य जाँच";

        const urgencyColor =
          urgencyLevel === "high"
            ? "bg-red-100 text-red-900 border-red-300"
            : urgencyLevel === "medium"
            ? "bg-amber-100 text-amber-900 border-amber-300"
            : "bg-emerald-100 text-emerald-900 border-emerald-300";

        // Build the recommended action — prefer immediate_actions list for richer display
        const safeAction =
          res.immediate_actions && res.immediate_actions.length > 0
            ? res.immediate_actions.join(" • ")
            : res.recommendedAction;

        const cloudResult: AIDiagnosisResult = {
          id: `diag-gemini-${Date.now()}`,
          possibleProblem: res.diagnosis,
          confidence: `${confidenceVal}%`,
          confidenceValue: confidenceVal,
          reasons: Array.isArray(res.reasons) ? res.reasons : [res.diagnosis],
          safeAction,
          urgencyLevel,
          urgencyText,
          urgencyColor,
          disclaimer: "यह AI प्रारंभिक जाँच है। अंतिम पुष्टि मैकेनिक करेगा।",
          matchedRule: res.has_image_analysis ? "gemini_vision" : "gemini_text",
          timestamp: new Date().toISOString(),
          photoAnalysis: params.photoAnalysis,
          severity: res.severity as ProblemSeverity,
          safetyWarning: res.safetyWarning,
          isFallback: false,
          provider: "cloud_ai",
        };

        return applySafetySanitization(cloudResult, params);
      }
    }

    // Server signaled fallback or network failure → use local engine
    return applySafetySanitization(
      {
        ...runDemoAIDiagnosis({
          machine: params.machine,
          problemDescription: params.problemDescription,
          hasPhoto: params.hasPhoto,
          photoAnalysis: params.photoAnalysis,
        }),
        provider: "local_engine",
        isFallback: true,
        fallbackNote: "अभी सामान्य जाँच उपलब्ध है।",
      },
      params
    );
  } catch {
    // Fail-safe catch → local engine, never crash the UI
    return applySafetySanitization(
      {
        ...runDemoAIDiagnosis({
          machine: params.machine,
          problemDescription: params.problemDescription,
          hasPhoto: params.hasPhoto,
          photoAnalysis: params.photoAnalysis,
        }),
        provider: "local_engine",
        isFallback: true,
        fallbackNote: "अभी सामान्य जाँच उपलब्ध है।",
      },
      params
    );
  }
}
