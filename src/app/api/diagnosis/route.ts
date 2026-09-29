import { NextRequest, NextResponse } from "next/server";
import { StructuredAIDiagnosisResponse } from "@/types";

/**
 * /api/diagnosis — Secure Server-Side Gemini AI Diagnosis Route
 *
 * Accepts text complaints + optional base64 image.
 * Uses gemini-2.0-flash for text-only, gemini-2.0-flash for multimodal (image+text).
 * Returns structured JSON diagnosis. NEVER leaks API key to client.
 * Safety rules always run server-side before returning to farmer.
 */

const MANDATORY_DANGER_WARNING = "⚠️ मशीन बंद रखें और सुरक्षित दूरी बनाए रखें।";

// Map of language codes to language names for the Gemini prompt
const LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi (हिन्दी)",
  en: "English",
  mr: "Marathi (मराठी)",
  te: "Telugu (తెలుగు)",
  pa: "Punjabi (ਪੰਜਾਬੀ)",
  gu: "Gujarati (ગુજરાતી)",
  ta: "Tamil (தமிழ்)",
  bn: "Bengali (বাংলা)",
  kn: "Kannada (ಕನ್ನಡ)",
  ml: "Malayalam (മലയാളം)",
  or: "Odia (ଓଡ଼ିଆ)",
  as: "Assamese (অসমীয়া)",
  ur: "Urdu (اردو)",
  bgc: "Haryanvi (हरियाणवी)",
  raj: "Rajasthani / Marwari (राजस्थानी)",
};

function checkDangerousCondition(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const dangerousKeywords = [
    "धुआं", "धुआ", "धुंआ", "smoke", "काला धुआं", "सफेद धुआं",
    "आग", "fire", "ज्वाला", "लपट", "चिनगारी", "spark", "sparking",
    "ओवरहीट", "overheat", "overheating", "अत्यधिक गरम", "बहुत गरम",
    "ईंधन रिसाव", "fuel leak", "oil leak", "डीजल रिसाव", "पेट्रोल रिसाव",
    "बड़ा रिसाव", "वायरिंग", "शॉर्ट सर्किट", "electrical damage", "कटा तार", "शॉर्ट",
  ];
  return dangerousKeywords.some((kw) => lower.includes(kw));
}

/**
 * Extract MIME type from a data URL or infer from base64 string.
 */
function getImageMimeType(imageBase64: string): string {
  if (imageBase64.startsWith("data:image/png")) return "image/png";
  if (imageBase64.startsWith("data:image/webp")) return "image/webp";
  if (imageBase64.startsWith("data:image/gif")) return "image/gif";
  return "image/jpeg"; // default
}

/**
 * Strip the data URL prefix and return raw base64 bytes.
 */
function stripDataUrlPrefix(imageBase64: string): string {
  const commaIdx = imageBase64.indexOf(",");
  return commaIdx !== -1 ? imageBase64.slice(commaIdx + 1) : imageBase64;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, fallback: true, message: "अभी सामान्य जाँच उपलब्ध है।" },
        { status: 200 }
      );
    }

    const {
      machineType = "कृषि मशीन",
      machineModel = "",
      farmerComplaint = "",
      detectedVisualIssue = "",
      urgency = "",
      recentHistory = "",
      // New fields for Gemini Vision + language
      imageBase64 = "",     // optional base64 image (data URL or raw base64)
      language = "hi",      // LanguageCode from the app's i18n system
    } = body;

    const hasImage = typeof imageBase64 === "string" && imageBase64.length > 200;
    const langName = LANGUAGE_NAMES[language] || LANGUAGE_NAMES["hi"];

    // Server-side safety evaluation runs FIRST before any AI call
    const isDangerous =
      checkDangerousCondition(farmerComplaint) ||
      checkDangerousCondition(detectedVisualIssue);

    // Read API key — supports both AI_API_KEY and GEMINI_API_KEY for flexibility
    const apiKey = (process.env.AI_API_KEY || process.env.GEMINI_API_KEY)?.trim();

    if (!apiKey) {
      return NextResponse.json(
        { success: false, fallback: true, message: "अभी सामान्य जाँच उपलब्ध है।", isDangerous },
        { status: 200 }
      );
    }

    // ─── Build Gemini Prompt ────────────────────────────────────────────────

    const systemPrompt = `You are AgriPulse, a practical agricultural equipment troubleshooting assistant for Indian farmers.

Your job is to help identify possible machine problems from the farmer's description and/or uploaded image.

CRITICAL RULES:
1. Respond ONLY in ${langName}. Every word of your response must be in ${langName}.
2. Use simple, farmer-friendly language. Avoid all technical jargon.
3. Do NOT claim certainty when the image or information is insufficient.
4. NEVER mention: Gemini, AI model, API, machine learning, confidence score, internal reasoning, backend, prompt, or any AI terminology.
5. SAFETY: If there is ANY indication of smoke, fire, sparks, severe overheating, or fuel/oil leakage, you MUST set severity to "danger", should_stop_machine to true, and mechanic_required to true.
6. If the image is unclear or insufficient, explicitly state that the problem cannot be reliably identified and ask for a clearer photo or more information.
7. Output ONLY a valid JSON object — no markdown, no code blocks, no extra text.

Required JSON schema:
{
  "problem": "string — संभावित समस्या का नाम (in ${langName})",
  "possible_causes": ["string", "string", "string"] — 2–4 causes (in ${langName}),
  "severity": "safe" | "caution" | "danger" | "unknown",
  "immediate_actions": ["string", "string"] — 2–4 safe steps farmer can take (in ${langName}),
  "should_stop_machine": boolean,
  "mechanic_required": boolean,
  "message": "string — one short farmer-friendly summary sentence (in ${langName})"
}`;

    const userPrompt = `कृषि मशीन: ${machineType} ${machineModel}
किसान की शिकायत: ${farmerComplaint || "मशीन में समस्या आ रही है"}
कैमरा / दृश्य विश्लेषण: ${detectedVisualIssue || "उपलब्ध नहीं"}
आवश्यकता / समय: ${urgency || "सामान्य"}
मशीन इतिहास: ${recentHistory || "उपलब्ध नहीं"}
${hasImage ? "\n[Photo attached — please analyze the visible machine condition from the image.]" : ""}

कृपया ऊपर दी गई जानकारी के आधार पर सटीक JSON प्रारूप में जाँच रिपोर्ट दें। सभी उत्तर ${langName} में दें।`;

    // ─── Build Gemini Request Body ──────────────────────────────────────────

    // Choose model: use flash for both text and vision (supports multimodal)
    const geminiModel = "gemini-2.0-flash";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

    // Build the parts array — add image if present
    const userParts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];

    if (hasImage) {
      const mimeType = getImageMimeType(imageBase64);
      const rawBase64 = stripDataUrlPrefix(imageBase64);
      userParts.push({
        inline_data: {
          mime_type: mimeType,
          data: rawBase64,
        },
      });
    }

    userParts.push({ text: userPrompt });

    const requestBody = {
      system_instruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: userParts,
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        maxOutputTokens: 1024,
      },
    };

    // ─── Call Gemini ────────────────────────────────────────────────────────

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000); // 9s timeout for vision

    try {
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(requestBody),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error("[AgriPulse /api/diagnosis] Gemini error:", response.status, errText.slice(0, 200));
        return NextResponse.json(
          { success: false, fallback: true, message: "अभी सामान्य जाँच उपलब्ध है।" },
          { status: 200 }
        );
      }

      const rawJson = await response.json();
      const candidateText =
        rawJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";

      if (!candidateText) {
        return NextResponse.json(
          { success: false, fallback: true, message: "अभी सामान्य जाँच उपलब्ध है।" },
          { status: 200 }
        );
      }

      // ─── Parse Gemini's structured JSON output ──────────────────────────

      let geminiOutput: {
        problem: string;
        possible_causes: string[];
        severity: string;
        immediate_actions: string[];
        should_stop_machine: boolean;
        mechanic_required: boolean;
        message: string;
      };

      try {
        const cleaned = candidateText
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```$/m, "")
          .trim();
        geminiOutput = JSON.parse(cleaned);
      } catch {
        return NextResponse.json(
          { success: false, fallback: true, message: "अभी सामान्य जाँच उपलब्ध है।" },
          { status: 200 }
        );
      }

      // Validate required fields
      if (!geminiOutput.problem || !Array.isArray(geminiOutput.immediate_actions)) {
        return NextResponse.json(
          { success: false, fallback: true, message: "अभी सामान्य जाँच उपलब्ध है।" },
          { status: 200 }
        );
      }

      // ─── Map Gemini output → StructuredAIDiagnosisResponse ─────────────

      // Map severity from new schema to existing StructuredAIDiagnosisResponse schema
      const severityMap: Record<string, "critical" | "high" | "medium" | "low"> = {
        danger: "critical",
        caution: "medium",
        safe: "low",
        unknown: "low",
      };
      const mappedSeverity = severityMap[geminiOutput.severity] || "low";

      // Apply mandatory safety override for dangerous conditions
      const finalSeverity =
        isDangerous ||
        geminiOutput.should_stop_machine ||
        geminiOutput.severity === "danger"
          ? "critical"
          : mappedSeverity;

      const finalSafetyWarning =
        finalSeverity === "critical" ? MANDATORY_DANGER_WARNING : null;

      const finalAction =
        finalSeverity === "critical"
          ? (language === "en"
              ? "Turn off the machine immediately and keep a safe distance. Do not operate under any circumstances. Contact a certified mechanic immediately."
              : "मशीन तुरंत बंद रखें और सुरक्षित दूरी बनाए रखें। किसी भी परिस्थिति में मशीन चालू न करें और तुरंत प्रमाणित मैकेनिक को दिखाएं।")
          : geminiOutput.immediate_actions.join(" | ");

      const parsedOutput: StructuredAIDiagnosisResponse = {
        diagnosis: geminiOutput.problem,
        confidence: finalSeverity === "critical" ? 0.92 : 0.82,
        reasons: geminiOutput.possible_causes || [],
        recommendedAction: finalAction,
        severity: finalSeverity,
        safetyWarning: finalSafetyWarning,
      };

      // Also include the richer Gemini fields for the frontend to use
      const enrichedResult = {
        ...parsedOutput,
        immediate_actions: geminiOutput.immediate_actions,
        should_stop_machine: geminiOutput.should_stop_machine || finalSeverity === "critical",
        mechanic_required: geminiOutput.mechanic_required || finalSeverity === "critical",
        farmer_message: geminiOutput.message,
        has_image_analysis: hasImage,
        language,
      };

      return NextResponse.json({
        success: true,
        fallback: false,
        result: enrichedResult,
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      // Timeout or network error → clean fallback
      const isAbort = fetchErr instanceof Error && fetchErr.name === "AbortError";
      if (!isAbort) {
        console.error("[AgriPulse /api/diagnosis] Fetch error:", fetchErr);
      }
      return NextResponse.json(
        { success: false, fallback: true, message: "अभी सामान्य जाँच उपलब्ध है।" },
        { status: 200 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, fallback: true, message: "अभी सामान्य जाँच उपलब्ध है।" },
      { status: 200 }
    );
  }
}
