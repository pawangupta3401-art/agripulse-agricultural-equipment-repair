import { NextRequest, NextResponse } from "next/server";
import { GeminiStructuredDiagnosis, StructuredAIDiagnosisResponse } from "@/types";

/**
 * /api/diagnosis — Intelligent Step-by-Step Gemini AI Diagnosis Route
 *
 * Implements the intelligent agricultural equipment troubleshooting pipeline:
 * INPUT -> UNDERSTAND -> CHECK INFORMATION QUALITY -> IDENTIFY MACHINE ->
 * IDENTIFY PROBLEM -> CHECK SAFETY -> DECIDE IF MORE INFO NEEDED ->
 * (ASK ONE SIMPLE QUESTION IF INSUFFICIENT) -> GENERATE POSSIBLE DIAGNOSIS ->
 * GENERATE SAFE ACTIONS -> DECIDE NEXT STEP -> FARMER-FRIENDLY MULTILINGUAL RESPONSE
 *
 * Security:
 * - Server-side only: GEMINI_API_KEY / AI_API_KEY is NEVER exposed to the client.
 * - Always runs server-side safety checks before returning.
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

/**
 * Server-side deterministic danger check.
 * Catches high-risk situations (smoke, fire, sparks, extreme overheating, fuel/oil leaks, electrical hazards).
 */
function checkDangerousCondition(text: string): boolean {
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
 * Extract MIME type from data URL or infer from base64 string.
 */
function getImageMimeType(imageBase64: string): string {
  if (imageBase64.startsWith("data:image/png")) return "image/png";
  if (imageBase64.startsWith("data:image/webp")) return "image/webp";
  if (imageBase64.startsWith("data:image/gif")) return "image/gif";
  return "image/jpeg";
}

/**
 * Strip the data URL prefix and return raw base64.
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
        {
          success: false,
          fallback: true,
          message: "अभी AI जांच उपलब्ध नहीं है। बुनियादी जांच के लिए यह तरीका देखें।",
        },
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
      imageBase64 = "",
      language = "hi",
      conversationHistory = [],
    } = body;

    const hasImage = typeof imageBase64 === "string" && imageBase64.length > 200;
    const langName = LANGUAGE_NAMES[language] || LANGUAGE_NAMES["hi"];

    // ── 1. Check Server-side Danger Keywords First ──────────────────────────
    const complaintDangerous =
      checkDangerousCondition(farmerComplaint) ||
      checkDangerousCondition(detectedVisualIssue);

    // Read API key
    const apiKey = (process.env.AI_API_KEY || process.env.GEMINI_API_KEY)?.trim();

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          fallback: true,
          message: "अभी AI जांच उपलब्ध नहीं is। बुनियादी जांच के लिए यह तरीका देखें।",
          isDangerous: complaintDangerous,
        },
        { status: 200 }
      );
    }

    // ── 2. Build Gemini System Prompt (Core Decision Pipeline) ──────────────
    const systemPrompt = `You are AgriPulse, an expert, careful agricultural equipment troubleshooting assistant for Indian farmers.
You diagnose farm equipment (tractors, power tillers, harvesters, water pumps, sprayers, rotavators, threshers, etc.).

YOU MUST FOLLOW THIS STRICT DECISION PIPELINE:
1. UNDERSTAND: Understand the machine, complaint, and any image provided.
2. CHECK INFORMATION QUALITY:
   - If a photo is attached:
     * Is an agricultural machine or part visible? If NO (e.g. photo is of a person, animal, random object, ceiling): return status: "insufficient", next_action: "NEED_MORE_INFORMATION", question: "कृपया मशीन या खराब हिस्से की फोटो लें।" (in ${langName}).
     * Is the photo blurry or unclear? If YES: return status: "insufficient", next_action: "NEED_MORE_INFORMATION", question: "फोटो साफ नहीं है। कृपया मशीन के खराब हिस्से की नजदीक से एक साफ फोटो लें।" (in ${langName}).
     * Is the wrong part shown? If YES: return status: "insufficient", next_action: "NEED_MORE_INFORMATION", question: "समस्या वाले हिस्से की फोटो लें ताकि मैं बेहतर जांच कर सकूं।" (in ${langName}).
3. IDENTIFY MACHINE:
   - Use the provided machine if known. If completely unknown and necessary, ask "यह कौन सी मशीन है?" (in ${langName}).
4. IDENTIFY PROBLEM & CHECK SUFFICIENCY:
   - If the farmer gives incomplete or vague information (e.g., just "काम नहीं कर रहा" or "आवाज आ रही है" without details) and there is no clear photo:
     DO NOT guess or hallucinate a specific failed component.
     Set status: "insufficient", next_action: "NEED_MORE_INFORMATION".
     Ask exactly ONE simple, specific question to narrow down the problem (e.g., "मशीन स्टार्ट करते समय कोई आवाज आती है क्या?" or "क्या मशीन से धुआं निकल रहा है?" or "क्या तेल नीचे टपक रहा है?").
     DO NOT ask multiple questions. Ask ONLY ONE question at a time.
5. SAFETY CHECK (CRITICAL):
   - Check for danger: smoke, fire, sparks, severe overheating, fuel leakage, major oil leakage, exposed electrical wiring, hydraulic pressure burst, damaged spinning parts, uncontrolled movement.
   - If ANY danger exists:
     * severity MUST BE "danger"
     * should_stop_machine MUST BE true
     * mechanic_required MUST BE true
     * self_check_allowed MUST BE false
     * next_action MUST BE "STOP_MACHINE"
     * immediate_actions: ["मशीन तुरंत बंद रखें", "सुरक्षित दूरी बनाएं", "मैकेनिक को बुलाएं"]
     * message: "मशीन बंद रखें और मैकेनिक से जांच करवाएं।" (in ${langName})
6. DIAGNOSIS (ONLY WHEN INFORMATION IS SUFFICIENT):
   - Possible problem: simple farmer-friendly description.
   - Possible causes: maximum 3 likely causes. Use humble wording like "संभावित कारण" or "हो सकता है".
   - Self-check decision:
     * If the problem can be safely inspected visually (e.g. loose belt, battery terminal loose, low oil level, air filter dirty):
       self_check_allowed = true
       next_action = "SELF_CHECK"
       immediate_actions: maximum 3 simple, low-risk checks (e.g. "1. मशीन बंद करें।", "2. बैटरी कनेक्शन देखें।", "3. ईंधन स्तर जांचें।")
     * If the problem involves high pressure, electrical rewiring, deep engine internals, or mechanical hazards:
       self_check_allowed = false
       mechanic_required = true
       next_action = "GET_MECHANIC"
       immediate_actions: ["मशीन चालू न करें", "योग्य मैकेनिक को दिखाएं"]
7. LANGUAGE & TONE RULES:
   - Output language MUST BE ${langName}. Every single text field MUST be in ${langName}.
   - Farmer-friendly vocabulary only.
   - ABSOLUTELY NEVER MENTION: Gemini, AI, API, model, confidence score, machine learning, prompt, backend, neural network, or developer terminology.
   - If uncertain, be honest: say that the issue cannot be reliably identified yet and ask the next question.

OUTPUT FORMAT:
Return ONLY a valid JSON object strictly matching this schema:
{
  "status": "sufficient" | "insufficient" | "unsafe_to_diagnose",
  "machine": "string (identified machine in ${langName})",
  "problem": "string (clear issue title in ${langName})",
  "problem_category": "string (e.g., Starting / Electrical / Engine / Hydraulic / Cooling / Fuel)",
  "severity": "safe" | "caution" | "danger" | "unknown",
  "possible_causes": ["string"] (max 3 items in ${langName}, empty if insufficient),
  "self_check_allowed": boolean,
  "immediate_actions": ["string"] (max 3 simple steps in ${langName}),
  "should_stop_machine": boolean,
  "mechanic_required": boolean,
  "next_action": "SELF_CHECK" | "GET_MECHANIC" | "NEED_MORE_INFORMATION" | "STOP_MACHINE" | "GENERAL_GUIDANCE",
  "question": "string (ONE simple follow-up question in ${langName} if status is insufficient, else empty string)",
  "message": "string (short farmer-friendly summary message in ${langName})"
}`;

    // ── 3. Build User Prompt with Context & Multi-turn History ──────────────
    let historyContext = "";
    if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
      historyContext = "\n--- पिछली बातचीत का संदर्भ (Conversation History) ---\n" +
        conversationHistory
          .map((m: { role: string; content: string }) =>
            m.role === "farmer" ? `किसान: "${m.content}"` : `सहायक: "${m.content}"`
          )
          .join("\n") +
        "\n--- अब इस नए इनपुट के साथ विश्लेषण करें ---";
    }

    const userPrompt = `कृषि मशीन: ${machineType} ${machineModel}
किसान की वर्तमान शिकायत: "${farmerComplaint || "मशीन में समस्या आ रही है"}"
कैमरा / दृश्य विश्लेषण: ${detectedVisualIssue || "उपलब्ध नहीं"}
समय / जरूरत: ${urgency || "सामान्य"}
मशीन इतिहास: ${recentHistory || "उपलब्ध नहीं"}
${hasImage ? "\n[📷 संलग्न फोटो उपलब्ध है — कृपया छवि में दिखाई दे रहे मशीन/पुर्जे की स्थिति, स्पष्टता और खराबी का विश्लेषण करें।]" : ""}
${historyContext}

कृपया ऊपर दी गई जानकारी का चरण-दर-चरण विश्लेषण करें।
यदि जानकारी अधूरी या फोटो अस्पष्ट है तो केवल 1 सरल सवाल पूछें (status: "insufficient")।
यदि खतरा है तो तुरंत रोकें (status: "unsafe_to_diagnose" या "danger")।
सभी उत्तर ${langName} में दें। केवल JSON रिटर्न करें।`;

    // ── 4. Call Gemini with Model Fallback ──────────────────────────────────
    const CANDIDATE_MODELS = [
      "gemini-3.5-flash",
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
    ];

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
        maxOutputTokens: 2048,
      },
    };

    let candidateText = "";

    for (const model of CANDIDATE_MODELS) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 9500);

      try {
        const response = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify(requestBody),
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const rawJson = await response.json();
          const text =
            rawJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
          if (text) {
            candidateText = text;
            break;
          }
        } else {
          console.warn(`[AgriPulse /api/diagnosis] Model ${model} returned ${response.status}, trying next model...`);
        }
      } catch {
        clearTimeout(timeoutId);
        // Continue to next model
      }
    }

    if (!candidateText) {
      return NextResponse.json(
        {
          success: false,
          fallback: true,
          message: "अभी AI जांच उपलब्ध नहीं है। बुनियादी जांच के लिए यह तरीका देखें।",
          isDangerous: complaintDangerous,
        },
        { status: 200 }
      );
    }



      // ── 5. Parse Gemini Structured Output ────────────────────────────────
      let geminiOutput: GeminiStructuredDiagnosis;
      try {
        const cleaned = candidateText
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```$/m, "")
          .trim();
        geminiOutput = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error("[AgriPulse /api/diagnosis] JSON parse error:", parseErr);
        return NextResponse.json(
          {
            success: false,
            fallback: true,
            message: "अभी AI जांच उपलब्ध नहीं है। बुनियादी जांच के लिए यह तरीका देखें।",
            isDangerous: complaintDangerous,
          },
          { status: 200 }
        );
      }

      // ── 6. Enforce Strict Safety Overrides ────────────────────────────────
      const isDangerous =
        complaintDangerous ||
        geminiOutput.severity === "danger" ||
        geminiOutput.should_stop_machine ||
        geminiOutput.next_action === "STOP_MACHINE";

      const finalSeverity: "critical" | "high" | "medium" | "low" = isDangerous
        ? "critical"
        : geminiOutput.severity === "caution"
        ? "medium"
        : geminiOutput.severity === "safe"
        ? "low"
        : "medium";

      const finalNextAction = isDangerous
        ? "STOP_MACHINE"
        : geminiOutput.next_action ||
          (geminiOutput.status === "insufficient" ? "NEED_MORE_INFORMATION" : "SELF_CHECK");

      const finalSafetyWarning = isDangerous
        ? MANDATORY_DANGER_WARNING
        : null;

      // Recommended action text
      let recommendedActionText = "";
      if (isDangerous) {
        recommendedActionText =
          language === "en"
            ? "Stop the machine immediately and keep a safe distance. Do not operate. Contact a mechanic."
            : "मशीन तुरंत बंद रखें और सुरक्षित दूरी बनाए रखें। किसी भी सूरत में चालू न करें। मैकेनिक से जांच करवाएं।";
      } else if (geminiOutput.question && geminiOutput.status === "insufficient") {
        recommendedActionText = geminiOutput.question;
      } else if (
        Array.isArray(geminiOutput.immediate_actions) &&
        geminiOutput.immediate_actions.length > 0
      ) {
        recommendedActionText = geminiOutput.immediate_actions.join(" • ");
      } else {
        recommendedActionText = geminiOutput.message || "सावधानीपूर्वक जांच करें।";
      }

      // Backward compatible StructuredAIDiagnosisResponse
      const parsedOutput: StructuredAIDiagnosisResponse = {
        diagnosis: geminiOutput.problem || "मशीन समस्या",
        confidence: isDangerous ? 0.95 : geminiOutput.status === "sufficient" ? 0.88 : 0.65,
        reasons: Array.isArray(geminiOutput.possible_causes)
          ? geminiOutput.possible_causes.slice(0, 3)
          : [],
        recommendedAction: recommendedActionText,
        severity: finalSeverity,
        safetyWarning: finalSafetyWarning,
        // Enriched step-by-step fields
        sufficiencyStatus: geminiOutput.status || "sufficient",
        machineIdentified: geminiOutput.machine || machineType,
        problemCategory: geminiOutput.problem_category || "",
        selfCheckAllowed: isDangerous ? false : !!geminiOutput.self_check_allowed,
        immediateActions: isDangerous
          ? ["मशीन तुरंत बंद रखें", "सुरक्षित दूरी बनाएं", "मैकेनिक बुलाएं"]
          : Array.isArray(geminiOutput.immediate_actions)
          ? geminiOutput.immediate_actions.slice(0, 3)
          : [],
        shouldStopMachine: isDangerous || !!geminiOutput.should_stop_machine,
        mechanicRequired: isDangerous || !!geminiOutput.mechanic_required,
        nextAction: finalNextAction,
        question: geminiOutput.question || "",
        farmerMessage: geminiOutput.message || "",
      };

      return NextResponse.json({
        success: true,
        fallback: false,
        result: parsedOutput,
      });

  } catch (err) {
    console.error("[AgriPulse /api/diagnosis] Unhandled route error:", err);
    return NextResponse.json(
      {
        success: false,
        fallback: true,
        message: "अभी AI जांच उपलब्ध नहीं है। बुनियादी जांच के लिए यह तरीका देखें।",
      },
      { status: 200 }
    );
  }
}
