import { AIDiagnosisResult, Machine, PhotoAnalysisResult } from "@/types";

export interface DiagnosisInput {
  machine?: Machine;
  problemDescription: string;
  hasPhoto?: boolean;
  photoAnalysis?: PhotoAnalysisResult;
}

/**
 * Deterministic AI Diagnosis Engine (Phase 2D-A & 2D-B)
 *
 * Evaluates machine complaints based on farmer keywords, photo analysis evidence,
 * and machine historical metrics without external LLMs or third-party APIs.
 */
export function runDemoAIDiagnosis(input: DiagnosisInput): AIDiagnosisResult {
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
