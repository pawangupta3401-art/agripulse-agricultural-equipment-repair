import { AIDiagnosisResult, Machine, PhotoAnalysisResult } from "@/types";

export interface DiagnosisInput {
  machine?: Machine;
  problemDescription: string;
  hasPhoto?: boolean;
  photoAnalysis?: PhotoAnalysisResult;
  language?: string;
}

/**
 * Enriches any diagnosis result with simple, farmer-friendly structured fields
 * and natural voice script matching the exact user specification.
 */
export function enrichFarmerDiagnosis(
  result: AIDiagnosisResult,
  language: string = "hi"
): AIDiagnosisResult {
  const isEn = language === "en";
  const rule = result.matchedRule;
  const isDangerous =
    result.severity === "critical" ||
    result.urgencyLevel === "high" ||
    !!result.safetyWarning;

  let farmerProblem = "";
  let farmerExplanation = "";
  let farmerSteps: string[] = [];
  let farmerAvoid: string[] = [];
  let whenToCallMechanic = "";
  let urgencyExplanation = "";
  let voiceSummary = "";

  if (rule === "smoke_overheating") {
    farmerProblem = isEn
      ? "There may be a potential issue with engine overheating or cooling in your machine."
      : "आपकी मशीन में इंजन अधिक गर्म होने या कूलिंग सिस्टम से जुड़ी संभावित समस्या हो सकती है।";
    farmerExplanation = isEn
      ? "Low coolant or engine oil, or a clogged air filter can cause the engine temperature to rise."
      : "इंजन ऑयल या कूलेंट की कमी अथवा एयर फ़िल्टर चोक होने से इंजन का तापमान बढ़ सकता है।";
    farmerSteps = isEn
      ? [
          "Step 1: Keep the machine turned off and let it cool completely.",
          "Step 2: Do not open the radiator cap while the engine is hot.",
          "Step 3: If the problem continues, have a mechanic inspect it."
        ]
      : [
          "पहला कदम: मशीन को तुरंत बंद रखें और ठंडी होने दें।",
          "दूसरा कदम: गर्म इंजन पर रेडिएटर का ढक्कन बिल्कुल न खोलें।",
          "तीसरा कदम: अगर समस्या बनी रहती है तो मैकेनिक से जांच करवाएं।"
        ];
    farmerAvoid = isEn
      ? ["Do not restart the engine while hot.", "Do not touch hot engine components or pour cold water on a hot engine."]
      : ["गर्म स्थिति में मशीन को दोबारा स्टार्ट न करें।", "गर्म इंजन के पुर्जों को न छुएं और उस पर ठंडा पानी न डालें।"];
    whenToCallMechanic = isEn
      ? "If smoke is coming out, temperature does not drop, or the engine shuts off repeatedly, call a mechanic."
      : "अगर मशीन से धुआँ निकल रहा है, तापमान कम नहीं हो रहा, या मशीन बार-बार बंद हो रही है, तो मैकेनिक को बुलाएं।";
    urgencyExplanation = isEn
      ? "Operating the machine right now is unsafe. Get it inspected first."
      : "अभी मशीन चलाना ठीक नहीं है। पहले जांच करवाएं।";
    voiceSummary = isEn
      ? "Farmer friend, your machine seems to have an engine overheating issue. Please do not restart the machine right now. Step one, keep the machine turned off. Step two, check around the engine once it cools down. Step three, if the problem continues, have a mechanic inspect it. If smoke is coming out, do not operate the machine at all."
      : "किसान जी, आपकी मशीन में इंजन अधिक गर्म होने की समस्या लग रही है। अभी मशीन को बार-बार स्टार्ट न करें। पहला कदम, मशीन बंद रखें और ठंडी होने दें। दूसरा कदम, इंजन के आसपास ध्यान से देखें। तीसरा कदम, अगर समस्या बनी रहती है तो मैकेनिक से जांच करवाएं। अगर धुआं निकल रहा है, तो मशीन बिल्कुल न चलाएं।";
  } else if (rule === "fluid_leakage") {
    farmerProblem = isEn
      ? "There may be a potential fluid or oil leak in your machine."
      : "आपकी मशीन में तेल या तरल पदार्थ के रिसाव से जुड़ी संभावित समस्या लग रही है।";
    farmerExplanation = isEn
      ? "Worn rubber seals, loose fittings, or cut gaskets can cause fluid leakage."
      : "रबर सील, वाशर कटने अथवा नट-बोल्ट ढीले होने से रिसाव हो सकता है।";
    farmerSteps = isEn
      ? [
          "Step 1: Keep the machine turned off.",
          "Step 2: Safely check around the leakage area with a clean cloth.",
          "Step 3: If the leak continues, have a mechanic inspect and replace the seal."
        ]
      : [
          "पहला कदम: मशीन को बंद रखें।",
          "दूसरा कदम: रिसाव वाली जगह को साफ कपड़े से सुरक्षित तरीके से देखें।",
          "तीसरा कदम: अगर रिसाव जारी रहता है तो मैकेनिक से जांच करवाकर सील बदलवाएं।"
        ];
    farmerAvoid = isEn
      ? ["Do not run the machine with low oil or fluid.", "Do not overtighten bolts forcefully."]
      : ["कम तेल या तरल के साथ मशीन न चलाएं।", "बोल्ट को जबरन अत्यधिक न कसें।"];
    whenToCallMechanic = isEn
      ? "If fluid is continuously dripping or oil pressure drops, call a mechanic."
      : "अगर तेल लगातार नीचे टपक रहा है या प्रेशर कम हो रहा है, तो मैकेनिक को बुलाएं।";
    urgencyExplanation = isEn
      ? "Prompt repair needed to prevent damage to internal parts."
      : "आंतरिक पुर्जों को नुकसान से बचाने के लिए जल्द जांच जरूरी है।";
    voiceSummary = isEn
      ? "Farmer friend, your machine seems to have an oil or fluid leakage issue. Please do not run the machine continuously. Step one, keep the machine stopped. Step two, check where the fluid is dripping. Step three, have a mechanic replace the worn seal."
      : "किसान जी, आपकी मशीन में तेल या तरल रिसाव की समस्या लग रही है। मशीन को लगातार न चलाएं। पहला कदम, मशीन बंद रखें। दूसरा कदम, देखें कि तेल कहाँ से टपक रहा है। तीसरा कदम, मैकेनिक से सील की जांच करवाएं।";
  } else if (rule === "electrical_damage") {
    farmerProblem = isEn
      ? "There may be an issue with electrical wiring or short circuit in your machine."
      : "आपकी मशीन में बिजली के तार या शॉर्ट सर्किट से जुड़ी संभावित समस्या लग रही है।";
    farmerExplanation = isEn
      ? "Loose connections or cut insulation can cause sparking or loss of power."
      : "ढीले तार या इंसुलेशन कटने से शॉर्ट सर्किट और चिंगारी का खतरा हो सकता है।";
    farmerSteps = isEn
      ? [
          "Step 1: Keep the machine stopped and maintain a safe distance.",
          "Step 2: Turn off the main battery switch if safely accessible.",
          "Step 3: Call an auto electrician or certified mechanic immediately."
        ]
      : [
          "पहला कदम: मशीन तुरंत बंद रखें और सुरक्षित दूरी बनाए रखें।",
          "दूसरा कदम: यदि सुरक्षित हो तो मुख्य बैटरी स्विच बंद करें।",
          "तीसरा कदम: तुरंत इलेक्ट्रीशियन या मैकेनिक से जांच करवाएं।"
        ];
    farmerAvoid = isEn
      ? ["Do not touch bare wires or sparking terminals.", "Do not attempt to restart."]
      : ["नंगे तारों या चिंगारी वाले हिस्सों को न छुएं।", "मशीन को दोबारा चालू करने की कोशिश न करें।"];
    whenToCallMechanic = isEn
      ? "Call a mechanic immediately. Electrical faults require professional repair."
      : "तुरंत मैकेनिक या इलेक्ट्रीशियन को बुलाएं। बिजली के काम में पेशेवर मदद जरूरी है।";
    urgencyExplanation = isEn
      ? "Operating the machine right now is unsafe. Get it inspected first."
      : "अभी मशीन चलाना ठीक नहीं है। पहले जांच करवाएं।";
    voiceSummary = isEn
      ? "Farmer friend, there seems to be an electrical or wiring issue in your machine. Please keep the machine turned off immediately. Do not touch any bare wires. Step one, keep the machine off. Step two, stay at a safe distance. Step three, call an electrician or mechanic right away."
      : "किसान जी, आपकी मशीन में बिजली या वायरिंग से जुड़ी समस्या लग रही है। मशीन को तुरंत बंद रखें। किसी भी नंगे तार को न छुएं। पहला कदम, मशीन बंद रखें। दूसरा कदम, सुरक्षित दूरी बनाएं। तीसरा कदम, तुरंत मैकेनिक या इलेक्ट्रीशियन को बुलाएं।";
  } else if (rule === "starting_issue" || rule === "start") {
    farmerProblem = isEn
      ? "There may be an issue with starting or the fuel supply system in your machine."
      : "आपकी मशीन में स्टार्टिंग या ईंधन आपूर्ति से जुड़ी संभावित समस्या हो सकती है।";
    farmerExplanation = isEn
      ? "Weak battery voltage, air in fuel lines, or dirty fuel filters can prevent starting."
      : "बैटरी डिस्चार्ज, ईंधन पाइप में हवा या फिल्टर गंदा होने से मशीन स्टार्ट नहीं हो पाती।";
    farmerSteps = isEn
      ? [
          "Step 1: Keep the machine turned off and let starter motor rest.",
          "Step 2: Check fuel level and see if battery terminals are tight and clean.",
          "Step 3: If the machine still does not start, have a mechanic inspect it."
        ]
      : [
          "पहला कदम: मशीन को बंद रखें और स्टार्टर मोटर को ठंडा होने दें।",
          "दूसरा कदम: ईंधन का स्तर देखें और बैटरी के तार साफ व कसे हुए हैं या नहीं जांचें।",
          "तीसरा कदम: अगर मशीन फिर भी स्टार्ट नहीं हो रही तो मैकेनिक से जांच करवाएं।"
        ];
    farmerAvoid = isEn
      ? ["Do not repeatedly try to start the machine.", "Do not continuously crank the starter motor."]
      : ["मशीन को बार-बार स्टार्ट करने की कोशिश न करें।", "स्टार्टर को लगातार न घुमाएं, इससे बैटरी और सेल्फ खराब हो सकती है।"];
    whenToCallMechanic = isEn
      ? "If the starter only clicks or engine turns slowly without starting, call a mechanic."
      : "अगर मशीन बिल्कुल स्टार्ट नहीं हो रही है या सिर्फ खट-खट आवाज आ रही है, तो मैकेनिक को बुलाएं।";
    urgencyExplanation = isEn
      ? "Inspect battery and fuel before attempting to start again."
      : "दोबारा स्टार्ट करने से पहले बैटरी और ईंधन की बुनियादी जांच जरूरी है।";
    voiceSummary = isEn
      ? "Farmer friend, your machine seems to have a starting issue. Please do not keep cranking the starter repeatedly. Step one, keep the machine turned off. Step two, check the fuel level and battery connection. Step three, if it does not start, call a mechanic."
      : "किसान जी, आपकी मशीन में स्टार्ट होने में समस्या लग रही है। मशीन को बार-बार लगातार स्टार्ट न करें। पहला कदम, मशीन बंद रखें। दूसरा कदम, डीजल और बैटरी कनेक्शन देखें। तीसरा कदम, अगर स्टार्ट न हो तो मैकेनिक को बुलाएं।";
  } else {
    // General Mechanical Evaluation and other rules
    farmerProblem = isEn
      ? "Your machine seems to need a general inspection of parts and engine components."
      : "आपकी मशीन में इंजन से जुड़ी सामान्य समस्या हो सकती है।";
    farmerExplanation = isEn
      ? "Routine operating hours and wear require checking components to ensure smooth running."
      : "नियमित कामकाज और घिसाव के कारण पुर्जों की प्राथमिक जांच की आवश्यकता है।";
    farmerSteps = isEn
      ? [
          "Step 1: Keep the machine turned off.",
          "Step 2: Check around the engine for any unusual noise, smoke, or leakage.",
          "Step 3: If the problem continues, have a mechanic inspect it."
        ]
      : [
          "पहला कदम: मशीन को बंद रखें।",
          "दूसरा कदम: इंजन के पास से आवाज़ या धुआँ आ रहा है या नहीं देखें।",
          "तीसरा कदम: अगर समस्या बनी रहती है तो मैकेनिक से जांच करवाएं।"
        ];
    farmerAvoid = isEn
      ? [
          "Do not repeatedly try to start the machine.",
          "Do not operate under heavy load until inspected."
        ]
      : [
          "मशीन को बार-बार स्टार्ट करने की कोशिश न करें।",
          "जांच होने तक मशीन पर भारी लोड न डालें।"
        ];
    whenToCallMechanic = isEn
      ? "If the machine does not start or smoke appears, call a mechanic."
      : "अगर मशीन स्टार्ट नहीं हो रही है या धुआँ निकल रहा है, तो मैकेनिक को बुलाएं।";
    urgencyExplanation = isEn
      ? isDangerous
        ? "Operating the machine right now is unsafe. Get it inspected first."
        : "Operating condition is normal. Safe preliminary inspection recommended."
      : isDangerous
      ? "अभी मशीन चलाना ठीक नहीं है। पहले जांच करवाएं।"
      : "अभी सामान्य स्थिति है। पहले जांच करवाएं फिर काम पर ले जाएं।";
    voiceSummary = isEn
      ? "Farmer friend, your machine seems to need a general inspection. Please do not keep trying to restart the machine right now. Step one, keep the machine turned off. Step two, carefully check around the fuel and engine. Step three, if the problem continues, have a mechanic inspect it. If smoke is coming out or there is a loud noise, do not operate the machine at all."
      : "किसान जी, आपकी मशीन में सामान्य जांच की जरूरत लग रही है। अभी मशीन को बार-बार स्टार्ट न करें। पहला कदम, मशीन बंद रखें। दूसरा कदम, ईंधन और इंजन के आसपास ध्यान से देखें। तीसरा कदम, अगर समस्या बनी रहती है तो मैकेनिक से जांच करवाएं। अगर मशीन से धुआं निकल रहा है या तेज आवाज आ रही है, तो मशीन बिल्कुल न चलाएं।";
  }

  return {
    ...result,
    farmerProblem,
    farmerExplanation,
    farmerSteps,
    farmerAvoid,
    whenToCallMechanic,
    urgencyExplanation,
    voiceSummary,
  };
}

/**
 * Deterministic AI Diagnosis Engine (Phase 2D-A & 2D-B)
 *
 * Evaluates machine complaints based on farmer keywords, photo analysis evidence,
 * and machine historical metrics without external LLMs or third-party APIs.
 */
function _evaluateDemoAIDiagnosis(input: DiagnosisInput): AIDiagnosisResult {
  const text = (input.problemDescription || "").toLowerCase();
  const machine = input.machine;
  const lastService = machine?.lastService || "1 महीना पहले";
  const operatingHours = machine?.operatingHours || "120 घंटे";
  const photo = input.photoAnalysis;

  // Requirement 10: Clearly label "AI प्रारंभिक जाँच" and "अंतिम पुष्टि मैकेनिक करेगा।"
  const disclaimer = "यह AI प्रारंभिक जाँच है। अंतिम पुष्टि मैकेनिक करेगा।";

  // Helper to append photo evidence & boost confidence if photo confirms
  const buildPhotoReasons = (baseReasons: string[]): string[] => {
    const combined = [...baseReasons];
    if (photo) {
      if (photo.isClear) {
        combined.push(`📷 फोटो साक्ष्य: ${photo.evidence.join(" • ")}`);
        if (photo.annotatedArea) {
          combined.push(`निरीक्षण क्षेत्र: ${photo.annotatedArea}`);
        }
      } else {
        combined.push("📷 फोटो से समस्या साफ़ नहीं दिख रही है। मैकेनिक की जाँच ज़रूरी है।");
      }
    }
    return combined;
  };

  // 1. Rule: Smoke / धुआं / Overheating
  if (
    text.includes("धुआं") ||
    text.includes("धुआ") ||
    text.includes("smoke") ||
    text.includes("धुंआ") ||
    text.includes("काला धुआं") ||
    text.includes("गरम") ||
    text.includes("हीट") ||
    text.includes("ओवरहीट") ||
    (photo?.isClear && (photo.detectedIssue.includes("धुआं") || photo.detectedIssue.includes("ओवरहीटिंग")))
  ) {
    const hasPhotoConfirmation = photo?.isClear && (photo.detectedIssue.includes("धुआं") || photo.detectedIssue.includes("ओवरहीटिंग"));
    const confidenceVal = hasPhotoConfirmation ? 92 : 88;

    return {
      id: `diag-${Date.now()}-smoke`,
      possibleProblem: "संभावित इंजन ओवरहीटिंग (Engine Overheating)",
      confidence: hasPhotoConfirmation ? "92% (शिकायत + फोटो)" : "88%",
      confidenceValue: confidenceVal,
      reasons: buildPhotoReasons([
        "शिकायत विवरण में इंजन से धुआं निकलने अथवा अधिक गरम होने का स्पष्ट उल्लेख है।",
        "इंजन ऑयल या कूलेंट की कमी अथवा एयर फ़िल्टर चोक होने से इंजन का तापमान बढ़ सकता है।",
        `मशीन के ऑपरेटिंग समय (${operatingHours}) के अनुसार कूलिंग सिस्टम का निरीक्षण आवश्यक है।`,
      ]),
      safeAction: "मशीन तुरंत बंद रखें। गरम इंजन पर रेडिएटर ढक्कन न खोलें और मैकेनिक को बुलाएं।",
      urgencyLevel: "high",
      urgencyText: "🔴 तुरंत मदद चाहिए",
      urgencyColor: "bg-red-100 text-red-900 border-red-300",
      disclaimer,
      matchedRule: "smoke_overheating",
      timestamp: new Date().toISOString(),
      photoAnalysis: photo,
    };
  }

  // 2. Rule: Leakage / तेल या पानी रिसना
  if (
    text.includes("रिसना") ||
    text.includes("रिसाव") ||
    text.includes("leak") ||
    text.includes("लीक") ||
    text.includes("तेल") ||
    text.includes("पानी रिस") ||
    text.includes("टपक") ||
    text.includes("drop") ||
    (photo?.isClear && photo.detectedIssue.includes("रिसाव"))
  ) {
    const hasPhotoConfirmation = photo?.isClear && photo.detectedIssue.includes("रिसाव");
    const confidenceVal = hasPhotoConfirmation ? 90 : 85;

    return {
      id: `diag-${Date.now()}-leak`,
      possibleProblem: "संभावित तेल या पानी का रिसाव (Fluid / Oil Leakage)",
      confidence: hasPhotoConfirmation ? "90% (शिकायत + फोटो)" : "85%",
      confidenceValue: confidenceVal,
      reasons: buildPhotoReasons([
        "मशीन के जोड़ से तेल या तरल पदार्थ टपकने की जानकारी मिली है।",
        "रबर सील, वाशर या गैस्केट के कटने अथवा नट-बोल्ट ढीले होने से रिसाव होता है।",
        "लगातार रिसाव से मशीन में आवश्यक लुब्रिकेशन कम हो सकता है।",
      ]),
      safeAction: "मशीन बंद रखें। रिसाव वाली जगह को साफ कपड़े से देखें और मैकेनिक से सील बदलवाएं।",
      urgencyLevel: "medium",
      urgencyText: "🟠 जल्द मरम्मत करें",
      urgencyColor: "bg-amber-100 text-amber-900 border-amber-300",
      disclaimer,
      matchedRule: "fluid_leakage",
      timestamp: new Date().toISOString(),
      photoAnalysis: photo,
    };
  }

  // 3. Rule: Visible Damage / भौतिक नुकसान या दरार
  if (
    text.includes("दरार") ||
    text.includes("डेंट") ||
    text.includes("क्षति") ||
    text.includes("crack") ||
    text.includes("damage") ||
    (photo?.isClear && photo.detectedIssue.includes("नुकसान"))
  ) {
    const hasPhotoConfirmation = photo?.isClear && photo.detectedIssue.includes("नुकसान");
    const confidenceVal = hasPhotoConfirmation ? 88 : 82;

    return {
      id: `diag-${Date.now()}-damage`,
      possibleProblem: "बाहरी क्षति व संरचनात्मक दरार (Visible Body / Structural Damage)",
      confidence: hasPhotoConfirmation ? "88% (शिकायत + फोटो)" : "82%",
      confidenceValue: confidenceVal,
      reasons: buildPhotoReasons([
        "मशीन के बाहरी ढांचे अथवा सुरक्षा कवर पर दरार या क्षति की पहचान हुई है।",
        "असामान्य झटकों या खिंचाव से धातु की सतह मुड़ने की संभावना है।",
      ]),
      safeAction: "क्षतिग्रस्त भाग पर अधिक दबाव न डालें। मशीन बंद रखकर मैकेनिक से वेल्डिंग/मरम्मत करवाएं।",
      urgencyLevel: "medium",
      urgencyText: "🟠 जल्द मरम्मत करें",
      urgencyColor: "bg-amber-100 text-amber-900 border-amber-300",
      disclaimer,
      matchedRule: "visible_damage",
      timestamp: new Date().toISOString(),
      photoAnalysis: photo,
    };
  }

  // 4. Rule: Loose or Broken Component / ढीला या टूटा पुर्जा
  if (
    text.includes("ढीला") ||
    text.includes("टूटा") ||
    text.includes("loose") ||
    text.includes("broken") ||
    text.includes("बोल्ट") ||
    text.includes("नट") ||
    text.includes("बेल्ट") ||
    (photo?.isClear && photo.detectedIssue.includes("पुर्जा"))
  ) {
    const hasPhotoConfirmation = photo?.isClear && photo.detectedIssue.includes("पुर्जा");
    const confidenceVal = hasPhotoConfirmation ? 90 : 84;

    return {
      id: `diag-${Date.now()}-loose`,
      possibleProblem: "ढीला अथवा टूटा हुआ पुर्जा (Loose / Broken Mechanical Component)",
      confidence: hasPhotoConfirmation ? "90% (शिकायत + फोटो)" : "84%",
      confidenceValue: confidenceVal,
      reasons: buildPhotoReasons([
        "मशीन के किसी पुर्जे के ढीले होने अथवा बोल्ट के अपनी जगह से हटने का संकेत है।",
        "ढीले पुर्जों के साथ मशीन चलाने से अन्य चालू गियर या बेल्ट को नुकसान पहुंच सकता है।",
      ]),
      safeAction: "मशीन पर तुरंत काम रोकें। ढीले नट-बोल्ट को जबरन न कसें और मैकेनिक से परीक्षण कराएं।",
      urgencyLevel: "high",
      urgencyText: "🔴 तुरंत मदद चाहिए",
      urgencyColor: "bg-red-100 text-red-900 border-red-300",
      disclaimer,
      matchedRule: "loose_broken_component",
      timestamp: new Date().toISOString(),
      photoAnalysis: photo,
    };
  }

  // 5. Rule: Engine not starting / चालू नहीं / स्टार्ट नहीं
  if (
    text.includes("चालू नहीं") ||
    text.includes("चालू नही") ||
    text.includes("स्टार्ट नहीं") ||
    text.includes("स्टार्ट नही") ||
    text.includes("start") ||
    text.includes("बंद पड़") ||
    text.includes("बंद हो ग") ||
    text.includes("शुरू नहीं")
  ) {
    return {
      id: `diag-${Date.now()}-start`,
      possibleProblem: "स्टार्टिंग या ईंधन प्रणाली की समस्या (Starting / Fuel Issue)",
      confidence: "82%",
      confidenceValue: 82,
      reasons: buildPhotoReasons([
        "इंजन को स्टार्ट करने पर क्रैंकिंग न होने या तुरंत बंद होने की शिकायत है।",
        "बैटरी वोल्टेज कम होना, स्पार्क प्लग में कार्बन या फ़्यूल पाइप में कचरा होना संभव है।",
        `पिछली सर्विस (${lastService}) के बाद फ़्यूल फ़िल्टर की सफाई की आवश्यकता हो सकती है।`,
      ]),
      safeAction: "बार-बार स्टार्टर न दबाएं ताकि बैटरी न बैठे। ईंधन वाल्व खुला होने की जांच करें और मैकेनिक बुलाएं।",
      urgencyLevel: "medium",
      urgencyText: "🟠 जल्द मरम्मत करें",
      urgencyColor: "bg-amber-100 text-amber-900 border-amber-300",
      disclaimer,
      matchedRule: "starting_issue",
      timestamp: new Date().toISOString(),
      photoAnalysis: photo,
    };
  }

  // 6. Rule: Unusual Sound / अजीब आवाज़
  if (
    text.includes("आवाज़") ||
    text.includes("आवाज") ||
    text.includes("sound") ||
    text.includes("noise") ||
    text.includes("खटखट") ||
    text.includes("गड़गड़") ||
    text.includes("शोर") ||
    text.includes("खड़खड़")
  ) {
    return {
      id: `diag-${Date.now()}-sound`,
      possibleProblem: "यांत्रिक खराबी व ढीले पुर्जे (Mechanical / Bearing Issue)",
      confidence: "80%",
      confidenceValue: 80,
      reasons: buildPhotoReasons([
        "मशीन के संचालन के दौरान असामान्य खड़खड़ाहट या भारी कंपन का उल्लेख है।",
        "अंदरूनी बेयरिंग में घिसाव, गियरबॉक्स में सूखापन या पुली बेल्ट के ढीले होने का संकेत है।",
        "इस स्थिति में बिना मरम्मत मशीन चलाने से अन्य पुर्जों को बड़ा नुकसान हो सकता है।",
      ]),
      safeAction: "मशीन पर तुरंत काम रोकें। ढीले नट-बोल्ट को जबरन न कसें और मैकेनिक से परीक्षण कराएं।",
      urgencyLevel: "high",
      urgencyText: "🔴 तुरंत मदद चाहिए",
      urgencyColor: "bg-red-100 text-red-900 border-red-300",
      disclaimer,
      matchedRule: "unusual_sound",
      timestamp: new Date().toISOString(),
      photoAnalysis: photo,
    };
  }

  // 7. Rule: Pump not working / पंप चालू नहीं / प्रेशर कम
  if (
    text.includes("पंप") ||
    text.includes("pump") ||
    text.includes("पानी नहीं") ||
    text.includes("प्रेशर") ||
    text.includes("pressure") ||
    text.includes("नोजल") ||
    text.includes("स्प्रे")
  ) {
    return {
      id: `diag-${Date.now()}-pump`,
      possibleProblem: "पंप या इंपेलर की समस्या (Pump / Pressure Issue)",
      confidence: "86%",
      confidenceValue: 86,
      reasons: buildPhotoReasons([
        "पंप में पानी या लिक्विड न उठाने अथवा प्रेशर कम बनने की सूचना दर्ज हुई है।",
        "सक्शन पाइप में एयर लॉक, वाल्व में कचरा या वाटर सील के घिसने की संभावना है।",
        `मशीन के पूर्व मरम्मत विवरण (${machine?.previousRepairs || "नोजल चेक"}) के अनुसार पुनः जांच जरूरी है।`,
      ]),
      safeAction: "पंप को सूखा (बिना पानी) न चलाएं। इनलेट पाइप में एयर लीकेज न होने दें और मैकेनिक से ठीक कराएं।",
      urgencyLevel: "medium",
      urgencyText: "🟠 जल्द मरम्मत करें",
      urgencyColor: "bg-amber-100 text-amber-900 border-amber-300",
      disclaimer,
      matchedRule: "pump_issue",
      timestamp: new Date().toISOString(),
      photoAnalysis: photo,
    };
  }

  // 8. Rule: Electrical Damage / बिजली या वायरिंग में खराबी
  if (
    text.includes("बिजली") ||
    text.includes("तार") ||
    text.includes("वायर") ||
    text.includes("वायरिंग") ||
    text.includes("शॉर्ट") ||
    text.includes("current") ||
    text.includes("electrical") ||
    (photo?.isClear && photo.detectedIssue.includes("वायरिंग"))
  ) {
    const hasPhotoConfirmation = photo?.isClear && photo.detectedIssue.includes("वायरिंग");
    const confidenceVal = hasPhotoConfirmation ? 92 : 86;

    return {
      id: `diag-${Date.now()}-electrical`,
      possibleProblem: "इलेक्ट्रिकल वायरिंग व शॉर्ट सर्किट की समस्या (Electrical / Wiring Damage)",
      confidence: hasPhotoConfirmation ? "92% (शिकायत + फोटो)" : "86%",
      confidenceValue: confidenceVal,
      reasons: buildPhotoReasons([
        "मशीन की वायरिंग या इलेक्ट्रिकल पुर्जे में खराबी या कटे तार का संकेत है।",
        "ढीले कनेक्शन या इंसुलेशन कटने से शॉर्ट सर्किट और चिंगारी का गंभीर खतरा हो सकता है।",
        "इस स्थिति में बैटरी का करंट तुरंत डिस्कनेक्ट करना आवश्यक है।",
      ]),
      safeAction: "⚠️ मशीन बंद रखें और सुरक्षित दूरी बनाए रखें। मुख्य बैटरी स्विच बंद करें और इलेक्ट्रीशियन बुलाएं।",
      urgencyLevel: "high",
      urgencyText: "🔴 तुरंत मदद चाहिए",
      urgencyColor: "bg-red-100 text-red-900 border-red-300",
      safetyWarning: "⚠️ मशीन बंद रखें और सुरक्षित दूरी बनाए रखें।",
      disclaimer,
      matchedRule: "electrical_damage",
      timestamp: new Date().toISOString(),
      photoAnalysis: photo,
    };
  }

  // 9. Fallback Rule: General Mechanical Evaluation
  return {
    id: `diag-${Date.now()}-general`,
    possibleProblem: "सामान्य यांत्रिक जाँच आवश्यक (General Inspection Needed)",
    confidence: photo?.isClear ? "78%" : "76%",
    confidenceValue: photo?.isClear ? 78 : 76,
    reasons: buildPhotoReasons([
      "दर्ज की गई शिकायत व विवरण के आधार पर सामान्य खराबी का अनुमान लगाया गया है।",
      "प्रत्यक्ष भौतिक निरीक्षण द्वारा समस्या के सटीक कारण की पुष्टि होगी।",
      `मशीन की पिछली सर्विस (${lastService}) के अनुसार नियमित मेंटेनेंस की जरूरत है।`,
    ]),
    safeAction: "मशीन पर अनावश्यक भार न डालें। मैकेनिक से संपूर्ण जांच करवाएं।",
    urgencyLevel: "low",
    urgencyText: "🟢 सामान्य जाँच",
    urgencyColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
    disclaimer,
    matchedRule: "general_fallback",
    timestamp: new Date().toISOString(),
    photoAnalysis: photo,
  };
}

export function runDemoAIDiagnosis(input: DiagnosisInput): AIDiagnosisResult {
  const rawResult = _evaluateDemoAIDiagnosis(input);
  return enrichFarmerDiagnosis(rawResult, input.language || "hi");
}
