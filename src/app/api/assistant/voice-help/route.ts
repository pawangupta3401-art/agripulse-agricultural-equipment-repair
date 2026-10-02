import { NextRequest, NextResponse } from "next/server";
import { VoiceHelpRequest, VoiceHelpResponse } from "@/types/voiceAssistant";
import { LanguageCode } from "@/i18n";
import { searchKnowledgeBase } from "@/services/knowledgeBaseService";
import { checkDangerousCondition } from "@/services/aiAssistantService";

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
    ? "I could not find the answer to this question. Please check the help section."
    : "मुझे इस सवाल का सही जवाब नहीं मिला। कृपया मदद सेक्शन से सहायता लें।";
}

/**
 * Deterministic fallback for किसान हेल्प when offline or Gemini API is not configured.
 * Automatically recognizes:
 * A. Machine Help (tractor, pump, sprayer, tiller, etc.)
 * B. Technician Help ("मुझे मैकेनिक चाहिए", "मिस्त्री बुलाओ")
 * C. App Help (OTP, machine add, complaint)
 */
function getKisanHelpDeterministic(query: string, language: LanguageCode = "hi"): VoiceHelpResponse {
  const isEn = language === "en";
  const lower = query.toLowerCase();

  // 1. Danger condition check
  if (checkDangerousCondition(query)) {
    return {
      success: true,
      spokenText: isEn
        ? "Warning! Smoke, fire, or severe leak detected. Stop the machine immediately, maintain a safe distance, and call a certified technician."
        : "सावधानी! मशीन में धुआं, आग या गंभीर रिसाव का खतरा है। मशीन तुरंत बंद रखें, सुरक्षित दूरी बनाएं और प्रमाणित मैकेनिक को दिखाएं।",
      helpType: "machine",
      technicianRequired: true,
      clarificationNeeded: false,
      recommendedMachine: "tractor",
      problemSummary: isEn ? "Emergency: Safety Hazard" : "आपातकालीन सुरक्षा खतरा",
      fallbackUsed: true,
    };
  }

  // 2. Technician request
  if (
    lower.includes("mechanic") ||
    lower.includes("मैकेनिक") ||
    lower.includes("मिस्त्री") ||
    lower.includes("technician") ||
    lower.includes("बुलाओ") ||
    lower.includes("चाहिए")
  ) {
    return {
      success: true,
      spokenText: isEn
        ? "Sure, I can help connect you with a nearby certified technician right away. Please tap the button below to proceed."
        : "ज़रूर, मैं आपके लिए नज़दीकी प्रमाणित मैकेनिक खोजने में मदद करता हूँ। कृपया नीचे दिए बटन से बुकिंग आगे बढ़ाएं।",
      helpType: "technician",
      technicianRequired: true,
      clarificationNeeded: false,
      recommendedMachine: "tractor",
      problemSummary: isEn ? "Technician Assistance Request" : "टेक्नीशियन सहायता अनुरोध",
      fallbackUsed: true,
    };
  }

  // 3. App help
  if (lower.includes("otp") || lower.includes("ओटीपी")) {
    return {
      success: true,
      spokenText: isEn
        ? "OTP is a 6-digit verification code sent via SMS to your registered mobile. Enter it on the screen to securely log in."
        : "OTP आपके मोबाइल पर SMS के ज़रिए भेजा गया 6 अंकों का कोड है। उसे स्क्रीन पर दर्ज करें।",
      helpType: "app",
      technicianRequired: false,
      clarificationNeeded: false,
      fallbackUsed: true,
    };
  }
  if (lower.includes("machine") && (lower.includes("add") || lower.includes("जोड़") || lower.includes("नया") || lower.includes("पंजीकरण"))) {
    return {
      success: true,
      spokenText: isEn
        ? "To add a machine, go to 'My Machines' on the home screen and tap the '+ Register New Machine' button."
        : "नई मशीन जोड़ने के लिए होम स्क्रीन पर 'मेरी मशीनें' में जाएं और '+ नई मशीन जोड़ें' बटन दबाएं।",
      helpType: "app",
      technicianRequired: false,
      clarificationNeeded: false,
      fallbackUsed: true,
    };
  }
  if (lower.includes("complaint") || lower.includes("शिकायत") || lower.includes("रिपोर्ट") || lower.includes("खराबी दर्ज")) {
    return {
      success: true,
      spokenText: isEn
        ? "To report a breakdown, tap 'Report Machine Breakdown' on the home screen and follow the 4 simple steps."
        : "शिकायत दर्ज करने के लिए होम स्क्रीन पर 'मशीन में समस्या है / रिपोर्ट करें' बटन दबाएं और 4 आसान चरण पूरे करें।",
      helpType: "app",
      technicianRequired: false,
      clarificationNeeded: false,
      fallbackUsed: true,
    };
  }

  // 4. Machine problem help
  if (lower.includes("start") || lower.includes("स्टार्ट") || lower.includes("चालू")) {
    return {
      success: true,
      spokenText: isEn
        ? "Understood. First, check if the battery light turns on on the dashboard when you turn the key."
        : "ठीक है। पहले बताइए, क्या चाबी घुमाने पर डैशबोर्ड पर बैटरी की लाइट चालू हो रही है?",
      helpType: "machine",
      clarificationNeeded: true,
      technicianRequired: false,
      recommendedMachine: "tractor",
      problemSummary: isEn ? "Starting Problem" : "स्टार्ट न होने की समस्या",
      fallbackUsed: true,
    };
  }

  if (lower.includes("pump") || lower.includes("पंप") || lower.includes("पानी")) {
    return {
      success: true,
      spokenText: isEn
        ? "For the water pump, is water flowing at reduced pressure, or is the motor making a humming noise without lifting water?"
        : "वाटर पंप के लिए बताइए, क्या पानी का दबाव कम है या मोटर आवाज़ कर रही है पर पानी नहीं उठा रही?",
      helpType: "machine",
      clarificationNeeded: true,
      technicianRequired: false,
      recommendedMachine: "water_pump",
      problemSummary: isEn ? "Water Pump Issue" : "वाटर पंप की समस्या",
      fallbackUsed: true,
    };
  }

  if (lower.includes("sprayer") || lower.includes("स्प्रेयर") || lower.includes("दवा")) {
    return {
      success: true,
      spokenText: isEn
        ? "Check the sprayer nozzle and pressure valve for blockage. Is the pump building any pressure?"
        : "स्प्रेयर के नोज़ल और प्रेशर वाल्व की जांच करें। क्या पंप प्रेशर बना रहा है?",
      helpType: "machine",
      clarificationNeeded: true,
      technicianRequired: false,
      recommendedMachine: "sprayer",
      problemSummary: isEn ? "Sprayer Pressure Issue" : "स्प्रेयर प्रेशर की समस्या",
      fallbackUsed: true,
    };
  }

  // General machine fallback
  return {
    success: true,
    spokenText: isEn
      ? "Understood your equipment issue. Is there any abnormal sound or smoke coming from the engine?"
      : "मशीन की समस्या समझ गया। क्या इंजन से कोई असामान्य आवाज़ या धुआं आ रहा है?",
    helpType: "machine",
    clarificationNeeded: true,
    technicianRequired: false,
    recommendedMachine: "tractor",
    problemSummary: isEn ? "General Machine Inspection" : "मशीन जांच",
    fallbackUsed: true,
  };
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
              ? "I could not hear you clearly. Please speak again."
              : "मुझे ठीक से सुनाई नहीं दिया। कृपया फिर से बोलें।",
        } as VoiceHelpResponse,
        { status: 200 }
      );
    }

    const language = context?.language || "hi";
    const langName = LANGUAGE_NAMES[language] || LANGUAGE_NAMES["hi"];
    const isEn = language === "en";

    const isLoginScreen = context?.currentPage === "login_registration" || context?.currentPage === "login";

    // 1. On unauthenticated login/registration screen, redirect machine issues to login first
    if (isLoginScreen && isMachineIssueQuery(userQuery)) {
      return NextResponse.json({
        success: true,
        spokenText: isEn
          ? "Understood. That is a machine issue. After logging in, I can help you report the machine problem. First please log in to your AgriPulse account."
          : "समझ गया। यह मशीन की समस्या है। लॉगिन के बाद मैं आपको मशीन की समस्या दर्ज करने में मदद कर सकता हूँ। पहले अपने AgriPulse खाते में लॉगिन करें।",
        isMachineBreakdownQuery: true,
        fallbackUsed: false,
      } as VoiceHelpResponse);
    }

    // 2. On login screen, handle screen-specific navigation queries
    const lowerQuery = userQuery.toLowerCase();
    const isNavigationQuery =
      lowerQuery.includes("समझ नहीं") ||
      lowerQuery.includes("dont understand") ||
      lowerQuery.includes("don't understand") ||
      lowerQuery.includes("what to do") ||
      lowerQuery.includes("क्या करूँ") ||
      lowerQuery.includes("क्या करना") ||
      lowerQuery.includes("what is an otp") ||
      lowerQuery.includes("what is otp");

    if (isLoginScreen && isNavigationQuery) {
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
        fallbackUsed: false,
      } as VoiceHelpResponse);
    }

    // -------------------------------------------------------------------------
    // DEDICATED "किसान हेल्प" (Kisan Help) VOICE AI FLOW
    // Uses AgriPulse Gemini AI (no 1000 Q&A Knowledge Base)
    // Automatically categorizes: Machine Help, Technician Help, App Help
    // -------------------------------------------------------------------------
    if (context?.currentPage === "kisan_help") {
      // 1. Instant Dangerous condition check
      if (checkDangerousCondition(userQuery)) {
        return NextResponse.json({
          success: true,
          spokenText: isEn
            ? "Warning! Dangerous condition detected. Stop the machine immediately, maintain a safe distance, and call a certified technician."
            : "सावधानी! मशीन में आग, धुआं या गंभीर रिसाव का खतरा है। मशीन तुरंत बंद रखें, सुरक्षित दूरी बनाएं और प्रमाणित मैकेनिक को दिखाएं।",
          helpType: "machine",
          technicianRequired: true,
          clarificationNeeded: false,
          recommendedMachine: "tractor",
          problemSummary: isEn ? "Critical Safety Hazard" : "गंभीर सुरक्षा खतरा",
          fallbackUsed: false,
        } as VoiceHelpResponse);
      }

      // 2. Call existing AgriPulse Gemini AI backend
      const apiKey = (process.env.AI_API_KEY || process.env.GEMINI_API_KEY)?.trim();

      if (apiKey) {
        const kisanSystemPrompt = `You are AgriPulse "किसान हेल्प" (Farmer Voice Assistant), an intelligent, safe, and respectful AI speaking directly to an Indian farmer in simple ${langName}.

CATEGORIES TO UNDERSTAND AUTOMATICALLY:
1. "machine" - Problems with farm equipment (tractor, pump, sprayer, tiller, etc.).
   - If danger detected: strictly tell farmer to stop the machine immediately and maintain safe distance.
   - If safe, ask only ONE simple clarifying question if needed (e.g. "क्या बैटरी की लाइट चालू हो रही है?") OR provide 1 safe check.
   - If repair is needed, indicate technician is required.
2. "technician" - Farmer wants a mechanic/technician ("मुझे मैकेनिक चाहिए", "मिस्त्री बुलाओ", etc.).
   - Acknowledge warmly and confirm we will help connect to a nearby certified mechanic.
   - Set technicianRequired to true.
3. "app" - Questions about using AgriPulse ("OTP kahan dalna hai", "Machine kaise add karu", "Complaint kaise kare").
   - Give simple, direct 1-2 sentence instruction.

OUTPUT FORMAT:
Return valid JSON only (no markdown, no backticks, no extra text):
{
  "spokenText": "short 1 to 2 sentence answer in ${langName}",
  "helpType": "machine" | "technician" | "app",
  "clarificationNeeded": boolean,
  "technicianRequired": boolean,
  "recommendedMachine": "tractor" | "sprayer" | "water_pump" | "power_tiller",
  "problemSummary": "short 3-5 word summary"
}

RULES:
- Tone must be warm, simple, respectful, and direct.
- NO developer jargon (no "AI", "Gemini", "API", "token", "JSON").
- NEVER mention "1000 Q&A", "Knowledge Base", or "Demo".
- Ask only ONE question at a time if more information is needed.`;

        const kisanUserPrompt = `The farmer just spoke: "${userQuery}". Respond as JSON.`;

        const CANDIDATE_MODELS = [
          "gemini-2.5-flash",
          "gemini-1.5-flash",
          "gemini-2.0-flash",
        ];

        for (const model of CANDIDATE_MODELS) {
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);

          try {
            const response = await fetch(geminiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: controller.signal,
              body: JSON.stringify({
                system_instruction: { parts: [{ text: kisanSystemPrompt }] },
                contents: [{ role: "user", parts: [{ text: kisanUserPrompt }] }],
                generationConfig: {
                  temperature: 0.2,
                  maxOutputTokens: 250,
                  response_mime_type: "application/json",
                },
              }),
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              const rawJson = await response.json();
              const text = rawJson?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
              if (text) {
                try {
                  const parsed = JSON.parse(text);
                  if (parsed.spokenText) {
                    return NextResponse.json({
                      success: true,
                      spokenText: parsed.spokenText,
                      helpType: parsed.helpType || "machine",
                      clarificationNeeded: !!parsed.clarificationNeeded,
                      technicianRequired: !!parsed.technicianRequired,
                      recommendedMachine: parsed.recommendedMachine || "tractor",
                      problemSummary: parsed.problemSummary || "मशीन सहायता",
                      fallbackUsed: false,
                    } as VoiceHelpResponse);
                  }
                } catch {
                  // Fallback to text if JSON parsing fails
                  return NextResponse.json({
                    success: true,
                    spokenText: text.replace(/[*#`_"{}]/g, "").trim(),
                    helpType: "machine",
                    fallbackUsed: false,
                  } as VoiceHelpResponse);
                }
              }
            }
          } catch {
            clearTimeout(timeoutId);
          }
        }
      }

      // 3. Fallback when offline or no API key
      const deterministicResult = getKisanHelpDeterministic(userQuery, language);
      return NextResponse.json(deterministicResult);
    }

    // 3. Search 1000+ Q&A Knowledge Base for agricultural machine & app inquiries
    const kbResult = searchKnowledgeBase(userQuery);
    const isKnownQuery = isMachineIssueQuery(userQuery) || kbResult.score >= 25;

    if (isKnownQuery) {
      const finalSpokenText = isEn ? kbResult.spokenResponseEn : kbResult.spokenResponseHi;

      return NextResponse.json({
        success: true,
        spokenText: finalSpokenText,
        isMachineBreakdownQuery: kbResult.entry.category !== "app",
        matchedTopic: kbResult.entry.questionHi,
        categoryHi: kbResult.entry.categoryHi,
        steps: kbResult.entry.steps,
        warning: kbResult.entry.warning,
        mechanicRequired: kbResult.entry.mechanicRequired,
        fallbackUsed: false,
      } as VoiceHelpResponse);
    }

    // 2. Read API key
    const apiKey = (process.env.AI_API_KEY || process.env.GEMINI_API_KEY)?.trim();

    if (!apiKey) {
      // Deterministic immediate response for navigation/login
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
