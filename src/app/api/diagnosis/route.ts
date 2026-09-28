import { NextRequest, NextResponse } from "next/server";
import { StructuredAIDiagnosisResponse } from "@/types";

/**
 * Checks for inherently dangerous machine conditions.
 * Requirement 5: Safety rules must run before displaying the AI recommendation.
 */
function checkDangerousCondition(text: string): boolean {
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
  ];
  return dangerousKeywords.some((kw) => lower.includes(kw));
}

const MANDATORY_DANGER_WARNING = "⚠️ मशीन बंद रखें और सुरक्षित दूरी बनाए रखें।";

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
    } = body;

    // Server-side safety evaluation runs FIRST
    const isDangerous =
      checkDangerousCondition(farmerComplaint) ||
      checkDangerousCondition(detectedVisualIssue);

    const apiKey = process.env.AI_API_KEY?.trim();

    // If API key is missing, seamlessly signal fallback without leaking technical errors
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          fallback: true,
          message: "अभी सामान्य जाँच उपलब्ध है।",
          isDangerous,
        },
        { status: 200 }
      );
    }

    // Prepare strict prompt for AI model
    const systemPrompt = `You are AgriPulse AI Diagnostic Assistant for Indian farmers.
Diagnose agricultural machine issues based on the farmer's complaint and visual inspection.
Output STRICTLY a JSON object without markdown formatting, codeblocks, or extra text.

Rules:
1. Use simple, clear Hindi suitable for Indian farmers.
2. The JSON schema MUST be:
{
  "diagnosis": "string (संभावित समस्या का नाम हिंदी में)",
  "confidence": number (between 0.50 and 0.95),
  "reasons": ["string (कारण 1 हिंदी में)", "string (कारण 2)", "string (कारण 3)"],
  "recommendedAction": "string (अभी क्या करें हिंदी में)",
  "severity": "critical" | "high" | "medium" | "low",
  "safetyWarning": "string" | null
}
3. SAFETY RULE: If there is ANY indication of smoke, fire, sparks, severe overheating, or fuel leakage, set severity to "critical", set safetyWarning to "${MANDATORY_DANGER_WARNING}", and NEVER advise continuing to operate the machine.`;

    const userPrompt = `कृषि मशीन: ${machineType} ${machineModel}
किसान की शिकायत: ${farmerComplaint || "मशीन में समस्या आ रही है"}
कैमरा / दृश्य विश्लेषण: ${detectedVisualIssue || "उपलब्ध नहीं"}
आवश्यकता / समय: ${urgency || "सामान्य"}
मशीन इतिहास / चालू समय: ${recentHistory || "उपलब्ध नहीं"}

कृपया ऊपर दिए गए विवरण के आधार पर सही JSON प्रारूप में जाँच रिपोर्ट दें।`;

    // Single AI Provider: Google Gemini REST API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    try {
      const response = await fetch(geminiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
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

      // Parse and sanitize structured output
      let parsedOutput: StructuredAIDiagnosisResponse;
      try {
        const cleaned = candidateText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        parsedOutput = JSON.parse(cleaned);
      } catch {
        return NextResponse.json(
          { success: false, fallback: true, message: "अभी सामान्य जाँच उपलब्ध है।" },
          { status: 200 }
        );
      }

      // Validate required fields
      if (
        !parsedOutput.diagnosis ||
        typeof parsedOutput.confidence !== "number" ||
        !Array.isArray(parsedOutput.reasons) ||
        !parsedOutput.recommendedAction
      ) {
        return NextResponse.json(
          { success: false, fallback: true, message: "अभी सामान्य जाँच उपलब्ध है।" },
          { status: 200 }
        );
      }

      // Mandatory Safety Enforcement (Runs before returning to farmer)
      if (
        isDangerous ||
        parsedOutput.severity === "critical" ||
        checkDangerousCondition(parsedOutput.diagnosis)
      ) {
        parsedOutput.severity = "critical";
        parsedOutput.safetyWarning = MANDATORY_DANGER_WARNING;
        parsedOutput.recommendedAction =
          "मशीन तुरंत बंद रखें और सुरक्षित दूरी बनाए रखें। किसी भी परिस्थिति में मशीन चालू न करें और तुरंत प्रमाणित मैकेनिक को दिखाएं।";
      }

      return NextResponse.json({
        success: true,
        fallback: false,
        result: parsedOutput,
      });
    } catch {
      clearTimeout(timeoutId);
      // Timeout or network error -> fallback without showing technical errors
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
