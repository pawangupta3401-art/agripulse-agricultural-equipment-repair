/**
 * Spare Part Recommendation Service — P2F AgriPulse
 *
 * Deterministic rule-based engine. No external AI API.
 * Input: machine type, diagnosis matchedRule, problem description.
 * Output: ordered list of recommended SparePart IDs with reason.
 *
 * Offline-safe: all rules and data are local.
 */

import { mockSpareParts, SparePart } from "./sparePartData";

export interface PartRecommendation {
  part: SparePart;
  /** Farmer-friendly Hindi reason for this part */
  reasonHi: string;
  /** Priority rank (1 = most likely needed) */
  priority: number;
}

export interface SparePartRecommendationResult {
  recommendations: PartRecommendation[];
  /** Overall Hindi explanation shown to farmer */
  summaryHi: string;
  /** matchedRule that triggered recommendations */
  triggeredBy: string;
}

// ─── Deterministic Rule Map ───────────────────────────────────────────────────
// key = matchedRule from AIDiagnosisResult OR derived category
// value = ordered array of { partId, reasonHi }

type RuleEntry = { partId: string; reasonHi: string; priority: number };

const PART_RULES: Record<string, RuleEntry[]> = {
  // Engine overheating (smoke, high temp)
  smoke_overheating: [
    { partId: "part-001", reasonHi: "इंजन ज़्यादा गर्म हो रहा है — ऑयल जाँचना ज़रूरी है", priority: 1 },
    { partId: "part-003", reasonHi: "एयर फ़िल्टर बंद होने से ओवरहीटिंग होती है", priority: 2 },
    { partId: "part-011", reasonHi: "रेडिएटर कैप ख़राब होने पर कूलिंग सिस्टम फेल हो सकता है", priority: 3 },
    { partId: "part-012", reasonHi: "कूलेंट कम होने से इंजन गरम होता है", priority: 4 },
  ],

  // Oil / fluid leakage
  fluid_leakage: [
    { partId: "part-006", reasonHi: "तरल पदार्थ रिसाव के लिए पंप सील बदलना ज़रूरी है", priority: 1 },
    { partId: "part-010", reasonHi: "पाइप में दरार होने पर रिसाव होता है", priority: 2 },
    { partId: "part-001", reasonHi: "ऑयल रिसाव के बाद इंजन ऑयल दोबारा भरना होगा", priority: 3 },
  ],

  // Engine not starting (starting issue)
  starting_issue: [
    { partId: "part-004", reasonHi: "स्पार्क प्लग ख़राब होने पर इंजन स्टार्ट नहीं होता", priority: 1 },
    { partId: "part-008", reasonHi: "बैटरी कमज़ोर होने पर इंजन स्टार्ट नहीं होती", priority: 2 },
    { partId: "part-009", reasonHi: "फ्यूज़ उड़ने पर इग्निशन काम नहीं करता", priority: 3 },
  ],

  // Visible damage / broken component
  visible_damage: [
    { partId: "part-005", reasonHi: "बेल्ट टूटी हुई दिखने पर बदलना ज़रूरी है", priority: 1 },
    { partId: "part-006", reasonHi: "सील टूटने पर रिसाव और नुकसान बढ़ सकता है", priority: 2 },
    { partId: "part-010", reasonHi: "पाइप क्षतिग्रस्त होने पर बदलें", priority: 3 },
  ],

  // Loose / broken component (rattling sound)
  loose_broken_component: [
    { partId: "part-005", reasonHi: "ढीली बेल्ट की आवाज़ के लिए बेल्ट जाँचें और बदलें", priority: 1 },
    { partId: "part-002", reasonHi: "ऑयल फ़िल्टर ढीला होने पर ऑयल प्रेशर कम होता है", priority: 2 },
  ],

  // Unusual / abnormal sound
  unusual_sound: [
    { partId: "part-005", reasonHi: "अजीब आवाज़ अक्सर बेल्ट की समस्या से होती है", priority: 1 },
    { partId: "part-002", reasonHi: "ऑयल फ़िल्टर बंद होने पर इंजन से आवाज़ आती है", priority: 2 },
    { partId: "part-001", reasonHi: "इंजन ऑयल कम होने पर मेटल की आवाज़ आती है", priority: 3 },
  ],

  // Pump not working
  pump_issue: [
    { partId: "part-006", reasonHi: "पंप से पानी नहीं निकल रहा — सील बदलना ज़रूरी है", priority: 1 },
    { partId: "part-005", reasonHi: "पंप बेल्ट ढीली होने से पंप काम नहीं करता", priority: 2 },
    { partId: "part-010", reasonHi: "पाइप बंद या फटी होने पर पानी नहीं आता", priority: 3 },
  ],

  // Sprayer nozzle / spray issue
  sprayer_nozzle: [
    { partId: "part-007", reasonHi: "नोज़ल बंद या ख़राब होने पर दवाई ठीक से नहीं निकलती", priority: 1 },
    { partId: "part-010", reasonHi: "पाइप में रुकावट होने पर स्प्रे कम हो जाती है", priority: 2 },
    { partId: "part-006", reasonHi: "पंप सील ख़राब होने पर दबाव कम हो जाता है", priority: 3 },
  ],

  // Electrical problem
  electrical: [
    { partId: "part-009", reasonHi: "फ्यूज़ उड़ने पर बिजली का कनेक्शन टूट जाता है", priority: 1 },
    { partId: "part-008", reasonHi: "बैटरी कमज़ोर होने पर सभी बिजली के उपकरण बंद हो जाते हैं", priority: 2 },
  ],

  // Fallback / general
  general_fallback: [
    { partId: "part-001", reasonHi: "नियमित सर्विस के लिए इंजन ऑयल जाँचें", priority: 1 },
    { partId: "part-003", reasonHi: "एयर फ़िल्टर साफ़ करना या बदलना ज़रूरी हो सकता है", priority: 2 },
  ],
};

// ─── Keyword-based fallback mapping ──────────────────────────────────────────
// Used when matchedRule doesn't directly map to PART_RULES

const KEYWORD_TO_RULE: Array<{ keywords: string[]; rule: string }> = [
  { keywords: ["नोज़ल", "nozzle", "spray", "स्प्रे", "छिड़काव"], rule: "sprayer_nozzle" },
  { keywords: ["धुआं", "गर्म", "overheating", "smoke", "heat"], rule: "smoke_overheating" },
  { keywords: ["रिसाव", "leak", "oil", "तेल", "fluid"], rule: "fluid_leakage" },
  { keywords: ["स्टार्ट", "start", "चालू नहीं"], rule: "starting_issue" },
  { keywords: ["पंप", "pump", "पानी"], rule: "pump_issue" },
  { keywords: ["बिजली", "electric", "battery", "बैटरी"], rule: "electrical" },
  { keywords: ["आवाज़", "sound", "noise", "खटखट"], rule: "unusual_sound" },
  { keywords: ["टूटा", "damage", "broken", "ढीला"], rule: "visible_damage" },
];

// ─── Machine-type boost ───────────────────────────────────────────────────────

const MACHINE_PART_BOOST: Record<string, string[]> = {
  sprayer: ["part-007", "part-006", "part-010"],
  "स्प्रेयर": ["part-007", "part-006", "part-010"],
  "water pump": ["part-006", "part-005", "part-010"],
  "वाटर पंप": ["part-006", "part-005", "part-010"],
  tractor: ["part-001", "part-002", "part-003"],
  "ट्रैक्टर": ["part-001", "part-002", "part-003"],
  "power tiller": ["part-004", "part-001", "part-003"],
  "पावर टिलर": ["part-004", "part-001", "part-003"],
};

// ─── Main Recommendation Function ────────────────────────────────────────────

export function recommendSpareParts(input: {
  machineType: string;
  matchedRule?: string;
  problemDescription?: string;
}): SparePartRecommendationResult {
  const { machineType, matchedRule, problemDescription } = input;

  const machineLower = (machineType || "").toLowerCase().trim();
  const descLower = (problemDescription || "").toLowerCase();

  // 1. Resolve rule: matchedRule → PART_RULES key
  let resolvedRule: string = matchedRule || "";

  // Direct match
  if (resolvedRule && PART_RULES[resolvedRule]) {
    // already valid
  } else {
    // Keyword fallback from description + machineType combined text
    const searchText = `${descLower} ${machineLower}`;
    for (const { keywords, rule } of KEYWORD_TO_RULE) {
      if (keywords.some((kw) => searchText.includes(kw))) {
        resolvedRule = rule;
        break;
      }
    }
  }

  // Final fallback
  if (!resolvedRule || !PART_RULES[resolvedRule]) {
    resolvedRule = "general_fallback";
  }

  const ruleEntries = PART_RULES[resolvedRule];

  // 2. Build base recommendations from rule
  const partMap = new Map<string, PartRecommendation>();

  for (const entry of ruleEntries) {
    const part = mockSpareParts.find((p) => p.id === entry.partId);
    if (!part) continue;
    partMap.set(entry.partId, {
      part,
      reasonHi: entry.reasonHi,
      priority: entry.priority,
    });
  }

  // 3. Boost machine-specific parts if not already included (priority 10+ = low)
  const boostedIds = MACHINE_PART_BOOST[machineLower] || [];
  let boostPriority = 10;
  for (const partId of boostedIds) {
    if (!partMap.has(partId)) {
      const part = mockSpareParts.find((p) => p.id === partId);
      if (part) {
        partMap.set(partId, {
          part,
          reasonHi: `${machineType} के लिए अक्सर ज़रूरी पार्ट`,
          priority: boostPriority++,
        });
      }
    }
  }

  // 4. Sort by priority, cap at 5 recommendations
  const recommendations = Array.from(partMap.values())
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 5);

  // 5. Summary
  const summaryHi = buildSummaryHi(resolvedRule, recommendations.length);

  return { recommendations, summaryHi, triggeredBy: resolvedRule };
}

function buildSummaryHi(rule: string, count: number): string {
  const summaries: Record<string, string> = {
    smoke_overheating: `इंजन ओवरहीटिंग के लिए ${count} संभावित पार्ट पहचाने गए हैं।`,
    fluid_leakage: `रिसाव की समस्या के लिए ${count} पार्ट ज़रूरी हो सकते हैं।`,
    starting_issue: `इंजन स्टार्ट न होने के लिए ${count} पार्ट जाँचने होंगे।`,
    visible_damage: `दिखने वाले नुकसान के लिए ${count} पार्ट बदलने पड़ सकते हैं।`,
    loose_broken_component: `ढीले/टूटे हिस्से के लिए ${count} पार्ट चाहिए।`,
    unusual_sound: `असामान्य आवाज़ के लिए ${count} पार्ट जाँचना ज़रूरी है।`,
    pump_issue: `पंप की समस्या के लिए ${count} पार्ट ज़रूरी हो सकते हैं।`,
    sprayer_nozzle: `स्प्रेयर समस्या के लिए ${count} पार्ट जाँचें।`,
    electrical: `बिजली की समस्या के लिए ${count} पार्ट जाँचना होगा।`,
    general_fallback: `${count} संभावित पार्ट पहचाने गए हैं।`,
  };
  return summaries[rule] || `${count} संभावित पार्ट पहचाने गए हैं।`;
}
