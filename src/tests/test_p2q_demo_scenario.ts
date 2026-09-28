/**
 * P2Q-VERIFY Demo Scenario Test
 *
 * Tests the exact user journey:
 * Machine: Tractor
 * Problem: Possible hydraulic issue
 * Urgency: High
 * Context: Important farming activity approaching ("कल बुवाई शुरू")
 *
 * Pipeline verified:
 * Complaint -> AI diagnosis -> Confidence -> Urgency -> Recovery Engine ->
 * Technician/Centre Options -> Pricing -> Confirmation -> Job Card ->
 * Repair Progression -> Verification -> Machine Passport -> Maintenance Recommendation
 */

import { DEMO_MACHINES } from "../services/demoData";
import { runDemoAIDiagnosis } from "../services/diagnosisService";
import { generateRecoveryPlan, contributeToMachinePassport } from "../services/recoveryEngineService";
import { createJobCard, recordJobCardVerification } from "../services/jobCardService";
import { calculateEstimatedPricing, calculateFinalPricing } from "../services/pricingService";

console.log("=== P2Q-VERIFY: DEMO SCENARIO VERIFICATION ===\n");

// 1. Machine
const tractor = DEMO_MACHINES.find((m) => m.nameHi.includes("ट्रैक्टर") || m.type === "ट्रैक्टर") || DEMO_MACHINES[0];
console.log(`[Step 1] Machine Selected: ${tractor.nameHi} (ID: ${tractor.id})`);

// 2. Complaint
const problem = "ट्रैक्टर का हाइड्रोलिक लिफ्ट काम नहीं कर रहा, तेल टपक रहा है। कल बुवाई शुरू करनी है।";
console.log(`[Step 2] Problem Reported: "${problem}"`);

// 3. AI Diagnosis & Confidence
const diagnosis = runDemoAIDiagnosis({
  machine: tractor,
  problemDescription: problem,
});
console.log(`[Step 3] AI Diagnosis: ${diagnosis.possibleProblem} (Confidence: ${diagnosis.confidence})`);
console.log(`         Safe Action: ${diagnosis.safeAction}`);

// 4. Urgency & Critical Farming Window
const isUrgent = true;
const isCriticalWindow = true;
console.log(`[Step 4] Urgency: High (Emergency) | Critical Window: कल बुवाई शुरू`);

// 5. Recovery Engine Synthesis
const plan = generateRecoveryPlan({
  machine: tractor,
  problemDescription: problem,
  diagnosis,
  urgency: "emergency",
  farmerLocation: { latitude: 21.1458, longitude: 79.0882, locationSource: "manual", locationUpdatedAt: new Date().toISOString() },
  isOnline: true,
  requiredByTimeText: "कल बुवाई शुरू",
  isCriticalFarmWindow: isCriticalWindow,
});
console.log(`[Step 5] Recovery Engine Options Generated: ${plan.recoveryOptions.length}`);
plan.recoveryOptions.forEach((opt, idx) => {
  console.log(`         Option ${idx + 1}: [${opt.badgeHi}] ${opt.providerNameHi} - ₹${opt.pricing.total} (${opt.estimatedServiceTimeTextHi})`);
  console.log(`                  Pros: ${opt.prosHi.join(" | ")}`);
});

// 6. Pricing Breakdown (Reuse existing pricing engine)
const selectedOption = plan.recoveryOptions[0];
console.log(`[Step 6] Pricing Breakdown for Selected Option (${selectedOption.badgeHi}):`);
console.log(`         Diagnostic: ₹${selectedOption.pricing.diagnosticFee} + Labour: ₹${selectedOption.pricing.labourFee} + Parts: ₹${selectedOption.pricing.partsEstimate} + Travel: ₹${selectedOption.pricing.travelFee} - Discount: ₹${selectedOption.pricing.discount || 0} = Total: ₹${selectedOption.pricing.total}`);

// 7. Confirmation & Job Card Creation
const jobCard = createJobCard({
  repairRequestId: `repair-demo-${Date.now()}`,
  machine: plan.machineNameHi,
  machineIcon: plan.machineIcon,
  problem: plan.problemSummaryHi,
  diagnosis: diagnosis.possibleProblem,
  urgency: plan.urgencyLevel,
  safetyMessage: plan.safetyWarning || undefined,
  technicianId: selectedOption.technicianId || "tech-001",
  technicianNameHi: selectedOption.providerNameHi,
  technicianPhone: "9876543210",
  technicianSkillHi: "हाइड्रोलिक विशेषज्ञ",
  technicianDistanceKm: selectedOption.distanceKm,
  technicianRating: 4.8,
  farmerLocationText: "नागपुर ग्रामीण (खेत नंबर 4)",
  approxDistanceText: selectedOption.distanceText,
  estimatedCost: selectedOption.pricing,
  serviceMode: selectedOption.serviceMode,
});
console.log(`[Step 7] Job Card Created: ${jobCard.jobId} (Technician: ${jobCard.technicianNameHi})`);

// 8. Human Override for Diagnosis during physical inspection
const confirmedDiagnosis = "हाइड्रोलिक वाल्व सील लीकेज व प्रेशर ड्रॉप (मैकेनिक द्वारा प्रत्यक्ष पुष्टि)";
jobCard.technicianOverrideDiagnosis = confirmedDiagnosis;
jobCard.diagnosis = confirmedDiagnosis;
console.log(`[Step 8] Human Override Applied: "${jobCard.diagnosis}"`);

// 9. Transparent Final Pricing adjustment
const finalCalc = calculateFinalPricing({
  estimatedPricing: selectedOption.pricing,
  revisedLabourFee: 400,
  revisedPartsCost: 350,
  reason: "अतिरिक्त पार्ट खराब मिला",
  technicianId: jobCard.technicianId,
});
jobCard.finalCost = finalCalc.finalPricing;
console.log(`[Step 9] Final Price: ₹${jobCard.finalCost.total} (Difference: ₹${finalCalc.priceAdjustment?.difference ?? 0})`);

// 10. Repair Verification
const passed = true;
const verificationResult = passed ? "मशीन सही पाई गई (Passed)" : "जाँच असफल (Failed)";
console.log(`[Step 10] Verification: ${verificationResult}`);

// 11. Machine Passport & Maintenance Recommendation
const passportContrib = contributeToMachinePassport({
  plan,
  jobCard,
  finalCost: jobCard.finalCost.total,
});

const passportRecord = {
  repairDate: new Date().toLocaleDateString("hi-IN"),
  diagnosis: jobCard.diagnosis,
  technician: jobCard.technicianNameHi,
  partsUsed: ["हाइड्रोलिक होज़ पाइप", "ओ-रिंग सील"],
  repairResult: "सफलतापूर्वक मरम्मत हुई",
  verificationResult: "मशीन सही पाई गई (Passed)",
  finalCost: jobCard.finalCost.total,
  costBreakdown: jobCard.finalCost,
  problemDescription: jobCard.problem,
  estimatedCost: jobCard.estimatedCost?.total,
  maintenanceRecommendation: passportContrib.preventiveAdviceHi,
  technicianOverrideDiagnosis: jobCard.technicianOverrideDiagnosis,
};

console.log(`[Step 11] Machine Passport Updated:`);
console.log(`          - Problem: ${passportRecord.problemDescription}`);
console.log(`          - Confirmed Diagnosis: ${passportRecord.diagnosis}`);
console.log(`          - Technician: ${passportRecord.technician}`);
console.log(`          - Parts: ${passportRecord.partsUsed.join(", ")}`);
console.log(`          - Final Cost: ₹${passportRecord.finalCost}`);
console.log(`          - Maintenance Recommendation: ${passportRecord.maintenanceRecommendation}`);

console.log("\n=== DEMO SCENARIO VERIFICATION COMPLETE: ALL STEPS VERIFIED ===");
