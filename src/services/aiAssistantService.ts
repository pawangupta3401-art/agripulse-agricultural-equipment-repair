/**
 * AI Assistant Service — AgriPulse Intelligent Gemini Integration
 *
 * Secure client-side abstraction connecting the UI to the server-side Gemini API route.
 * - NEVER calls Gemini directly from the browser.
 * - Passes the farmer's selected language for localized responses across 15 Indian languages.
 * - Passes the photo as base64 for multimodal Gemini Vision analysis.
 * - Supports multi-turn diagnosis conversation history.
 * - Preserves complete local/offline fallback via the deterministic diagnosis engine.
 * - Strict safety sanitization: high-risk problems enforce critical stop-machine guidance.
 */

import {
  AIDiagnosisResult,
  DiagnosisConversationMessage,
  DiagnosisNextAction,
  DiagnosisSufficiencyStatus,
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
  /** Multi-turn conversation history for step-by-step diagnostic reasoning */
  conversationHistory?: DiagnosisConversationMessage[];
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
    "ब्लास्ट", "फट", "गियर टूटा", "प्रेशर पाइप", "hydraulic burst",
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
    diag.shouldStopMachine ||
    diag.nextAction === "STOP_MACHINE" ||
    !!diag.safetyWarning;

  if (isDangerous) {
    const isEn = params.language === "en";
    const dangerSteps = isEn
      ? [
          "Step 1: Keep the machine stopped immediately.",
          "Step 2: Maintain a safe distance and do not restart.",
          "Step 3: Call a certified mechanic immediately."
        ]
      : [
          "पहला कदम: मशीन को तुरंत बंद रखें।",
          "दूसरा कदम: सुरक्षित दूरी बनाए रखें और दोबारा चालू न करें।",
          "तीसरा कदम: तुरंत मैकेनिक से जांच करवाएं।"
        ];
    const dangerAvoid = isEn
      ? [
          "Do not repeatedly try to start the machine.",
          "Do not touch hot parts, bare wires, or moving components."
        ]
      : [
          "मशीन को बार-बार स्टार्ट करने की कोशिश न करें।",
          "गर्म हिस्सों, खुले तारों या घूमने वाले पुर्जों को हाथ न लगाएं।"
        ];
    const dangerMechanic = isEn
      ? "Call a mechanic immediately. Do not operate the machine."
      : "तुरंत मैकेनिक को बुलाएं। मशीन को बिल्कुल न चलाएं।";
    const dangerUrgency = isEn
      ? "Operating the machine right now is unsafe. Get it inspected first."
      : "अभी मशीन चलाना ठीक नहीं है। पहले जांच करवाएं।";
    const dangerVoice = isEn
      ? "Farmer friend, a serious safety issue is detected with your machine. Please keep the machine stopped immediately and do not restart. Keep a safe distance and call a certified mechanic right away."
      : "किसान जी, मशीन में गंभीर समस्या या खतरे का संकेत है। मशीन को तुरंत बंद रखें और बार-बार स्टार्ट न करें। सुरक्षित दूरी बनाएं और तुरंत मैकेनिक से जांच करवाएं।";

    return {
      ...diag,
      safetyWarning: isEn
        ? "⚠️ Keep machine stopped and maintain safe distance."
        : MANDATORY_DANGER_WARNING,
      safeAction: isEn
        ? "Stop the machine immediately and maintain a safe distance. Do not attempt to run it. Contact a certified mechanic immediately."
        : "मशीन तुरंत बंद रखें और सुरक्षित दूरी बनाए रखें। किसी भी सूरत में मशीन चालू न करें और तुरंत प्रमाणित मैकेनिक को दिखाएं।",
      urgencyLevel: "high",
      urgencyText: isEn ? "🔴 Immediate Action Required" : "🔴 तुरंत मदद चाहिए",
      urgencyColor: "bg-red-100 text-red-900 border-red-300",
      severity: "critical",
      shouldStopMachine: true,
      mechanicRequired: true,
      selfCheckAllowed: false,
      nextAction: "STOP_MACHINE",
      immediateActions: dangerSteps,
      farmerSteps: dangerSteps,
      farmerAvoid: dangerAvoid,
      whenToCallMechanic: dangerMechanic,
      urgencyExplanation: dangerUrgency,
      voiceSummary: dangerVoice,
    };
  }

  return diag;
}

/**
 * Unified AI Diagnosis Request function.
 *
 * Flow:
 * 1. Offline -> runs local deterministic engine immediately (no network call).
 * 2. Online  -> calls /api/diagnosis (server-side Gemini, with language + optional image + history).
 * 3. If cloud request fails -> seamlessly falls back to the local engine with friendly message.
 * 4. Safety rules always run client-side before returning the result to the UI.
 */
export async function requestAIDiagnosis(
  params: AIDiagnosisRequestParams,
  isOnline: boolean
): Promise<AIDiagnosisResult> {
  const isActuallyOnline =
    isOnline && (typeof navigator === "undefined" || navigator.onLine);

  const fallbackMessage =
    params.language === "en"
      ? "AI inspection is not available right now. You can retake the photo or speak directly with a mechanic."
      : "अभी AI जांच उपलब्ध नहीं है। आप फोटो दोबारा भेज सकते हैं या मैकेनिक से बात कर सकते हैं।";

  // When offline, use the local deterministic engine — no network calls
  if (!isActuallyOnline) {
    const localResult = runDemoAIDiagnosis({
      machine: params.machine,
      problemDescription: params.problemDescription,
      hasPhoto: params.hasPhoto,
      photoAnalysis: params.photoAnalysis,
      language: params.language,
    });

    return applySafetySanitization(
      {
        ...localResult,
        provider: "local_engine",
        isFallback: true,
        fallbackNote: fallbackMessage,
        sufficiencyStatus: "sufficient",
        selfCheckAllowed: true,
        nextAction: localResult.urgencyLevel === "high" ? "GET_MECHANIC" : "SELF_CHECK",
        immediateActions: [localResult.safeAction],
        shouldStopMachine: localResult.severity === "critical",
        mechanicRequired: localResult.urgencyLevel === "high",
      },
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
      language: params.language || "hi",
      conversationHistory: params.conversationHistory || [],
    };

    // Include photo for Gemini Vision if available (~3MB limit)
    if (
      params.imageBase64 &&
      params.imageBase64.length > 200 &&
      params.imageBase64.length < 4_000_000
    ) {
      payload.imageBase64 = params.imageBase64;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

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
        const res = data.result as StructuredAIDiagnosisResponse;

        const confidenceVal = Math.round(
          res.confidence <= 1 ? res.confidence * 100 : res.confidence
        );

        const isHigh = res.severity === "critical" || res.severity === "high";
        const isMed = res.severity === "medium";

        const urgencyLevel: DiagnosisUrgency = isHigh ? "high" : isMed ? "medium" : "low";

        const isEn = params.language === "en";
        const urgencyText = isHigh
          ? isEn ? "🔴 Very Urgent" : "🔴 तुरंत मदद चाहिए"
          : isMed
          ? isEn ? "🟠 Prompt Attention" : "🟠 जल्द मरम्मत करें"
          : isEn ? "🟢 Normal" : "🟢 सामान्य जाँच";

        const urgencyColor = isHigh
          ? "bg-red-100 text-red-900 border-red-300"
          : isMed
          ? "bg-amber-100 text-amber-900 border-amber-300"
          : "bg-emerald-100 text-emerald-900 border-emerald-300";

        // Build safe action text from immediateActions or recommendedAction
        const safeAction =
          res.immediateActions && res.immediateActions.length > 0
            ? res.immediateActions.join(" • ")
            : res.recommendedAction;

        const farmerSteps = Array.isArray(res.farmerSteps) && res.farmerSteps.length > 0
          ? res.farmerSteps
          : Array.isArray(res.immediateActions) && res.immediateActions.length > 0
          ? res.immediateActions
          : isEn
          ? ["Step 1: Keep the machine turned off.", "Step 2: Check around the machine for unusual signs.", "Step 3: Have a mechanic inspect it."]
          : ["पहला कदम: मशीन को बंद रखें।", "दूसरा कदम: मशीन के पास से आवाज़ या रिसाव ध्यान से देखें।", "तीसरा कदम: मैकेनिक से जांच करवाएं।"];

        const farmerAvoid = Array.isArray(res.farmerAvoid) && res.farmerAvoid.length > 0
          ? res.farmerAvoid
          : isEn
          ? ["Do not repeatedly try to start the machine."]
          : ["मशीन को बार-बार स्टार्ट करने की कोशिश न करें।"];

        const whenToCallMechanic = res.whenToCallMechanic ||
          (isEn
            ? "If the machine does not start or smoke appears, call a mechanic."
            : "अगर मशीन स्टार्ट नहीं हो रही है या धुआँ निकल रहा है, तो मैकेनिक को बुलाएं।");

        const urgencyExplanation = res.urgencyExplanation ||
          (isHigh
            ? (isEn ? "Operating the machine right now is unsafe. Get it inspected first." : "अभी मशीन चलाना ठीक नहीं है। पहले जांच करवाएं।")
            : (isEn ? "Operating condition is normal. Inspect safely." : "अभी सामान्य स्थिति है। पहले जांच करवाएं।"));

        const voiceSummary = res.voiceSummary ||
          (isEn
            ? `Farmer friend, your machine seems to need an inspection. Please do not repeatedly restart the machine. ${farmerSteps.join(" ")} ${whenToCallMechanic}`
            : `किसान जी, आपकी मशीन में सामान्य जांच की जरूरत लग रही है। अभी मशीन को बार-बार स्टार्ट न करें। ${farmerSteps.join(" ")} ${whenToCallMechanic}`);

        const cloudResult: AIDiagnosisResult = {
          id: `diag-gemini-${Date.now()}`,
          possibleProblem: res.farmerProblem || res.diagnosis,
          confidence: `${confidenceVal}%`,
          confidenceValue: confidenceVal,
          reasons: Array.isArray(res.reasons) ? res.reasons : [res.diagnosis],
          safeAction,
          urgencyLevel,
          urgencyText,
          urgencyColor,
          disclaimer: isEn
            ? "This is an AI preliminary inspection. Final confirmation will be done by the mechanic."
            : "यह AI प्रारंभिक जाँच है। अंतिम पुष्टि मैकेनिक करेगा।",
          matchedRule: params.imageBase64 ? "gemini_vision" : "gemini_text",
          timestamp: new Date().toISOString(),
          photoAnalysis: params.photoAnalysis,
          severity: res.severity as ProblemSeverity,
          safetyWarning: res.safetyWarning,
          isFallback: false,
          provider: "cloud_ai",
          // Step-by-step intelligent diagnosis fields
          sufficiencyStatus: res.sufficiencyStatus || "sufficient",
          machineIdentified: res.machineIdentified,
          problemCategory: res.problemCategory,
          selfCheckAllowed: res.selfCheckAllowed,
          immediateActions: farmerSteps,
          shouldStopMachine: res.shouldStopMachine,
          mechanicRequired: res.mechanicRequired,
          nextAction: res.nextAction || (isHigh ? "GET_MECHANIC" : "SELF_CHECK"),
          question: res.question || "",
          farmerMessage: res.farmerMessage || "",
          conversationHistory: params.conversationHistory,
          // Farmer-Friendly Natural Structured Fields
          farmerProblem: res.farmerProblem || res.diagnosis,
          farmerExplanation: res.farmerExplanation || (res.reasons && res.reasons[0]) || "",
          farmerSteps,
          farmerAvoid,
          whenToCallMechanic,
          urgencyExplanation,
          voiceSummary,
        };

        return applySafetySanitization(cloudResult, params);
      }
    }

    // Cloud failed or returned fallback -> local fallback
    return applySafetySanitization(
      {
        ...runDemoAIDiagnosis({
          machine: params.machine,
          problemDescription: params.problemDescription,
          hasPhoto: params.hasPhoto,
          photoAnalysis: params.photoAnalysis,
          language: params.language,
        }),
        provider: "local_engine",
        isFallback: true,
        fallbackNote: fallbackMessage,
        sufficiencyStatus: "sufficient",
        selfCheckAllowed: true,
        nextAction: "SELF_CHECK",
      },
      params
    );
  } catch {
    // Fail-safe catch -> local engine
    return applySafetySanitization(
      {
        ...runDemoAIDiagnosis({
          machine: params.machine,
          problemDescription: params.problemDescription,
          hasPhoto: params.hasPhoto,
          photoAnalysis: params.photoAnalysis,
          language: params.language,
        }),
        provider: "local_engine",
        isFallback: true,
        fallbackNote: fallbackMessage,
        sufficiencyStatus: "sufficient",
        selfCheckAllowed: true,
        nextAction: "SELF_CHECK",
      },
      params
    );
  }
}
