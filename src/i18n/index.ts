/**
 * AgriPulse Multilingual Localization Engine
 *
 * Implements:
 * 1. 15 Indian languages & regional dialects
 * 2. Three-tier fallback: Selected Language -> Hindi -> English
 * 3. Never returns raw undefined key paths to the farmer
 * 4. LocalStorage persistence across sessions
 * 5. RTL layout detector for Urdu
 * 6. Native speech recognition codes with graceful dialect fallbacks
 * 7. Dynamic presentation helpers for AI diagnosis, Recovery Engine, and Pricing
 */

import { LanguageCode, LanguageInfo, TranslationDictionary } from "./types";
export type { LanguageCode, LanguageInfo, TranslationDictionary };
import { hi } from "./locales/hi";
import { en } from "./locales/en";
import { mr } from "./locales/mr";
import { te } from "./locales/te";
import { pa } from "./locales/pa";
import { gu } from "./locales/gu";
import { bn } from "./locales/bn";
import { ta } from "./locales/ta";
import { kn } from "./locales/kn";
import { ml } from "./locales/ml";
import { or } from "./locales/or";
import { as } from "./locales/as";
import { ur } from "./locales/ur";
import { bgc } from "./locales/bgc";
import { raj } from "./locales/raj";

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  {
    code: "hi",
    name: "Hindi",
    nativeName: "हिन्दी",
    script: "Devanagari",
    speechCode: "hi-IN",
    isRTL: false,
    region: "उत्तर व मध्य भारत",
    isPopular: true,
  },
  {
    code: "mr",
    name: "Marathi",
    nativeName: "मराठी",
    script: "Devanagari",
    speechCode: "mr-IN",
    isRTL: false,
    region: "विदर्भ / महाराष्ट्र",
    isPopular: true,
  },
  {
    code: "en",
    name: "English",
    nativeName: "English",
    script: "Latin",
    speechCode: "en-IN",
    isRTL: false,
    region: "All India",
    isPopular: true,
  },
  {
    code: "te",
    name: "Telugu",
    nativeName: "తెలుగు",
    script: "Telugu",
    speechCode: "te-IN",
    isRTL: false,
    region: "ఆంధ్రప్రదేశ్ / తెలంగాణ",
    isPopular: true,
  },
  {
    code: "pa",
    name: "Punjabi",
    nativeName: "ਪੰਜਾਬੀ",
    script: "Gurmukhi",
    speechCode: "pa-IN",
    isRTL: false,
    region: "ਪੰਜਾਬ / ਹਰਿਆਣਾ",
    isPopular: true,
  },
  {
    code: "gu",
    name: "Gujarati",
    nativeName: "ગુજરાતી",
    script: "Gujarati",
    speechCode: "gu-IN",
    isRTL: false,
    region: "ગુજરાત",
    isPopular: true,
  },
  {
    code: "ta",
    name: "Tamil",
    nativeName: "தமிழ்",
    script: "Tamil",
    speechCode: "ta-IN",
    isRTL: false,
    region: "தமிழ்நாடு",
    isPopular: true,
  },
  {
    code: "bn",
    name: "Bengali",
    nativeName: "বাংলা",
    script: "Bengali",
    speechCode: "bn-IN",
    isRTL: false,
    region: "পশ্চিমবঙ্গ / ত্রিপুরা",
    isPopular: true,
  },
  {
    code: "kn",
    name: "Kannada",
    nativeName: "ಕನ್ನಡ",
    script: "Kannada",
    speechCode: "kn-IN",
    isRTL: false,
    region: "ಕರ್ನಾಟಕ",
  },
  {
    code: "ml",
    name: "Malayalam",
    nativeName: "മലയാളം",
    script: "Malayalam",
    speechCode: "ml-IN",
    isRTL: false,
    region: "കേരളം",
  },
  {
    code: "or",
    name: "Odia",
    nativeName: "ଓଡ଼ିଆ",
    script: "Odia",
    speechCode: "or-IN",
    isRTL: false,
    region: "ଓଡ଼ିଶା",
  },
  {
    code: "as",
    name: "Assamese",
    nativeName: "অসমীয়া",
    script: "Bengali-Assamese",
    speechCode: "as-IN",
    isRTL: false,
    region: "অসম",
  },
  {
    code: "ur",
    name: "Urdu",
    nativeName: "اردو",
    script: "Nastaliq / Arabic",
    speechCode: "ur-IN",
    isRTL: true,
    region: "All India / کشمیر",
  },
  {
    code: "bgc",
    name: "Haryanvi",
    nativeName: "हरियाणवी",
    script: "Devanagari",
    speechCode: "hi-IN", // Fallback to Hindi STT
    isRTL: false,
    region: "हरियाणा / एनसीआर",
  },
  {
    code: "raj",
    name: "Rajasthani / Marwari",
    nativeName: "राजस्थानी / मारवाड़ी",
    script: "Devanagari",
    speechCode: "hi-IN", // Fallback to Hindi STT
    isRTL: false,
    region: "राजस्थान / मारवाड़",
  },
];

const DICTIONARIES: Record<LanguageCode, TranslationDictionary> = {
  hi,
  en,
  mr,
  te,
  pa,
  gu,
  bn,
  ta,
  kn,
  ml,
  or,
  as,
  ur,
  bgc,
  raj,
};

export const LANGUAGE_STORAGE_KEY = "agripulse_preferred_lang_v1";
export const LANGUAGE_CHOSEN_KEY = "agripulse_lang_modal_completed_v1";

/**
 * Retrieve user's saved language from local storage, with fallback to Hindi.
 */
export function getStoredLanguage(): LanguageCode {
  if (typeof window === "undefined") return "hi";
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
    if (stored && DICTIONARIES[stored]) {
      return stored;
    }
  } catch {
    // LocalStorage quota or SSR fallback
  }
  return "hi";
}

/**
 * Save user's language selection to persistence.
 */
export function setStoredLanguage(lang: LanguageCode): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    localStorage.setItem(LANGUAGE_CHOSEN_KEY, "true");
  } catch {
    // Safe fallback
  }
}

/**
 * Check if the first-launch language modal has been answered.
 */
export function hasChosenLanguage(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(LANGUAGE_CHOSEN_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Get active dictionary with fallback: Selected -> Hindi -> English
 */
export function getDictionary(lang: LanguageCode): TranslationDictionary {
  return DICTIONARIES[lang] || DICTIONARIES["hi"] || DICTIONARIES["en"];
}

/**
 * Core translation helper with 3-tier fallback.
 * Guaranteed to NEVER return an undefined key string like "repair.confirm_button".
 */
export function t(
  path: string,
  lang: LanguageCode = "hi",
  params?: Record<string, string | number>
): string {
  const parts = path.split(".");
  const activeDict = DICTIONARIES[lang] || DICTIONARIES["hi"];
  const hindiDict = DICTIONARIES["hi"];
  const englishDict = DICTIONARIES["en"];

  // 1. Try selected language
  let val: any = activeDict;
  for (const p of parts) {
    if (val && typeof val === "object" && p in val) {
      val = val[p];
    } else {
      val = undefined;
      break;
    }
  }

  // 2. Fallback to Hindi
  if (typeof val !== "string" && activeDict !== hindiDict) {
    let hVal: any = hindiDict;
    for (const p of parts) {
      if (hVal && typeof hVal === "object" && p in hVal) {
        hVal = hVal[p];
      } else {
        hVal = undefined;
        break;
      }
    }
    if (typeof hVal === "string") val = hVal;
  }

  // 3. Fallback to English
  if (typeof val !== "string" && activeDict !== englishDict) {
    let eVal: any = englishDict;
    for (const p of parts) {
      if (eVal && typeof eVal === "object" && p in eVal) {
        eVal = eVal[p];
      } else {
        eVal = undefined;
        break;
      }
    }
    if (typeof eVal === "string") val = eVal;
  }

  // Safety: If somehow still not found, return human-readable last part
  if (typeof val !== "string") {
    val = parts[parts.length - 1] || "AgriPulse";
  }

  // Parameter interpolation e.g. {count}, {name}
  if (params) {
    for (const [key, replacement] of Object.entries(params)) {
      val = val.replace(new RegExp(`{${key}}`, "g"), String(replacement));
    }
  }

  return val;
}

/**
 * Check if the active language requires Right-to-Left (RTL) layout.
 */
export function isRTL(lang: LanguageCode): boolean {
  const info = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
  return info?.isRTL ?? false;
}

/**
 * Get native Web Speech API recognition code.
 */
export function getSpeechRecognitionCode(lang: LanguageCode): string {
  const info = SUPPORTED_LANGUAGES.find((l) => l.code === lang);
  return info?.speechCode || "hi-IN";
}

/**
 * Dynamic problem presentation translator for common machine issues.
 */
export function localizeDiagnosisProblem(
  hindiText: string | undefined,
  lang: LanguageCode
): string {
  if (!hindiText) return t("diagnosis.possibleIssue", lang);
  if (lang === "hi") return hindiText;

  const lower = hindiText.toLowerCase();

  // Engine Overheating / Smoke
  if (lower.includes("धुआं") || lower.includes("गरम") || lower.includes("ओवरहीट") || lower.includes("smoke") || lower.includes("overheat")) {
    switch (lang) {
      case "en": return "Engine Overheating & Cooling System Fault";
      case "mr": return "इंजिन ओव्हरहीटिंग आणि कुलिंग सिस्टीम बिघाड";
      case "te": return "ఇంజిన్ ఓవర్ హీటింగ్ & కూలింగ్ సిస్టమ్ లోపం";
      case "pa": return "ਇੰਜਣ ਓਵਰਹੀਟਿੰਗ ਅਤੇ ਕੂਲਿੰਗ ਸਿਸਟਮ ਨੁਕਸ";
      case "gu": return "એન્જિન ઓવરહીટિંગ અને કૂલિંગ સિસ્ટમ ખામી";
      case "ta": return "என்ஜின் அதிக வெப்பமாதல் & குளிரூட்டும் அமைப்பு கோளாறு";
      case "bn": return "ইঞ্জিন অতিরিক্ত গরম হওয়া এবং কুলিং সিস্টেম সমস্যা";
      case "kn": return "ಎಂಜಿನ್ ಅತಿಯಾಗಿ ಬಿಸಿಯಾಗುವುದು ಮತ್ತು ಕೂಲಿಂಗ್ ಸಿಸ್ಟಮ್ ದೋಷ";
      case "ml": return "എഞ്ചിൻ അമിതമായി ചൂടാകലും കൂളിംഗ് സിസ്റ്റം തകരാറും";
      case "ur": return "انجن کا زیادہ گرم ہونا اور کولنگ سسٹم کی خرابی";
      case "bgc": return "इंजन घणा तावड़ा होणा अर कुलिंग सिस्टम खराबी";
      case "raj": return "इंजन घणो तातो होवणो अर कुलिंग सिस्टम खोट";
      default: return hindiText;
    }
  }

  // Fluid / Oil / Hydraulic Leakage
  if (lower.includes("लीक") || lower.includes("रिसाव") || lower.includes("leak") || lower.includes("तेल") || lower.includes("हाइड्रोलिक")) {
    switch (lang) {
      case "en": return "Hydraulic Valve & Fluid Leakage";
      case "mr": return "हायड्रॉलिक व्हॉल्व्ह व तेल गळती समस्या";
      case "te": return "హైడ్రాలిక్ వాల్వ్ & ఆయిల్ లీకేజ్ సమస్య";
      case "pa": return "ਹਾਈਡ੍ਰੌਲਿਕ ਵਾਲਵ ਅਤੇ ਤੇਲ ਲੀਕੇਜ ਨੁਕਸ";
      case "gu": return "હાઇડ્રોલિક વાલ્વ અને ઓઇલ લીકેજ સમસ્યા";
      case "ta": return "ஹைட்ராலிக் வால்வு & எண்ணெய் கசிவு கோளாறு";
      case "bn": return "হাইড্রোলিক ভালভ ও তেল লিক সমস্যা";
      case "kn": return "ಹೈಡ್ರಾಲಿಕ್ ವಾಲ್ವ್ ಮತ್ತು ಆಯಿಲ್ ಸೋರಿಕೆ ಸಮಸ್ಯೆ";
      case "ml": return "ഹൈഡ്രോളിക് വാൽവ്, ഓയിൽ ചോർച്ച തകരാർ";
      case "ur": return "ہائیڈرولک والو اور تیل کا رساؤ";
      case "bgc": return "हाइड्रोलिक वाल्व अर तेल चूवण री खराबी";
      case "raj": return "हाइड्रोलिक वाल्व अर तेल चूवण री खोट";
      default: return hindiText;
    }
  }

  // Electrical / Starting
  if (lower.includes("स्टार्ट") || lower.includes("करंट") || lower.includes("वायरিং") || lower.includes("इलेक्ट्रिकल")) {
    switch (lang) {
      case "en": return "Electrical Wiring & Starter Motor Fault";
      case "mr": return "इलेक्ट्रिकल वायरिंग व स्टार्टर मोटर बिघाड";
      case "te": return "ఎలక్ట్రికల్ వైరింగ్ & స్టార్టర్ మోటార్ లోపం";
      case "pa": return "ਇਲੈਕਟ੍ਰੀਕਲ ਵਾਇਰਿੰਗ ਅਤੇ ਸਟਾਰਟਰ ਮੋਟਰ ਨੁਕਸ";
      case "gu": return "ઇલેક્ટ્રિકલ વાયરિંગ અને સ્ટાર્ટર મોટર ખામી";
      case "ta": return "மின்சார வயரிங் & ஸ்டார்ட்டர் மோட்டார் கோளாறு";
      case "bn": return "বৈদ্যুতিক ওয়্যারিং ও স্টার্টার মোটর সমস্যা";
      case "kn": return "ವಿದ್ಯುತ್ ವೈರಿಂಗ್ ಮತ್ತು ಸ್ಟಾರ್ಟರ್ ಮೋಟಾರ್ ದೋಷ";
      case "ml": return "ഇലക്ട്രിക്കൽ വയറിംഗ്, സ്റ്റാർട്ടർ മോട്ടോർ തകരാർ";
      case "ur": return "الیکٹریکل وائرنگ اور اسٹارٹر موٹر کی خرابی";
      case "bgc": return "बिजली के तार अर स्टार्टर मोटर खराबी";
      case "raj": return "बिजली रा तार अर स्टार्टर मोटर खोट";
      default: return hindiText;
    }
  }

  return hindiText;
}
