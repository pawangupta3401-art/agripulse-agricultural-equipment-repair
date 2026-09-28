/**
 * AgriPulse Recovery Engine — P2Q Final Signature Feature
 *
 * Answers the critical farmer question:
 * "Given this failure, urgency, critical farming window, location, technicians,
 *  service centres, parts, cost, and connectivity — what is the most practical path
 *  to get this machine back into operation?"
 *
 * Pure Decision-Support Layer:
 * - Synthesizes existing AI diagnosis, critical farm window, technician network,
 *   service centres, spare parts, and transparent pricing into up to 3 practical options.
 * - Supports offline-first operation.
 * - Prevents fake AI certainty, fake real-time inventory, or arbitrary rankings.
 * - Feeds back into Machine Passport upon repair completion.
 */

import {
  Machine,
  AIDiagnosisResult,
  CalculatedUrgency,
  RecoveryPlan,
  RecoveryOption,
  RecoveryStatus,
  PricingBreakdown,
  JobCard,
} from "../types";
import { FarmerLocation } from "./locationService";
import { matchTechnician } from "./technicianMatchingService";
import { matchServiceCentres, getServiceCentres } from "./serviceCentreService";
import { recommendSpareParts } from "./sparePartRecommendationService";
import { calculateEstimatedPricing } from "./pricingService";
import { getTechnicians, deriveTechnicianVerificationStatus } from "./certificationService";

export interface GenerateRecoveryPlanParams {
  machine: Machine;
  problemDescription: string;
  diagnosis: AIDiagnosisResult | null;
  urgency: CalculatedUrgency | null;
  farmerLocation: FarmerLocation | null;
  isOnline: boolean;
  requiredByTimeText?: string;
  isCriticalFarmWindow?: boolean;
}

/**
 * Main Recovery Engine decision synthesis function.
 */
export function generateRecoveryPlan(params: GenerateRecoveryPlanParams): RecoveryPlan {
  const {
    machine,
    problemDescription,
    diagnosis,
    urgency,
    farmerLocation,
    isOnline,
    requiredByTimeText,
    isCriticalFarmWindow = false,
  } = params;

  // 1. Determine Recovery Status
  const recoveryStatus: RecoveryStatus = "recovery_planning";

  // 2. Machine Service History Check (Preventive Learning - Requirement 10)
  let previousIssueNoticeHi: string | undefined = undefined;
  const historyText = `${machine.serviceHistory || ""} ${machine.previousRepairs || ""}`.toLowerCase();
  if (historyText.trim().length > 0) {
    const lowerProblem = problemDescription.toLowerCase();
    const keywords = lowerProblem.split(" ").filter((w) => w.length > 3);
    const hasMatch = keywords.some((w) => historyText.includes(w));
    if (hasMatch) {
      previousIssueNoticeHi = `⚠️ पूर्व इतिहास: समान समस्या पूर्व में दर्ज की गई है ("${machine.serviceHistory || machine.previousRepairs}")। निवारक निरीक्षण पर विचार करें।`;
    }
  }

  // 3. AI Diagnosis Confidence & Safety Warning
  const conf = diagnosis?.confidence || "मध्यम";
  let aiConfidence: "high" | "medium" | "low" | "uncertain" = "medium";
  let confidenceAdviceHi = "फील्ड निरीक्षण के साथ मरम्मत कार्य प्रारंभ करना सुरक्षित है।";

  if (conf === "उच्च" || conf === "high") {
    aiConfidence = "high";
    confidenceAdviceHi = "प्रारंभिक तकनीकी लक्षण स्पष्ट हैं। भौतिक पुष्टि के बाद लक्षित स्पेयर पार्ट्स के साथ सुधार संभव है।";
  } else if (conf === "निम्न" || conf === "low") {
    aiConfidence = "low";
    confidenceAdviceHi = "AI निदान अनिश्चित है — किसी भी बड़े पार्ट बदलाव से पहले मैकेनिक द्वारा भौतिक जांच आवश्यक है।";
  } else {
    aiConfidence = "medium";
    confidenceAdviceHi = "मैकेनिक द्वारा प्राथमिक भौतिक सत्यापन के बाद ही मुख्य मरम्मत शुरू की जाएगी।";
  }

  // Safety Warning check (Requirement 11)
  let safetyWarning: string | null = diagnosis?.safetyWarning || null;
  if (!safetyWarning) {
    const textToCheck = `${problemDescription} ${diagnosis?.possibleProblem || ""}`.toLowerCase();
    if (
      textToCheck.includes("धुआं") ||
      textToCheck.includes("smoke") ||
      textToCheck.includes("आग") ||
      textToCheck.includes("fire") ||
      textToCheck.includes("लीकेज") ||
      textToCheck.includes("leak") ||
      textToCheck.includes("ब्रेक") ||
      textToCheck.includes("brake") ||
      textToCheck.includes("overheat") ||
      textToCheck.includes("गर्म")
    ) {
      safetyWarning = "⚠️ सुरक्षा चेतावनी: जब तक मैकेनिक भौतिक जांच न कर ले, मशीन को चालू न करें।";
    }
  }

  // 4. Spare Parts Bottleneck Check (Requirement 7)
  const partResult = recommendSpareParts({
    machineType: machine.nameHi || machine.type,
    problemDescription,
    matchedRule: diagnosis?.matchedRule,
  });

  const partsBottleneckDetected =
    partResult.recommendations.length > 0 &&
    partResult.recommendations.every((r) => !r.part.available);

  let partsBottleneckAdviceHi: string | undefined = undefined;
  if (partsBottleneckDetected) {
    partsBottleneckAdviceHi =
      "⚠️ स्पेयर पार्ट्स की तत्काल उपलब्धता सीमित है। नजदीकी FPO वर्कशॉप अथवा स्थानीय पार्टनर केंद्र से पार्ट्स मंगवाने की व्यवस्था की जा रही है।";
  }

  // 5. Generate Up to 3 Practical Recovery Options (Requirement 2 & 5 & 6)

  // Run technician matching
  const techMatch = matchTechnician({
    machineType: machine.nameHi || machine.type,
    problemCategory: diagnosis?.matchedRule || problemDescription,
    urgency,
    farmerLocation,
  });

  // Run service centre matching
  const requiredPartIds = partResult.recommendations.map((r) => r.part.id);
  const centreMatch = matchServiceCentres({
    machineType: machine.nameHi || machine.type,
    problemCategory: diagnosis?.matchedRule || problemDescription,
    farmerLocation,
    requiredPartIds,
  });

  const recoveryOptions: RecoveryOption[] = [];

  // OPTION 1: ⚡ FASTEST (त्वरित समाधान - Closest available doorstep technician)
  const bestTech = techMatch.recommended || techMatch.allCandidates[0]?.technician;
  if (bestTech) {
    const verification = deriveTechnicianVerificationStatus(bestTech);
    const isVerified = verification === "verified";
    const providerBadge = isVerified
      ? "🟢 प्रमाणित मैकेनिक"
      : verification === "expired"
      ? "🔴 प्रमाणन नवीनीकरण आवश्यक"
      : "अनुभवी मैकेनिक";

    const doorstepPricing = calculateEstimatedPricing({
      machineType: machine.nameHi || machine.type,
      recommendedPartIds: requiredPartIds,
      distanceKm: bestTech.distanceKm || 3.0,
      discount: isCriticalFarmWindow ? 50 : 0, // FPO seasonal emergency concession
    });

    const estHours = Math.max(1.5, Math.round(((bestTech.distanceKm || 3) / 15 + 1.2) * 10) / 10);
    const skillLabel = techMatch.requiredSkill || bestTech.skills[0] || "उपकरण";

    recoveryOptions.push({
      id: "opt-fastest",
      type: "fastest",
      badgeHi: "⚡ सबसे त्वरित (Fastest Recovery)",
      serviceMode: "doorstep",
      providerNameHi: `${bestTech.nameHi} (डोरस्टेप मैकेनिक)`,
      providerTypeHi: providerBadge,
      technicianId: bestTech.id,
      distanceKm: bestTech.distanceKm || 3.0,
      distanceText: isOnline ? `${bestTech.distanceKm || 3.0} किमी दूर` : `${bestTech.distanceKm || 3.0} किमी (कैश्ड दूरी)`,
      estimatedServiceTimeHours: estHours,
      estimatedServiceTimeTextHi: `लगभग ${estHours} घंटे में मशीन चालू होने का अनुमान`,
      pricing: doorstepPricing,
      reasonHi: isVerified
        ? `प्रमाणित ${skillLabel} मैकेनिक (${bestTech.nameHi}) आवश्यक तकनीकी कौशल के साथ खेत पर पहुंचने हेतु उपलब्ध।`
        : `अनुभवी मैकेनिक (${bestTech.nameHi}) निकटतम दूरी पर खेत पर सेवा हेतु उपलब्ध।`,
      partsAvailable: !partsBottleneckDetected,
      isAvailable: isOnline ? bestTech.available : false,
      prosHi: [
        `उपकरण कौशल: ${skillLabel}`,
        isVerified ? "सत्यापित प्रमाणन (मान्यता प्राप्त)" : "व्यावहारिक कार्य अनुभव",
        isOnline ? "सेवा क्षेत्र: निकटतम उपलब्ध" : "सेवा क्षेत्र: कैश्ड डेटा",
        partsBottleneckDetected ? "पार्ट्स: मंगवाना पड़ेगा" : "पार्ट्स: प्राथमिक पार्ट्स उपलब्ध",
        `डाउनटाइम: लगभग ${estHours} घंटे`,
      ],
    });
  }

  // OPTION 2: 🏪 NEAREST SERVICE CENTRE (निकटतम वर्कशॉप / FPO)
  const bestCentre = centreMatch.recommended || centreMatch.alternatives[0];
  if (bestCentre) {
    const centreCandidate = centreMatch.allCandidates.find((c) => c.centre.id === bestCentre.id);
    const centreHasParts = centreCandidate ? centreCandidate.hasRequiredParts : bestCentre.stockedParts.some((p) => p.inStock);

    const centrePricing = calculateEstimatedPricing({
      machineType: machine.nameHi || machine.type,
      recommendedPartIds: requiredPartIds,
      distanceKm: 0, // Workshop visit: zero travel fee
      discount: bestCentre.centreType === "FPO" ? 100 : 50, // FPO member savings
    });

    const estHours = Math.max(3.0, Math.round(((bestCentre.distanceKm || 4) / 10 + 2.5) * 10) / 10);

    recoveryOptions.push({
      id: "opt-centre",
      type: "nearest_centre",
      badgeHi: "🏪 नजदीकी सर्विस सेंटर (FPO / Workshop)",
      serviceMode: "workshop",
      providerNameHi: bestCentre.nameHi,
      providerTypeHi: `${bestCentre.centreType} वर्कशॉप`,
      serviceCentreId: bestCentre.id,
      distanceKm: bestCentre.distanceKm || 4.0,
      distanceText: isOnline ? `${bestCentre.distanceKm || 4.0} किमी` : `${bestCentre.distanceKm || 4.0} किमी (कैश्ड)`,
      estimatedServiceTimeHours: estHours,
      estimatedServiceTimeTextHi: `लगभग ${estHours} घंटे (वर्कशॉप जांच सहित)`,
      pricing: centrePricing,
      reasonHi: centreHasParts
        ? `${bestCentre.nameHi} में आवश्यक स्पेयर पार्ट्स व टेस्टिंग उपकरण उपलब्ध हैं।`
        : `${bestCentre.nameHi} में टेस्टिंग उपकरण उपलब्ध हैं, पार्ट ऑर्डर पर उपलब्ध कराया जाएगा।`,
      partsAvailable: centreHasParts,
      isAvailable: isOnline ? bestCentre.operatingStatus === "Open" : false,
      prosHi: [
        `सुविधा: ${bestCentre.centreType} वर्कशॉप`,
        "आधुनिक टेस्टिंग उपकरण उपलब्ध",
        centreHasParts ? "स्पेयर पार्ट्स: स्टॉक में उपलब्ध" : "स्पेयर पार्ट्स: ऑर्डर पर उपलब्ध",
        "शून्य यात्रा शुल्क (वर्कशॉप सेवा)",
        "मूल स्पेयर पार्ट्स वारंटी",
      ],
    });
  }

  // OPTION 3: 💰 LOWER ESTIMATED COST (किफायती विकल्प)
  const altCentre = centreMatch.alternatives[0] || bestCentre;
  const altTech = techMatch.alternatives[0] || bestTech;
  const altCandidate = altCentre ? centreMatch.allCandidates.find((c) => c.centre.id === altCentre.id) : undefined;
  const altHasParts = altCandidate ? altCandidate.hasRequiredParts : (altCentre?.stockedParts?.some((p) => p.inStock) ?? true);

  const lowCostPricing = calculateEstimatedPricing({
    machineType: machine.nameHi || machine.type,
    recommendedPartIds: requiredPartIds.slice(0, 1), // Essential parts priority
    distanceKm: 0, // Workshop visit: zero travel fee
    discount: 150, // Cooperative subsidy/discount
  });

  const lowCostHours = 5.5;

  recoveryOptions.push({
    id: "opt-lowest-cost",
    type: "lowest_cost",
    badgeHi: "💰 सबसे किफायती विकल्प (Lower Estimated Cost)",
    serviceMode: "workshop",
    providerNameHi: altCentre ? altCentre.nameHi : "सहकारी सेवा केंद्र",
    providerTypeHi: "सहकारी / FPO रियायती सेवा",
    serviceCentreId: altCentre?.id,
    technicianId: altTech?.id,
    distanceKm: altCentre?.distanceKm || 5.0,
    distanceText: isOnline ? `${altCentre?.distanceKm || 5.0} किमी` : `${altCentre?.distanceKm || 5.0} किमी (कैश्ड)`,
    estimatedServiceTimeHours: lowCostHours,
    estimatedServiceTimeTextHi: `लगभग ${lowCostHours} घंटे (निर्धारित स्लॉट)`,
    pricing: lowCostPricing,
    reasonHi: "सामूहिक FPO सब्सिडी एवं शून्य यात्रा शुल्क के कारण सबसे कम अनुमानित खर्च।",
    partsAvailable: altHasParts,
    isAvailable: isOnline,
    prosHi: [
      "₹150 तक FPO / योजना रियायत",
      "किफायती निर्धारित स्लॉट मरम्मत",
      altHasParts ? "पार्ट्स: सहकारी स्टॉक उपलब्ध" : "पार्ट्स: साझा सहकारी आपूर्ति",
      "प्रमाणित कार्य वारंटी",
    ],
  });

  return {
    machineId: machine.id,
    machineNameHi: machine.nameHi || machine.type,
    machineIcon: machine.icon || "🚜",
    problemSummaryHi: diagnosis?.possibleProblem || problemDescription,
    recoveryStatus,
    urgencyLevel: urgency || "सामान्य",
    isCriticalFarmWindow,
    criticalWindowTextHi: isCriticalFarmWindow
      ? `⚠️ महत्वपूर्ण कृषि कार्य: ${requiredByTimeText || "बुवाई/कटाई का समय"} — त्वरित रिकवरी प्राथमिकता`
      : undefined,
    aiConfidence,
    confidenceAdviceHi,
    safetyWarning,
    partsBottleneckDetected,
    partsBottleneckAdviceHi,
    previousIssueNoticeHi,
    recoveryOptions,
    selectedOptionId: recoveryOptions[0]?.id,
    isOffline: !isOnline,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generate a concise feature-phone SMS summary of the recovery plan.
 */
export function getFeaturePhoneRecoverySummary(plan: RecoveryPlan): string {
  const fastest = plan.recoveryOptions.find((o) => o.type === "fastest") || plan.recoveryOptions[0];
  const urgencyText = plan.isCriticalFarmWindow ? "अति-आवश्यक" : "सामान्य";
  const cost = fastest ? fastest.pricing.total : 500;
  const provider = fastest ? fastest.providerNameHi : "मैकेनिक";

  return `AgriPulse रिकवरी योजना: ${plan.machineNameHi} समस्या दर्ज। प्राथमिकता: ${urgencyText}। सबसे तेज विकल्प: ${provider} (लगभग ${fastest?.estimatedServiceTimeHours || 2} घंटे, अनुमान: ₹${cost})। पुष्टि हेतु 1 दबाएं।`;
}

/**
 * Convert recovery plan progress into updated Machine Passport record fields upon repair completion.
 */
export function contributeToMachinePassport(params: {
  plan: RecoveryPlan;
  jobCard: JobCard;
  finalCost: number;
}): {
  recoverySummaryHi: string;
  preventiveAdviceHi: string;
} {
  const { plan, jobCard, finalCost } = params;
  const recoverySummaryHi = `रिकवरी योजना सफल: ${plan.problemSummaryHi} की मरम्मत ${jobCard.technicianNameHi} द्वारा पूर्ण। अंतिम लागत ₹${finalCost}।`;
  const preventiveAdviceHi = plan.previousIssueNoticeHi
    ? "समान समस्या दोहराई गई है — 30 दिन बाद निवारक निरीक्षण करवाएं।"
    : "अगली सामान्य सर्विस 90 दिन बाद अनुशंसित है।";

  return {
    recoverySummaryHi,
    preventiveAdviceHi,
  };
}
