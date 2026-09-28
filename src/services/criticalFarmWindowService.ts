import {
  CriticalFarmWindowResult,
  FarmerRequiredTime,
  ProblemSeverity,
  AIDiagnosisResult,
} from "@/types";

export interface CriticalFarmWindowInput {
  severity: ProblemSeverity;
  requiredTime: FarmerRequiredTime;
  machineType?: string;
  complaintText?: string;
  diagnosis?: AIDiagnosisResult;
}

/**
 * Evaluates the baseline problem severity using deterministic rules
 * based on diagnosis keywords, photo analysis, and complaint text.
 */
export function determineProblemSeverity(
  complaintText: string,
  diagnosis?: AIDiagnosisResult
): ProblemSeverity {
  const text = (complaintText || "").toLowerCase();
  const problem = (diagnosis?.possibleProblem || "").toLowerCase();

  // 1. Critical Severity: Smoke / Fire / Sparking / Dangerous Electrical or Fire Risk
  if (
    text.includes("धुआं") ||
    text.includes("धुआ") ||
    text.includes("धुंआ") ||
    text.includes("smoke") ||
    text.includes("काला धुआं") ||
    text.includes("चिंगारी") ||
    text.includes("spark") ||
    text.includes("आग") ||
    text.includes("fire") ||
    problem.includes("धुआं")
  ) {
    return "critical";
  }

  // 2. High Severity: Major leakage / Engine overheating
  if (
    text.includes("गरम") ||
    text.includes("हीट") ||
    text.includes("ओवरहीट") ||
    text.includes("overheating") ||
    text.includes("रेडिएटर") ||
    text.includes("रिसना") ||
    text.includes("रिसाव") ||
    text.includes("leak") ||
    text.includes("लीक") ||
    text.includes("तेल") ||
    problem.includes("ओवरहीटिंग") ||
    problem.includes("रिसाव")
  ) {
    return "high";
  }

  // 3. Low Severity: Minor visible damage / dent / minor scratches
  if (
    (text.includes("दरार") ||
      text.includes("डेंट") ||
      text.includes("खरोंच") ||
      text.includes("damage") ||
      text.includes("crack")) &&
    !text.includes("धुआं") &&
    !text.includes("गरम") &&
    !text.includes("चालू नहीं")
  ) {
    return "low";
  }

  // 4. Medium Severity: Machine not starting / Unusual sound / Pump issue / Unknown
  return "medium";
}

/**
 * Checks for high-risk safety hazards and returns the mandatory safety warning.
 *
 * Section 5:
 * If the diagnosis suggests:
 * - smoke
 * - fire
 * - sparking
 * - dangerous overheating
 * - major fuel/oil leakage
 * Show: "⚠️ मशीन बंद रखें और सुरक्षित दूरी बनाए रखें।"
 */
export function evaluateSafetyWarning(
  complaintText: string,
  diagnosis?: AIDiagnosisResult,
  severity?: ProblemSeverity
): string | undefined {
  const text = (complaintText || "").toLowerCase();
  const problem = (diagnosis?.possibleProblem || "").toLowerCase();

  const isHazardous =
    severity === "critical" ||
    text.includes("धुआं") ||
    text.includes("धुआ") ||
    text.includes("धुंआ") ||
    text.includes("smoke") ||
    text.includes("आग") ||
    text.includes("fire") ||
    text.includes("चिंगारी") ||
    text.includes("spark") ||
    text.includes("ओवरहीट") ||
    text.includes("रेडिएटर") ||
    text.includes("गरम") ||
    text.includes("ईंधन") ||
    text.includes("fuel") ||
    text.includes("तेल") ||
    text.includes("रिसना") ||
    problem.includes("धुआं") ||
    problem.includes("ओवरहीटिंग") ||
    problem.includes("रिसाव");

  if (isHazardous) {
    return "⚠️ मशीन बंद रखें और सुरक्षित दूरी बनाए रखें।";
  }

  return undefined;
}

/**
 * Critical Farm Window Engine (Phase 2D-C)
 *
 * Combines machine problem severity with farmer's immediate farm-work window
 * to compute deterministic urgency, explanation, and safety directives.
 */
export function calculateCriticalFarmWindow(
  input: CriticalFarmWindowInput
): CriticalFarmWindowResult {
  const { severity, requiredTime, complaintText = "", diagnosis } = input;

  // Base numerical scores for internal scoring logic (not shown to farmer)
  const severityScores: Record<ProblemSeverity, number> = {
    critical: 90,
    high: 70,
    medium: 50,
    low: 25,
  };

  const timeScores: Record<FarmerRequiredTime, number> = {
    today: 40,
    within_2_3_days: 20,
    not_urgent: 5,
  };

  const score = severityScores[severity] + timeScores[requiredTime];

  // Safety rule check (evaluated universally regardless of required time)
  const safetyMessage = evaluateSafetyWarning(complaintText, diagnosis, severity);

  // Deterministic rule resolution
  // 1. Emergency Case:
  // - Critical + today
  // - High + today
  if (
    (severity === "critical" && requiredTime === "today") ||
    (severity === "high" && requiredTime === "today")
  ) {
    return {
      urgency: "emergency",
      urgencyLabelHi: "🔴 तुरंत मदद चाहिए",
      score,
      reason:
        "आपको यह मशीन आज चाहिए और समस्या गंभीर हो सकती है, इसलिए इसे सर्वोच्च प्राथमिकता दी गई है।",
      recommendedResponseTime: "2 से 4 घंटे के भीतर",
      safetyMessage,
    };
  }

  // 2. Urgent Cases:
  // - Medium + today (Test 2: Machine not starting + today -> जल्द मरम्मत करें)
  // - Low + today
  // - Critical + within_2_3_days
  // - High + within_2_3_days
  // - Critical + not_urgent (Test 4: Smoke + not_urgent -> critical hazard requires prompt attention + safety message)
  if (
    (severity === "medium" && requiredTime === "today") ||
    (severity === "low" && requiredTime === "today") ||
    (severity === "critical" && requiredTime === "within_2_3_days") ||
    (severity === "high" && requiredTime === "within_2_3_days") ||
    (severity === "critical" && requiredTime === "not_urgent")
  ) {
    let reason = "आपको यह मशीन जल्द चाहिए, इसलिए नजदीकी मैकेनिक को शीघ्र भेजा जाएगा।";
    if (requiredTime === "today" && severity === "medium") {
      reason = "मशीन की आज खेत में आवश्यकता है, इसलिए इसे प्राथमिकता सूची में रखा गया है।";
    } else if (requiredTime === "not_urgent" && severity === "critical") {
      reason = "मशीन की तुरंत आवश्यकता नहीं है, लेकिन खराबी गंभीर होने के कारण मैकेनिक को सतर्क किया गया है।";
    }

    return {
      urgency: "urgent",
      urgencyLabelHi: "🟠 जल्द मरम्मत करें",
      score,
      reason,
      recommendedResponseTime: "आज या 24 घंटे के भीतर",
      safetyMessage,
    };
  }

  // 3. Normal Cases:
  // - Medium + within_2_3_days
  // - Low + within_2_3_days
  // - High + not_urgent
  // - Medium + not_urgent
  // - Low + not_urgent (Test 3: Minor damage + not_urgent -> सामान्य मरम्मत)
  let normalReason = "समस्या सामान्य है और मशीन की तुरंत आवश्यकता नहीं है।";
  if (severity === "low" && requiredTime === "not_urgent") {
    normalReason = "समस्या सामान्य प्रकृति की है और मशीन की अभी जल्दी नहीं है, इसलिए सामान्य क्रम में मरम्मत होगी।";
  } else if (requiredTime === "within_2_3_days") {
    normalReason = "मशीन अगले 2–3 दिन में चाहिए, इसलिए सुविधाजनक समय पर मरम्मत पूरी कर ली जाएगी।";
  }

  return {
    urgency: "normal",
    urgencyLabelHi: "🟢 सामान्य मरम्मत",
    score,
    reason: normalReason,
    recommendedResponseTime: "2 से 3 दिन के भीतर",
    safetyMessage,
  };
}
