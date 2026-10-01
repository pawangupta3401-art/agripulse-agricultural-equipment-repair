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

function getUnavailableMessage(language: string): string {
  if (language === "en") {
    return "AI inspection is not available right now. You can retake the photo or speak directly with a mechanic.";
  }
  return "अभी AI जांच उपलब्ध नहीं है। आप फोटो दोबारा भेज सकते हैं या मैकेनिक से बात कर सकते हैं।";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          fallback: true,
          message: getUnavailableMessage("hi"),
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
          message: getUnavailableMessage(language),
          isDangerous: complaintDangerous,
        },
        { status: 200 }
      );
    }

    // ── 2. Build Gemini System Prompt (Farmer-Friendly Decision Pipeline) ──
    const systemPrompt = `You are AgriPulse, an expert, caring, and careful agricultural equipment troubleshooting assistant for Indian farmers.
You diagnose farm equipment (tractors, power tillers, harvesters, water pumps, sprayers, rotavators, threshers, etc.).

IMPORTANT RULES FOR FARMER EXPERIENCE:
- Output MUST be in very simple, natural, conversational, farmer-friendly language.
- The language MUST BE strictly ${langName}. Every field including voice_summary must be in ${langName}.
- NO technical AI terminology (never say AI, Gemini, API, model, neural, prompt, algorithm, dataset).
- NO technical mechanics jargon unless simplified into everyday farmer words.
- NEVER present an unconfirmed diagnosis as a certain fact. Use humble, cautious phrasing:
  In Hindi: "लगता है...", "संभावित समस्या...", "जांच की जरूरत है..." (NEVER "यह निश्चित रूप से खराब है")
  In English: "It seems...", "Potential issue...", "Needs inspection..." (NEVER "This is definitely broken")

SAFETY IS PARAMOUNT (DO NOT GIVE DANGEROUS INSTRUCTIONS):
- Do NOT instruct the farmer to:
  * open dangerous engine components (like pressurized radiator caps, high pressure fuel lines)
  * touch moving machinery or belts
  * work near rotating parts (PTO shaft, blades, pulleys)
  * handle exposed electrical wiring or battery shorting
  * handle fuel dangerously near heat
  * perform complex or hazardous internal repairs
- If ANY dangerous condition is detected (smoke, sparks, fire, strong overheating, fuel leakage, electrical damage, loud knocking):
  * Urgently instruct the farmer to turn off the machine, maintain a safe distance, and call a qualified mechanic immediately.

DECISION PIPELINE:
1. CHECK PHOTO & INFO QUALITY:
   - If photo is unrelated to machine/part or too blurry to see anything:
     status: "insufficient", question: "कृपया मशीन या खराब हिस्से की एक साफ फोटो लें।" (in ${langName}).
2. CHECK SUFFICIENCY:
   - If complaint is too vague (e.g. just "चल नहीं रहा") and no clear photo:
     status: "insufficient", ask ONLY ONE simple question (e.g. "क्या मशीन स्टार्ट करते समय कोई आवाज आती है?").
3. DIAGNOSIS (WHEN SUFFICIENT):
   Formulate a simple 5-part farmer guidance:
   1. WHAT IS THE PROBLEM? ("problem": simple clear explanation of what seems to be the issue)
   2. EXPLANATION: ("explanation": simple reason why this might be happening)
   3. WHAT TO DO NOW: ("steps": 2-3 simple numbered steps the farmer can safely do, e.g. "पहला कदम: मशीन बंद रखें।", "दूसरा कदम: ईंधन और फिल्टर देखें।", "तीसरा कदम: मैकेनिक से जांच करवाएं।")
   4. WHAT NOT TO DO: ("avoid": 1-2 important precautions, e.g. ["मशीन को बार-बार स्टार्ट करने की कोशिश न करें।"])
   5. WHEN TO CALL A MECHANIC: ("when_to_call_mechanic": clear threshold, e.g. "अगर मशीन स्टार्ट नहीं हो रही है या धुआँ निकल रहा है, तो मैकेनिक को बुलाएं।")
   6. URGENCY: ("urgency": "low" | "medium" | "high" | "critical", "urgency_explanation": e.g. "अभी मशीन चलाना ठीक नहीं है। पहले जांच करवाएं।")
   7. VOICE SCRIPT: ("voice_summary": A warm, natural, spoken voice explanation addressing the farmer as "किसान जी" in Hindi or "Farmer friend" in English. Short, step-by-step, simple, natural, spoken style. Perfect for Text-to-Speech playback.)

OUTPUT FORMAT (STRICT JSON ONLY):
Return ONLY a valid JSON object matching this structure:
{
  "status": "sufficient" | "insufficient" | "unsafe_to_diagnose",
  "machine": "string (identified machine in ${langName})",
  "problem": "string (सरल भाषा में संभावित समस्या in ${langName})",
  "explanation": "string (समस्या क्यों हो सकती है in ${langName})",
  "steps": [
    "string (पहला आसान कदम in ${langName})",
    "string (दूसरा आसान कदम in ${langName})",
    "string (तीसरा आसान कदम in ${langName})"
  ],
  "avoid": [
    "string (क्या नहीं करना चाहिए in ${langName})"
  ],
  "when_to_call_mechanic": "string (मैकेनिक को कब बुलाएं in ${langName})",
  "mechanic_required": boolean,
  "urgency": "low" | "medium" | "high" | "critical",
  "urgency_explanation": "string (मशीन चलाने की स्थिति in ${langName})",
  "voice_summary": "string (किसान जी... ऑडियो के लिए सरल व स्पष्ट संदेश in ${langName})",
  "question": "string (ONE simple follow-up question if insufficient, else empty string)",
  "problem_category": "string (e.g. Engine / Electrical / Fuel / Cooling / Starting)",
  "severity": "safe" | "caution" | "danger",
  "self_check_allowed": boolean,
  "should_stop_machine": boolean,
  "next_action": "SELF_CHECK" | "GET_MECHANIC" | "NEED_MORE_INFORMATION" | "STOP_MACHINE"
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
          message: getUnavailableMessage(language),
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
            message: getUnavailableMessage(language),
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
        geminiOutput.next_action === "STOP_MACHINE" ||
        geminiOutput.urgency === "critical";

      const finalSeverity: "critical" | "high" | "medium" | "low" = isDangerous
        ? "critical"
        : geminiOutput.urgency === "high" || geminiOutput.severity === "danger"
        ? "high"
        : geminiOutput.urgency === "medium" || geminiOutput.severity === "caution"
        ? "medium"
        : "low";

      const finalNextAction = isDangerous
        ? "STOP_MACHINE"
        : geminiOutput.next_action ||
          (geminiOutput.status === "insufficient" ? "NEED_MORE_INFORMATION" : "SELF_CHECK");

      const finalSafetyWarning = isDangerous
        ? (language === "en" ? "⚠️ Keep machine stopped and maintain safe distance." : MANDATORY_DANGER_WARNING)
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
        Array.isArray(geminiOutput.steps) &&
        geminiOutput.steps.length > 0
      ) {
        recommendedActionText = geminiOutput.steps.join(" • ");
      } else if (
        Array.isArray(geminiOutput.immediate_actions) &&
        geminiOutput.immediate_actions.length > 0
      ) {
        recommendedActionText = geminiOutput.immediate_actions.join(" • ");
      } else {
        recommendedActionText = geminiOutput.message || (language === "en" ? "Inspect with care." : "सावधानीपूर्वक जांच करें।");
      }

      // Safe farmer steps
      const farmerSteps = isDangerous
        ? (language === "en"
            ? ["Step 1: Keep machine stopped immediately.", "Step 2: Maintain a safe distance and do not restart.", "Step 3: Call a certified mechanic immediately."]
            : ["पहला कदम: मशीन को तुरंत बंद रखें।", "दूसरा कदम: सुरक्षित दूरी बनाए रखें और दोबारा चालू न करें।", "तीसरा कदम: तुरंत मैकेनिक से जांच करवाएं।"])
        : Array.isArray(geminiOutput.steps) && geminiOutput.steps.length > 0
        ? geminiOutput.steps
        : Array.isArray(geminiOutput.immediate_actions) && geminiOutput.immediate_actions.length > 0
        ? geminiOutput.immediate_actions
        : language === "en"
        ? ["Step 1: Keep the machine turned off.", "Step 2: Check around the machine for any unusual noise or leakage.", "Step 3: If issue persists, have a mechanic inspect it."]
        : ["पहला कदम: मशीन को बंद रखें।", "दूसरा कदम: मशीन के पास से आवाज़ या रिसाव ध्यान से देखें।", "तीसरा कदम: अगर समस्या बनी रहती है तो मैकेनिक से जांच करवाएं।"];

      // Safe farmer avoid instructions
      const farmerAvoid = isDangerous
        ? (language === "en"
            ? ["Do not attempt to restart the machine.", "Do not touch hot parts, wiring, or moving components."]
            : ["मशीन को बार-बार स्टार्ट करने की कोशिश न करें।", "गर्म हिस्सों, तारों या घूमने वाले पुर्जों को हाथ न लगाएं।"])
        : Array.isArray(geminiOutput.avoid) && geminiOutput.avoid.length > 0
        ? geminiOutput.avoid
        : language === "en"
        ? ["Do not repeatedly try to start the machine.", "Do not open pressurized or dangerous engine components."]
        : ["मशीन को बार-बार स्टार्ट करने की कोशिश न करें।", "दबाव वाले या खतरनाक पुर्जों को खुद न खोलें।"];

      // When to call mechanic
      const whenToCallMechanic = geminiOutput.when_to_call_mechanic ||
        (language === "en"
          ? "If the machine does not start, makes unusual sounds, or smoke appears, call a mechanic."
          : "अगर मशीन स्टार्ट नहीं हो रही है, अजीब आवाज या धुआँ निकल रहा है, तो मैकेनिक को बुलाएं।");

      // Urgency explanation
      const urgencyExplanation = isDangerous
        ? (language === "en"
            ? "Operating the machine right now is unsafe. Get it inspected first."
            : "अभी मशीन चलाना ठीक नहीं है। पहले जांच करवाएं।")
        : geminiOutput.urgency_explanation ||
          (finalSeverity === "high"
            ? (language === "en" ? "Urgent attention recommended before running machine." : "मशीन चलाने से पहले तुरंत जांच करवाएं।")
            : (language === "en" ? "Condition is normal, low risk of stoppage. Inspect safely." : "अभी सामान्य स्थिति है। पहले सुरक्षित जांच करवाएं।"));

      // Voice summary script
      const voiceSummary = geminiOutput.voice_summary ||
        (language === "en"
          ? `Farmer friend, your machine seems to need inspection. Please do not repeatedly restart the machine. ${farmerSteps.join(" ")} ${whenToCallMechanic}`
          : `किसान जी, आपकी मशीन में सामान्य जांच की जरूरत लग रही है। अभी मशीन को बार-बार स्टार्ट न करें। ${farmerSteps.join(" ")} ${whenToCallMechanic}`);

      // Backward compatible StructuredAIDiagnosisResponse
      const parsedOutput: StructuredAIDiagnosisResponse = {
        diagnosis: geminiOutput.problem || (language === "en" ? "Possible Machine Issue" : "संभावित मशीन समस्या"),
        confidence: isDangerous ? 0.95 : geminiOutput.status === "sufficient" ? 0.88 : 0.65,
        reasons: Array.isArray(geminiOutput.possible_causes) && geminiOutput.possible_causes.length > 0
          ? geminiOutput.possible_causes.slice(0, 3)
          : geminiOutput.explanation ? [geminiOutput.explanation] : [],
        recommendedAction: recommendedActionText,
        severity: finalSeverity,
        safetyWarning: finalSafetyWarning,
        // Enriched step-by-step fields
        sufficiencyStatus: geminiOutput.status || "sufficient",
        machineIdentified: geminiOutput.machine || machineType,
        problemCategory: geminiOutput.problem_category || "",
        selfCheckAllowed: isDangerous ? false : !!geminiOutput.self_check_allowed,
        immediateActions: farmerSteps,
        shouldStopMachine: isDangerous || !!geminiOutput.should_stop_machine,
        mechanicRequired: isDangerous || !!geminiOutput.mechanic_required,
        nextAction: finalNextAction,
        question: geminiOutput.question || "",
        farmerMessage: geminiOutput.message || "",
        // Farmer-Friendly Natural Structured Fields
        farmerProblem: geminiOutput.problem || (language === "en" ? "Possible machine inspection needed" : "आपकी मशीन में जांच की आवश्यकता हो सकती है"),
        farmerExplanation: geminiOutput.explanation || (language === "en" ? "Normal wear and tear or routine inspection needed." : "नियमित संचालन या घिसाव के कारण जांच की जरूरत हो सकती है।"),
        farmerSteps,
        farmerAvoid,
        whenToCallMechanic,
        urgencyExplanation,
        voiceSummary,
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
        message: getUnavailableMessage("hi"),
      },
      { status: 200 }
    );
  }
}
