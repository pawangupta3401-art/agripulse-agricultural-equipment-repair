import { NextRequest, NextResponse } from "next/server";
import { VoiceHelpRequest, VoiceHelpResponse } from "@/types/voiceAssistant";
import { LanguageCode } from "@/i18n";

const LANGUAGE_NAMES: Record<string, string> = {
  hi: "Hindi (हिन्दी)",
  en: "Indian English",
  mr: "Marathi (मराठी)",
  te: "Telugu (తెలుగు)",
  pa: "Punjabi (ਪੰਜਾਬੀ)",
  gu: "Gujarati (ગુજરાતી)",
  bn: "Bengali (বাংলা)",
  ta: "Tamil (தமிழ்)",
  kn: "Kannada (ಕನ್ನಡ)",
  ml: "Malayalam (മലയാളം)",
  or: "Odia (ଓଡ଼ିଆ)",
  as: "Assamese (অসমীয়া)",
  ur: "Urdu (اردو)",
  bgc: "Haryanvi (हरियाणवी)",
  raj: "Rajasthani (राजस्थानी)",
};

/**
 * Checks if the user's speech is inquiring about an actual agricultural machine breakdown.
 * We must never diagnose machine problems from the unauthenticated login screen.
 */
function isMachineIssueQuery(text: string): boolean {
  const lower = text.toLowerCase();
  const machineKeywords = [
    "ट्रैक्टर", "tractor", "पावर टिलर", "power tiller", "टिलर", "tiller",
    "पंप", "pump", "मोटर", "motor", "स्प्रेयर", "sprayer", "रोटावेटर", "rotavator",
    "स्टार्ट नहीं", "not starting", "चालू नहीं", "बंद पड़", "धुआं", "smoke",
    "आवाज आ रही", "noise", "लीकेज", "leak", "खराब हो गई", "खराब है", "broken",
    "मशीन खराब", "रिपेयर कर", "repair my"
  ];
  return machineKeywords.some((kw) => lower.includes(kw));
}

/**
 * Deterministic farmer-friendly guidance when offline or Gemini API is not configured.
 */
function getDeterministicResponse(query: string, language: LanguageCode = "hi", role?: string, mode?: string, step?: string): string {
  const isEn = language === "en";
  const lower = query.toLowerCase();

  // Machine breakdown query redirect
  if (isMachineIssueQuery(query)) {
    return isEn
      ? "Understood. That is a machine issue. After logging in, I can help you report the machine problem. First please log in to your AgriPulse account."
      : "समझ गया। यह मशीन की समस्या है। लॉगिन के बाद मैं आपको मशीन की समस्या दर्ज करने में मदद कर सकता हूँ। पहले अपने AgriPulse खाते में लॉगिन करें।";
  }

  // User confused: "मुझे समझ नहीं आ रहा"
  if (lower.includes("समझ नहीं") || lower.includes("कन्फ्यूज") || lower.includes("dont understand") || lower.includes("don't understand") || lower.includes("what to do") || lower.includes("क्या करूँ") || lower.includes("क्या करना")) {
    if (step === "otp_verification") {
      return isEn
        ? "Please check your SMS for a 6-digit verification code and enter it on the screen."
        : "आपके मोबाइल पर 6 अंकों का OTP आया होगा। उसे स्क्रीन पर दर्ज करें और लॉगिन बटन दबाएं।";
    }
    return isEn
      ? "No problem. First choose your account type. If you are a farmer, select Farmer."
      : "कोई बात नहीं। पहले अपना खाता चुनिए। अगर आप किसान हैं तो किसान चुनें।";
  }

  // "मुझे किसान का अकाउंट बनाना है" / "किसान"
  if (lower.includes("किसान") || lower.includes("farmer")) {
    return isEn
      ? "Okay. Select Farmer, enter your name, mobile number, and address. You will then receive an OTP on your mobile."
      : "ठीक है। किसान चुनिए, फिर अपना नाम, मोबाइल नंबर और पता भरिए। उसके बाद आपके मोबाइल पर OTP आएगा।";
  }

  // "OTP क्या होता है?"
  if (lower.includes("otp") || lower.includes("ओटीपी") || lower.includes("कोड")) {
    return isEn
      ? "OTP is a 6-digit verification code sent to your mobile number. You need to enter it here to safely verify your account."
      : "OTP आपके मोबाइल पर आने वाला 6 अंकों का सत्यापन कोड है। उसे यहां भरना होता है ताकि आपका खाता सुरक्षित रहे।";
  }

  // "मुझे लॉगिन करना है"
  if (lower.includes("लॉगिन") || lower.includes("login") || lower.includes("पहले से")) {
    return isEn
      ? "Select the Login tab, enter your registered mobile number, and verify with OTP."
      : "लॉगिन टैब चुनिए, अपना मोबाइल नंबर डालिए और OTP से सत्यापन कीजिए।";
  }

  // "मैं technician हूं" / "मिस्त्री"
  if (lower.includes("technician") || lower.includes("टेक्नीशियन") || lower.includes("मिस्त्री") || lower.includes("मैकेनिक") || lower.includes("mechanic")) {
    return isEn
      ? "Okay. Select Technician and proceed by entering your mobile number."
      : "ठीक है। टेक्नीशियन विकल्प चुनिए और फिर अपना मोबाइल नंबर डालकर आगे बढ़िए।";
  }

  // Registration specifics
  if (lower.includes("रजिस्ट्रेशन") || lower.includes("register") || lower.includes("नया खाता") || lower.includes("new account")) {
    return isEn
      ? "Select New Registration, fill in your details and mobile number, then submit."
      : "नया रजिस्ट्रेशन टैब चुनें, अपना नाम, पता और मोबाइल नंबर भरकर आगे बढ़ें।";
  }

  // Off-topic or general greeting
  if (lower.includes("नमस्ते") || lower.includes("hello") || lower.includes("hi") || lower.includes("राम राम")) {
    return isEn
      ? "Hello! I can help you use AgriPulse. Let me know if you need help with login, registration, or choosing your account."
      : "नमस्ते! मैं AgriPulse में आपकी मदद के लिए तैयार हूँ। बताइए आपको लॉगिन, रजिस्ट्रेशन या खाता चुनने में सहायता चाहिए?";
  }

  // Context-specific fallback
  if (step === "otp_verification") {
    return isEn
      ? "Please enter the 6-digit OTP received on your mobile to complete verification."
      : "कृपया अपने मोबाइल पर आए 6 अंकों के OTP को भरकर सत्यापन पूरा करें।";
  }

  if (mode === "login") {
    return isEn
      ? "Please enter your 10-digit mobile number and click Send OTP to log in."
      : "कृपया अपना 10 अंकों का मोबाइल नंबर दर्ज करें और ओटीपी भेजें पर टैप करें।";
  }

  return isEn
    ? "I can help you navigate AgriPulse. Please let me know if you need help with login, registration, or selecting farmer or technician."
    : "मैं AgriPulse इस्तेमाल करने में आपकी मदद कर सकता हूँ। बताइए आपको लॉगिन, रजिस्ट्रेशन या किसान/टेक्नीशियन खाता चुनने में मदद चाहिए?";
}

export async function POST(req: NextRequest) {
  try {
    const body: VoiceHelpRequest = await req.json();
    const { userQuery, context } = body;

    if (!userQuery || !userQuery.trim()) {
      return NextResponse.json(
        {
          success: false,
          spokenText:
            context?.language === "en"
              ? "I could not hear you clearly. Please tap the button and speak again."
              : "आपकी आवाज़ स्पष्ट नहीं सुनाई दी। कृपया बटन दबाकर फिर से बोलें।",
        } as VoiceHelpResponse,
        { status: 200 }
      );
    }

    const language = context?.language || "hi";
    const langName = LANGUAGE_NAMES[language] || LANGUAGE_NAMES["hi"];
    const isEn = language === "en";

    // 1. Check for machine breakdown questions immediately
    if (isMachineIssueQuery(userQuery)) {
      return NextResponse.json({
        success: true,
        spokenText: isEn
          ? "Understood. That is a machine issue. After logging in, I can help you report the machine problem. First please log in to your AgriPulse account."
          : "समझ गया। यह मशीन की समस्या है। लॉगिन के बाद मैं आपको मशीन की समस्या दर्ज करने में मदद कर सकता हूँ। पहले अपने AgriPulse खाते में लॉगिन करें।",
        isMachineBreakdownQuery: true,
      } as VoiceHelpResponse);
    }

    // 2. Read API key
    const apiKey = (process.env.AI_API_KEY || process.env.GEMINI_API_KEY)?.trim();

    if (!apiKey) {
      // Deterministic immediate response
      const spoken = getDeterministicResponse(
        userQuery,
        language,
        context?.selectedRole,
        context?.authMode,
        context?.currentStep
      );
      return NextResponse.json({
        success: true,
        spokenText: spoken,
        fallbackUsed: true,
      } as VoiceHelpResponse);
    }

    // 3. Build Gemini system prompt with exact screen context
    const systemPrompt = `You are the AgriPulse Voice Guide, a helpful and respectful voice assistant speaking directly to an Indian farmer or rural technician on the AgriPulse login/registration screen.

CURRENT USER CONTEXT:
- Screen: Login and Account Registration
- Selected Role: ${context?.selectedRole || "none"} (options: "farmer" / "technician")
- Auth Mode: ${context?.authMode || "none"} ("login" for existing user, "register" for new user)
- Current Step: ${context?.currentStep || "role_selection"} (options: "role_selection", "details_input", "otp_verification")
- Language: Strictly ${langName}
- Visible UI Error: ${context?.errorMessage || "none"}

RULES FOR GENERATING THE VOICE RESPONSE:
1. Output MUST be only ONE or TWO short, clear sentences in ${langName}.
2. Tone must be warm, simple, respectful, and direct (suitable for spoken Text-to-Speech).
3. NEVER use AI or developer jargon (no "AI", "Gemini", "API", "token", "JSON", "system", "UI").
4. NEVER disclose, ask for, or validate OTP numbers.
5. If the farmer seems confused ("समझ नहीं आ रहा"), gently tell them which option to tap first (e.g. किसान या टेक्नीशियन).
6. If the user asks about OTP, explain simply that it is a 6-digit mobile verification code.
7. If the user asks anything unrelated to logging in, gently redirect them back to choosing an account or logging in.
8. Output plain spoken text only. No quotes, no markdown, no asterisks, no bullet points.`;

    const userPrompt = `The farmer just asked by voice: "${userQuery}".
Respond in simple ${langName} so it sounds natural when spoken aloud.`;

    // 4. Candidate models fallback
    const CANDIDATE_MODELS = [
      "gemini-3.5-flash",
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
    ];

    const requestBody = {
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
        maxOutputTokens: 250,
      },
    };

    let generatedText = "";

    for (const model of CANDIDATE_MODELS) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

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
            // Clean any unwanted markdown asterisks or quotes
            generatedText = text.replace(/[*#`_"]/g, "").trim();
            break;
          }
        }
      } catch {
        clearTimeout(timeoutId);
      }
    }

    if (!generatedText) {
      generatedText = getDeterministicResponse(
        userQuery,
        language,
        context?.selectedRole,
        context?.authMode,
        context?.currentStep
      );
    }

    return NextResponse.json({
      success: true,
      spokenText: generatedText,
    } as VoiceHelpResponse);
  } catch (error) {
    console.error("[VoiceHelpAPI Error]:", error);
    return NextResponse.json({
      success: true,
      spokenText: "अभी मैं आपकी आवाज़ से मदद नहीं कर पा रहा हूँ। आप स्क्रीन पर दिए विकल्पों से आगे बढ़ सकते हैं।",
      fallbackUsed: true,
    } as VoiceHelpResponse);
  }
}
