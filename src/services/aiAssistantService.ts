/**
 * AI Assistant Service — P2I Step 1 AgriPulse
 *
 * Secure client-side abstraction connecting the UI to the server-side AI API route.
 * Never calls AI providers directly from the browser and preserves complete local/offline fallback.
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
import { runDemoAIDiagnosis } from "./diagnosisService";

export interface AIDiagnosisRequestParams {
  machine?: Machine;
  problemDescription: string;
  hasPhoto?: boolean;
  photoAnalysis?: PhotoAnalysisResult;
  urgency?: UrgencyType;
}

const MANDATORY_DANGER_WARNING = "⚠️ मशीन बंद रखें और सुरक्षित दूरी बनाए रखें।";

/**
 * Checks for inherently dangerous machine conditions.
 * Requirement 5: Safety rules must run before displaying the AI recommendation.
 */
export function checkDangerousCondition(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const dangerousKeywords = [
    "धुआं",
    "धुआ",
    "धुंआ",
    "smoke",
    "काला धुआं",
    "सफेद धुआं",
    "आग",
    "fire",
    "ज्वाला",
    "लपट",
    "चिनगारी",
    "spark",
    "sparking",
    "स्परकिंग",
    "ओवरहीट",
    "overheat",
    "overheating",
    "अत्यधिक गरम",
    "बहुत गरम",
    "ईंधन रिसाव",
    "fuel leak",
    "oil leak",
    "डीजल रिसाव",
    "पेट्रोल रिसाव",
    "बड़ा रिसाव",
    "वायरिंग",
    "शॉर्ट सर्किट",
    "electrical damage",
    "कटा तार",
    "शॉर्ट",
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
 * 1. If offline, immediately runs the local deterministic engine without network calls.
 * 2. If online, requests the secure server-side /api/diagnosis endpoint.
 * 3. If cloud request fails or returns fallback, seamlessly uses the local engine.
 * 4. Safety rules run before returning the diagnosis.
 */
export async function requestAIDiagnosis(
  params: AIDiagnosisRequestParams,
  isOnline: boolean
): Promise<AIDiagnosisResult> {
  const isActuallyOnline =
    isOnline &&
    (typeof navigator === "undefined" || navigator.onLine);

  // Requirement 7: When offline, cloud AI request must NOT be attempted
  if (!isActuallyOnline) {
    const localResult = runDemoAIDiagnosis({
      machine: params.machine,
      problemDescription: params.problemDescription,
      hasPhoto: params.hasPhoto,
      photoAnalysis: params.photoAnalysis,
    });

    const fallbackResult: AIDiagnosisResult = {
      ...localResult,
      provider: "local_engine",
      isFallback: true,
      fallbackNote: "अभी सामान्य जाँच उपलब्ध है।",
    };

    return applySafetySanitization(fallbackResult, params);
  }

  // When online, request secure server-side AI route
  try {
    const payload = {
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
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

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
        const res: StructuredAIDiagnosisResponse = data.result;
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
          urgencyLevel === "high" ? "🔴 तुरंत मदद चाहिए" : "🟡 सामान्य ध्यान दें";
        const urgencyColor =
          urgencyLevel === "high"
            ? "bg-red-100 text-red-900 border-red-300"
            : "bg-amber-100 text-amber-900 border-amber-300";

        const cloudResult: AIDiagnosisResult = {
          id: `diag-cloud-${Date.now()}`,
          possibleProblem: res.diagnosis,
          confidence: `${confidenceVal}%`,
          confidenceValue: confidenceVal,
          reasons: Array.isArray(res.reasons) ? res.reasons : [res.diagnosis],
          safeAction: res.recommendedAction,
          urgencyLevel,
          urgencyText,
          urgencyColor,
          disclaimer: "यह AI प्रारंभिक जाँच है। अंतिम पुष्टि मैकेनिक करेगा।",
          matchedRule: "cloud_ai_provider",
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

    // Server signaled fallback or network failure -> use local engine
    const localFallback = runDemoAIDiagnosis({
      machine: params.machine,
      problemDescription: params.problemDescription,
      hasPhoto: params.hasPhoto,
      photoAnalysis: params.photoAnalysis,
    });

    return applySafetySanitization(
      {
        ...localFallback,
        provider: "local_engine",
        isFallback: true,
        fallbackNote: "अभी सामान्य जाँच उपलब्ध है।",
      },
      params
    );
  } catch {
    // Fail-safe catch -> local engine
    const localFallback = runDemoAIDiagnosis({
      machine: params.machine,
      problemDescription: params.problemDescription,
      hasPhoto: params.hasPhoto,
      photoAnalysis: params.photoAnalysis,
    });

    return applySafetySanitization(
      {
        ...localFallback,
        provider: "local_engine",
        isFallback: true,
        fallbackNote: "अभी सामान्य जाँच उपलब्ध है।",
      },
      params
    );
  }
}
