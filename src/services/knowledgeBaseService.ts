/**
 * AgriPulse Knowledge Base Search Engine & Question Understanding Service
 *
 * Implements the exact 6-step flow:
 * 1. Farmer bolta hai (Voice Speech Input)
 * 2. Voice AI Assistant (Speech-to-Text)
 * 3. Question samajhta hai (Machine & Symptom Extraction + Intent Analysis)
 * 4. 1000 Q&A Knowledge Base mein relevant information search (High-speed scored search)
 * 5. Relevant answer (Precise actionable diagnosis + steps)
 * 6. Simple Hindi mein voice se jawab (Natural TTS Hindi voice script)
 */

import { AGRICULTURAL_KNOWLEDGE_BASE, KnowledgeEntry } from "@/data/agriculturalKnowledgeBase";
import { LanguageCode } from "@/i18n";

export interface UnderstoodIntent {
  rawQuery: string;
  normalizedQuery: string;
  detectedMachine: "tractor" | "power_tiller" | "pump" | "sprayer" | "rotavator" | "harvester" | "electrical" | "maintenance" | "app" | "general";
  detectedSymptom: string | null;
  extractedKeywords: string[];
}

export interface KnowledgeSearchResult {
  entry: KnowledgeEntry;
  score: number;
  matchType: "exact_alias" | "high_relevance" | "symptom_match" | "contextual_synthesis";
  spokenResponseHi: string;
  spokenResponseEn: string;
}

/**
 * 1. Question samajhta hai:
 * Deeply understands the farmer's question, identifies equipment, symptoms, and normalizes colloquial slang.
 */
export function understandFarmerQuestion(query: string): UnderstoodIntent {
  const rawQuery = query || "";
  const normalized = rawQuery.toLowerCase().trim();

  // 1. Detect Machine Type
  let detectedMachine: UnderstoodIntent["detectedMachine"] = "general";
  if (normalized.includes("ट्रैक्टर") || normalized.includes("tractor") || normalized.includes("ट्रेक्टर")) {
    detectedMachine = "tractor";
  } else if (normalized.includes("टिलर") || normalized.includes("tiller") || normalized.includes("पावर टिलर")) {
    detectedMachine = "power_tiller";
  } else if (normalized.includes("पंप") || normalized.includes("pump") || normalized.includes("मोटर") || normalized.includes("motor") || normalized.includes("सबमर्सिबल") || normalized.includes("बोरवेल")) {
    detectedMachine = "pump";
  } else if (normalized.includes("स्प्रेयर") || normalized.includes("sprayer") || normalized.includes("छिड़काव") || normalized.includes("दवा मशीन") || normalized.includes("फुहारा")) {
    detectedMachine = "sprayer";
  } else if (normalized.includes("रोटावेटर") || normalized.includes("rotavator") || normalized.includes("कल्टीवेटर") || normalized.includes("cultivator") || normalized.includes("सीड ड्रिल")) {
    detectedMachine = "rotavator";
  } else if (normalized.includes("हार्वेस्टर") || normalized.includes("harvester") || normalized.includes("थ्रेशर") || normalized.includes("thresher") || normalized.includes("कंबाइन")) {
    detectedMachine = "harvester";
  } else if (normalized.includes("बैटरी") || normalized.includes("battery") || normalized.includes("फ्यूज") || normalized.includes("तार") || normalized.includes("अल्टरनेटर") || normalized.includes("लाइट")) {
    detectedMachine = "electrical";
  } else if (normalized.includes("मिस्त्री") || normalized.includes("mechanic") || normalized.includes("बुकिंग") || normalized.includes("एग्रीपल्स") || normalized.includes("agripulse") || normalized.includes("फीस") || normalized.includes("खर्च")) {
    detectedMachine = "app";
  } else if (normalized.includes("सर्विस") || normalized.includes("ऑयल") || normalized.includes("मोबिल") || normalized.includes("फिल्टर") || normalized.includes("घंटे")) {
    detectedMachine = "maintenance";
  }

  // 2. Detect Symptom Category
  let detectedSymptom: string | null = null;
  if (normalized.includes("कट-कट") || normalized.includes("कट कट") || normalized.includes("click") || normalized.includes("खट खट")) {
    detectedSymptom = "starter_clicking";
  } else if (normalized.includes("स्टार्ट नहीं") || normalized.includes("चालू नहीं") || normalized.includes("not starting") || normalized.includes("बंद हो गया") || normalized.includes("सेल्फ नहीं")) {
    detectedSymptom = "starting_issue";
  } else if (normalized.includes("काला धुआं") || normalized.includes("black smoke") || normalized.includes("काला धुंआ")) {
    detectedSymptom = "black_smoke";
  } else if (normalized.includes("सफेद धुआं") || normalized.includes("white smoke") || normalized.includes("सफेद धुंआ")) {
    detectedSymptom = "white_smoke";
  } else if (normalized.includes("नीला धुआं") || normalized.includes("blue smoke")) {
    detectedSymptom = "blue_smoke";
  } else if (normalized.includes("गर्म") || normalized.includes("overheat") || normalized.includes("उबल") || normalized.includes("रेडिएटर") || normalized.includes("तापमान")) {
    detectedSymptom = "overheating";
  } else if (normalized.includes("लिफ्ट") || normalized.includes("lift") || normalized.includes("हाइड्रोलिक") || normalized.includes("hydraulic")) {
    detectedSymptom = "hydraulics";
  } else if (normalized.includes("गियर") || normalized.includes("gear") || normalized.includes("क्लच") || normalized.includes("clutch") || normalized.includes("चर्र-चर्र")) {
    detectedSymptom = "clutch_transmission";
  } else if (normalized.includes("पानी नहीं") || normalized.includes("प्राइमिंग") || normalized.includes("फुट वाल्व") || normalized.includes("पानी उठा")) {
    detectedSymptom = "pump_delivery";
  } else if (normalized.includes("प्रेशर नहीं") || normalized.includes("नोजल") || normalized.includes("छिड़काव नहीं")) {
    detectedSymptom = "sprayer_pressure";
  } else if (normalized.includes("पिन टूट") || normalized.includes("शियर बोल्ट") || normalized.includes("shear bolt")) {
    detectedSymptom = "shear_pin";
  } else if (normalized.includes("रस्सी") || normalized.includes("recoil") || normalized.includes("रिकॉइल") || normalized.includes("झटका")) {
    detectedSymptom = "recoil_rope";
  } else if (normalized.includes("ट्रिप") || normalized.includes("mcb") || normalized.includes("कैपेसिटर")) {
    detectedSymptom = "motor_tripping";
  } else if (normalized.includes("आवाज") || normalized.includes("sound") || normalized.includes("noise") || normalized.includes("घड़-घड़")) {
    detectedSymptom = "strange_noise";
  } else if (normalized.includes("लीक") || normalized.includes("रिस") || normalized.includes("leak") || normalized.includes("टपक")) {
    detectedSymptom = "leakage";
  }

  // 3. Extract tokens
  const stopWords = new Set(["है", "का", "की", "के", "में", "से", "को", "पर", "aur", "and", "or", "kya", "kare", "hai", "kaise"]);
  const tokens = normalized
    .replace(/[?,।!._-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stopWords.has(w));

  return {
    rawQuery,
    normalizedQuery: normalized,
    detectedMachine,
    detectedSymptom,
    extractedKeywords: tokens,
  };
}

/**
 * 2. 1000 Q&A Knowledge Base mein relevant information search:
 * High-speed scored matching over all 1000+ potential questions and aliases.
 */
export function searchKnowledgeBase(query: string): KnowledgeSearchResult {
  const understanding = understandFarmerQuestion(query);
  const normalized = understanding.normalizedQuery;

  let bestEntry: KnowledgeEntry | null = null;
  let highestScore = -1;
  let matchType: KnowledgeSearchResult["matchType"] = "contextual_synthesis";

  for (const entry of AGRICULTURAL_KNOWLEDGE_BASE) {
    let score = 0;

    // A. Check exact aliases (Highest confidence)
    for (const alias of entry.aliases) {
      const aliasLower = alias.toLowerCase();
      if (normalized.includes(aliasLower) || aliasLower.includes(normalized)) {
        score += 80;
        matchType = "exact_alias";
      }
    }

    // B. Category match bonus
    if (understanding.detectedMachine !== "general" && entry.category === understanding.detectedMachine) {
      score += 25;
    }

    // C. Keyword overlap
    for (const kw of entry.keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        score += 15;
      }
    }

    for (const token of understanding.extractedKeywords) {
      if (entry.questionHi.toLowerCase().includes(token) || entry.questionEn.toLowerCase().includes(token)) {
        score += 10;
      }
      if (entry.answerHi.toLowerCase().includes(token)) {
        score += 5;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestEntry = entry;
      if (score >= 40 && matchType !== "exact_alias") {
        matchType = "high_relevance";
      }
    }
  }

  // If a high or exact match was found, return it
  if (bestEntry && highestScore >= 15) {
    return {
      entry: bestEntry,
      score: highestScore,
      matchType,
      spokenResponseHi: bestEntry.answerHi,
      spokenResponseEn: bestEntry.answerEn,
    };
  }

  // 3. Contextual Synthesis Fallback
  // If the query is outside the indexed cards, synthesize an intelligent, farmer-friendly answer
  const fallbackEntry = generateContextualAnswer(understanding);
  return {
    entry: fallbackEntry,
    score: 10,
    matchType: "contextual_synthesis",
    spokenResponseHi: fallbackEntry.answerHi,
    spokenResponseEn: fallbackEntry.answerEn,
  };
}

/**
 * Generates an intelligent, simple Hindi spoken response for any agricultural query
 * that does not have an exact 1:1 match in the primary cards.
 */
function generateContextualAnswer(intent: UnderstoodIntent): KnowledgeEntry {
  const machineName =
    intent.detectedMachine === "tractor" ? "ट्रैक्टर" :
    intent.detectedMachine === "power_tiller" ? "पावर टिलर" :
    intent.detectedMachine === "pump" ? "सिंचाई पंप" :
    intent.detectedMachine === "sprayer" ? "स्प्रेयर मशीन" :
    intent.detectedMachine === "rotavator" ? "रोटावेटर" :
    intent.detectedMachine === "harvester" ? "हार्वेस्टर या थ्रेशर" :
    "आपकी कृषि मशीन";

  let spokenHi = `नमस्ते किसान भाई। ${machineName} से जुड़ी यह समस्या सामान्यतः नियमित रख-रखाव, तेल या वायरिंग की ढिलाई के कारण हो सकती है।`;
  let steps: string[] = [
    "मशीन को सुरक्षित समतल जगह पर रोकें और इंजन बंद करें।",
    "तेल, कूलेंट या डीजल के स्तर की जांच करें।",
    "यदि समस्या बनी रहती है तो AgriPulse ऐप पर खराबी दर्ज करके नजदीकी मैकेनिक बुलाएं।"
  ];
  let warning = "गर्म या चालू मशीन में कभी भी चलती अवस्था में हाथ न डालें।";

  if (intent.detectedSymptom === "starting_issue") {
    spokenHi = `${machineName} के स्टार्ट न होने पर सबसे पहले बैटरी के खूंटों पर कार्बन चेक करें, डीजल या ईंधन का फ्लो देखें, और एयर लॉक की जांच करें।`;
    steps = [
      "बैटरी वोल्टेज और तारों के कनेक्शन जांचें।",
      "डीजल फिल्टर का ब्लीडर स्क्रू खोलकर एयर निकालें।",
      "इंजन को लगातार 15 सेकंड से अधिक सेल्फ न दें।"
    ];
  } else if (intent.detectedSymptom === "overheating") {
    spokenHi = `${machineName} गर्म होने पर तुरंत मशीन को धीमी रेस पर 2 मिनट चलने देकर बंद करें। गर्म रेडिएटर का ढक्कन कभी न खोलें और जाली की धूल साफ करें।`;
    steps = [
      "रेडिएटर और एयर क्लीनर की जाली से भूसा साफ करें।",
      "फैन बेल्ट का ढीलापन जांचें।",
      "ठंडा होने के बाद ही कूलेंट का स्तर पूरा करें।"
    ];
    warning = "गर्म इंजन पर कभी भी ठंडा पानी न डालें, ब्लॉक क्रैक हो सकता है।";
  } else if (intent.detectedSymptom === "pump_delivery") {
    spokenHi = `पंप के पानी न उठाने का कारण वैक्यूम लीक होना या फुट वाल्व में कचरा फंसना है। पंप में पानी भरकर एयर निकालें और सक्शन पाइप के जोड़ जांचें।`;
    steps = [
      "पंप की बॉडी में ऊपर से पानी भरकर हवा पूरी तरह निकालें।",
      "सक्शन पाइप के जोड़ों पर टेफ्लॉन टेप लगाकर टाइट करें।",
      "फुट वाल्व में फंसी पॉलीथीन या कचरा साफ करें।"
    ];
  } else if (intent.detectedSymptom === "hydraulics") {
    spokenHi = `हाइड्रोलिक लिफ्ट के काम न करने का मुख्य कारण ट्रांसमिशन ऑयल कम होना या सक्शन जाली चोक होना है। ऑयल लेवल और कंट्रोल नॉब जांचें।`;
    steps = [
      "सीट के नीचे लगा हाइड्रोलिक फ्लो कंट्रोल नॉब खोलें।",
      "ट्रांसमिशन हाइड्रोलिक ऑयल का स्तर पूरा रखें।",
      "सक्शन फिल्टर को डीजल से साफ करवाएं।"
    ];
  }

  return {
    id: "synth_" + Date.now(),
    category: intent.detectedMachine === "general" ? "maintenance" : intent.detectedMachine,
    categoryHi: `${machineName} सहायता`,
    questionHi: intent.rawQuery || "कृषि उपकरण समस्या",
    questionEn: intent.rawQuery || "Agricultural equipment issue",
    aliases: [intent.normalizedQuery],
    keywords: intent.extractedKeywords,
    answerHi: spokenHi,
    answerEn: `For ${machineName}, please check fuel, fluid levels and electrical connections. You can book a verified mechanic via AgriPulse if the issue persists.`,
    steps,
    warning,
    mechanicRequired: true,
  };
}

/**
 * Simple helper to format spoken text for audio synthesis
 */
export function cleanTextForSpeech(text: string): string {
  if (!text) return "";
  return text
    .replace(/[⚠️🚜🌾⚙️💧💨⚡📱🎙️]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
