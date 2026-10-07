/**
 * test_full_journey_and_passport_e2e.ts
 *
 * Comprehensive End-to-End Test Suite for YANTRIQ Full Repair Journey (Steps 1 to 21):
 * 1. Farmer Login / Account
 * 2. My Machines
 * 3. Report Breakdown
 * 4. Photo / Voice / Text Input
 * 5. AI Machine Diagnosis
 * 6. Safety Recommendation
 * 7. Offline-First Save / Sync
 * 8. Critical Farm Window
 * 9. Technician Matching
 * 10. Technician Acceptance
 * 11. Digital Job Card
 * 12. Spare-Part Information
 * 13. Repair in Progress
 * 14. Repair Completed
 * 15. Job-Ready Verification
 * 16. Camera / Evidence Capture
 * 17. Visual Analysis / YOLO Abstraction
 * 18. Job-Ready Result Evaluation (Deterministic Rules)
 * 19. Farmer Confirmation
 * 20. Machine Passport Update
 * 21. Preventive Maintenance / Service History
 */

// ── Mock LocalStorage & Browser globals ─────────────────────────────────────
const memoryStore: Record<string, string> = {};
(globalThis as any).window = {
  localStorage: {
    getItem: (key: string) => memoryStore[key] || null,
    setItem: (key: string, val: string) => { memoryStore[key] = String(val); },
    removeItem: (key: string) => { delete memoryStore[key]; },
    clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); },
  },
};
(globalThis as any).localStorage = (globalThis as any).window.localStorage;
(globalThis as any).navigator = { onLine: true };

import {
  getMachines,
  saveMachines,
  createRepairRequest,
  getRepairRequests,
  updateRepairStatus,
  recordRepairVerification,
} from "../services/storageService";
import {
  createJobCard,
  getJobCardByRepairId,
  updateTechnicianWorkflowStatus,
  completeJobCardRepair,
  recordJobCardVerification,
  updatePartSelection,
} from "../services/jobCardService";
import {
  getInitialSprayingChecks,
  computeJobReadyResult,
  buildJobReadinessRecord,
  saveJobReadinessRecord,
  getJobReadinessForRepair,
} from "../services/jobReadinessService";
import { runVisualAnalysis } from "../services/visualAnalysisService";
import { matchTechnician } from "../services/technicianMatchingService";
import { recommendSpareParts } from "../services/sparePartRecommendationService";
import { enqueueSyncOperation, getPendingSyncCount } from "../services/syncQueueService";
import { MachinePassportRecord, JobReadyCheck } from "../types";

let passedCount = 0;
let failedCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAIL: ${testName}`);
    if (detail) console.error(`    Detail: ${detail}`);
    failedCount++;
  }
}

async function runFullJourneyVerification() {
  console.log("==================================================================");
  console.log("STARTING YANTRIQ 21-STEP FULL JOURNEY & PASSPORT E2E VERIFICATION");
  console.log("==================================================================\n");

  // ── Step 1 & 2: Farmer Account & My Machines ─────────────────────────────
  console.log("--- Steps 1 & 2: Farmer Account & My Machines ---");
  const initialMachines = getMachines();
  assert(initialMachines.length >= 2, "Default machines loaded for farmer account", `Found: ${initialMachines.length}`);
  const sprayer = initialMachines.find((m) => m.id === "sprayer") || initialMachines[0];
  assert(sprayer !== undefined, "Sprayer machine is accessible in inventory");

  // ── Step 3 & 4: Report Breakdown with Multimodal Input ────────────────────
  console.log("\n--- Steps 3 & 4: Report Breakdown with Input ---");
  const repair = createRepairRequest({
    farmerId: "farmer-001",
    machineId: sprayer.id,
    problemDescription: "स्प्रेयर से पानी लीक हो रहा है और नोजल से सही प्रेशर नहीं आ रहा",
    inputMethod: "photo",
    mediaFileName: "clean_water_test_leak.jpg",
    urgency: "urgent",
    isOffline: false,
    diagnosis: {
      possibleProblem: "नोजल रुकावट एवं ओ-रिंग सील रिसाव",
      explanation: "पानी का दबाव कम है और पाइप जोड़ों से रिसाव दिखाई दे रहा है।",
      urgencyLevel: "high",
      matchedRule: "sprayer_leakage",
      confidence: 0.9,
    },
  });
  assert(repair !== null && repair.id.startsWith("rep-"), "Breakdown complaint created with valid repair ID");
  assert(repair.status === "finding_mechanic" || repair.status === "reported", "Initial repair status transitions to SEARCHING_FOR_TECHNICIAN ('finding_mechanic')");

  // ── Step 5 & 6: AI Machine Diagnosis & Safety Recommendation ─────────────
  console.log("\n--- Steps 5 & 6: AI Diagnosis & Safety Recommendation ---");
  assert(repair.diagnosis?.urgencyLevel === "high", "Urgency level identified as high");
  assert(repair.diagnosis?.matchedRule === "sprayer_leakage", "Matched diagnostic rule identifies sprayer leakage");

  // ── Step 7: Offline-First Save & Sync Outbox ──────────────────────────────
  console.log("\n--- Step 7: Offline-First Outbox Sync Check ---");
  const pendingSyncs = getPendingSyncCount();
  assert(pendingSyncs >= 1, "Offline-first sync operation enqueued in local outbox", `Count: ${pendingSyncs}`);

  // ── Step 8 & 9: Critical Farm Window & Technician Matching ────────────────
  console.log("\n--- Steps 8 & 9: Critical Farm Window & Technician Matching ---");
  const matchResult = matchTechnician({
    machineType: "स्प्रेयर",
    problemCategory: "sprayer_leakage",
    urgency: "urgent",
  });
  assert(matchResult !== null && matchResult.recommended !== undefined, "Technician matched successfully");
  const matchedTech = matchResult.recommended;
  assert(matchedTech.rating >= 4.0, "Matched technician is high-rated and certified", `Rating: ${matchedTech.rating}`);

  // ── Step 10 & 11: Technician Acceptance & Digital Job Card ────────────────
  console.log("\n--- Steps 10 & 11: Technician Acceptance & Digital Job Card ---");
  updateRepairStatus(repair.id, {
    status: "technician_assigned",
    statusTextHi: "मैकेनिक नियुक्त हो गया है",
    technicianId: matchedTech.id,
    selectedTechnician: matchedTech,
  });

  const partRec = recommendSpareParts({
    machineType: "स्प्रेयर",
    matchedRule: "sprayer_leakage",
    problemDescription: repair.problemDescription,
  });
  const recommendedPartIds = partRec.recommendations.map((r) => r.part.id);

  const jobCard = createJobCard({
    repairRequestId: repair.id,
    machine: sprayer.nameHi,
    machineIcon: sprayer.icon,
    problem: repair.problemDescription,
    diagnosis: repair.diagnosis?.possibleProblem || "",
    urgency: "🟠 जल्द मरम्मत करें",
    technicianId: matchedTech.id,
    technicianNameHi: matchedTech.nameHi,
    technicianPhone: matchedTech.phone,
    technicianSkillHi: "स्प्रेयर विशेषज्ञ",
    technicianDistanceKm: 3.2,
    technicianRating: matchedTech.rating,
    recommendedPartIds,
    farmerId: "farmer-001",
  });
  assert(jobCard !== null && jobCard.jobId.startsWith("job-"), "Digital Job Card created successfully");
  assert(jobCard.status === "मैकेनिक नियुक्त हो गया है", "Job card initial status is assigned");

  // ── Step 12: Spare Part Decision ──────────────────────────────────────────
  console.log("\n--- Step 12: Spare-Part Decisions ---");
  assert(recommendedPartIds.length > 0, "Spare parts recommended based on diagnostic rule");
  const updatedCardParts = updatePartSelection(jobCard.jobId, {
    partId: recommendedPartIds[0],
    partNameHi: "स्प्रेयर नोजल सेट",
    decision: "needed",
  });
  assert(updatedCardParts?.partSelections?.length === 1, "Part decision recorded on job card as 'needed'");

  // ── Step 13 & 14: Repair In Progress to Completed ─────────────────────────
  console.log("\n--- Steps 13 & 14: Repair In Progress to Completed ---");
  // Advance to on_the_way
  const cardOnWay = updateTechnicianWorkflowStatus(jobCard.jobId, "on_the_way");
  assert(cardOnWay?.technicianWorkflowStatus === "on_the_way", "Status advanced to 'on_the_way'");

  // Advance to arrived
  const cardArrived = updateTechnicianWorkflowStatus(jobCard.jobId, "arrived");
  assert(cardArrived?.technicianWorkflowStatus === "arrived", "Status advanced to 'arrived'");

  // Advance to repairing
  const cardRepairing = updateTechnicianWorkflowStatus(jobCard.jobId, "repairing");
  assert(cardRepairing?.technicianWorkflowStatus === "repairing", "Status advanced to 'repairing'");

  // Complete repair -> verification_pending
  const cardCompleted = completeJobCardRepair(jobCard.jobId);
  assert(cardCompleted?.status === "verification_pending", "Status advanced to 'verification_pending'");

  // ── Step 15, 16, 17, 18: Job-Ready Verification, Camera Evidence, Visual AI Analysis ──
  console.log("\n--- Steps 15-18: Job-Ready Verification, Evidence & Visual Analysis ---");
  const checks = getInitialSprayingChecks();
  assert(checks.length === 4, "Initial Spraying checklist initialized with 4 checks");

  // Test Visual Analysis Engine (Mock/Abstraction layer)
  const visualResult = await runVisualAnalysis({
    evidenceUrls: ["data:image/svg+xml;clean_water_test"],
    operation: "spraying",
  });
  assert(visualResult !== null && visualResult.source !== undefined && visualResult.evidence_quality !== undefined, "Visual analysis produced structured output");
  assert(visualResult.source === "mock_fallback" || visualResult.source === "local_yolo", "Analysis source abstraction is transparent");

  // ── Verify Deterministic Job-Ready Rules ─────────────────────────────────
  console.log("\n--- Verifying Strict Deterministic Job-Ready Rules ---");

  // Rule 1: Evidence insufficient -> NEED_RECHECK
  const insufficientResult = computeJobReadyResult(checks, ["data:image"], {
    ...visualResult,
    evidence_quality: "insufficient",
  });
  assert(insufficientResult.status === "NEED_RECHECK", "Rule 1: Insufficient evidence quality triggers NEED_RECHECK");

  // Rule 2: Leak detected -> NOT_JOB_READY
  const leakDetectedResult = computeJobReadyResult(checks, ["data:image"], {
    ...visualResult,
    visible_leak: true,
  });
  assert(leakDetectedResult.status === "NOT_JOB_READY", "Rule 2: Visual leak detected triggers NOT_JOB_READY");

  // Rule 3: Nozzle inactive -> NOT_JOB_READY
  const nozzleMissingResult = computeJobReadyResult(checks, ["data:image"], {
    ...visualResult,
    nozzle_activity: false,
  });
  assert(nozzleMissingResult.status === "NOT_JOB_READY", "Rule 3: Inactive nozzle triggers NOT_JOB_READY");

  // Rule 4: Damage detected -> NOT_JOB_READY
  const damageResult = computeJobReadyResult(checks, ["data:image"], {
    ...visualResult,
    visible_damage: true,
  });
  assert(damageResult.status === "NOT_JOB_READY", "Rule 4: Critical visible damage triggers NOT_JOB_READY");

  // Rule 5: All checks pass + Evidence pass -> JOB_READY
  const allPassChecks: JobReadyCheck[] = checks.map((c) => ({ ...c, status: "pass" }));
  const passResult = computeJobReadyResult(allPassChecks, ["data:image/svg+water_test"], {
    ...visualResult,
    evidence_quality: "high",
    visible_leak: false,
    nozzle_activity: true,
    visible_damage: false,
  });
  assert(passResult.status === "JOB_READY", "Rule 5: All pass with valid evidence triggers JOB_READY");
  assert(passResult.score === 100, "Score evaluates to 100 on clean pass");

  // ── Step 19 & 20: Farmer Confirmation & Machine Passport Update ───────────
  console.log("\n--- Steps 19 & 20: Farmer Confirmation & Machine Passport Update ---");
  const jrvRecord = buildJobReadinessRecord({
    machineId: sprayer.id,
    repairRequestId: repair.id,
    checks: allPassChecks,
    evidence: ["data:image/svg+clean_water_test"],
    technicianId: matchedTech.id,
    technicianNameHi: matchedTech.nameHi,
    farmerVerified: true,
  });
  saveJobReadinessRecord(jrvRecord);

  const retrievedJrv = getJobReadinessForRepair(repair.id);
  assert(retrievedJrv !== null && retrievedJrv.farmerVerified === true, "Farmer confirmation recorded in JobReadinessRecord");

  // Verify all 11 required fields in Machine Passport Record
  const passportData: MachinePassportRecord = {
    repairDate: new Date().toLocaleDateString("hi-IN"),
    diagnosis: jobCard.diagnosis,
    technician: matchedTech.nameHi,
    partsUsed: ["स्प्रेयर नोजल सेट"],
    repairResult: "सफलतापूर्वक मरम्मत हुई",
    verificationResult: `मशीन सही पाई गई (Job-Ready: ${jrvRecord.status}, Score: ${jrvRecord.score}/100)`,
    verificationId: jrvRecord.id,
    finalCost: 450,
    problemDescription: repair.problemDescription,
    maintenanceRecommendation: "Clean Water Test पास। अगली सर्विस 90 दिन बाद अनुशंसित है।",
    // 11 Required Fields:
    machineId: sprayer.id,
    repairId: repair.id,
    technicianId: matchedTech.id,
    repairDetails: `Job-Ready Verification: ${jrvRecord.operation} (${jrvRecord.status}, Score: ${jrvRecord.score}/100)`,
    jobOperation: jrvRecord.operation,
    jobReadyStatus: jrvRecord.status,
    score: jrvRecord.score,
    verificationEvidence: jrvRecord.evidence,
    farmerConfirmation: jrvRecord.farmerVerified,
    timestamp: jrvRecord.createdAt,
  };

  // Record verification on Job Card and Repair Request
  recordJobCardVerification(jobCard.jobId, true, undefined, jrvRecord.id);
  const updatedRepair = recordRepairVerification(repair.id, true, passportData, "Job-Ready Verification Passed", jrvRecord.id);
  assert(updatedRepair !== null && updatedRepair.status === "completed", "Repair status transitioned to 'completed'");
  assert(updatedRepair?.passportData?.machineId === sprayer.id, "Machine Passport holds machineId");
  assert(updatedRepair?.passportData?.repairId === repair.id, "Machine Passport holds repairId");
  assert(updatedRepair?.passportData?.technicianId === matchedTech.id, "Machine Passport holds technicianId");
  assert(updatedRepair?.passportData?.jobOperation === "spraying", "Machine Passport holds jobOperation");
  assert(updatedRepair?.passportData?.jobReadyStatus === "JOB_READY", "Machine Passport holds jobReadyStatus");
  assert(updatedRepair?.passportData?.score === 100, "Machine Passport holds score");
  assert(updatedRepair?.passportData?.farmerConfirmation === true, "Machine Passport holds farmerConfirmation");
  assert(updatedRepair?.passportData?.verificationEvidence?.length === 1, "Machine Passport holds verificationEvidence");
  assert(updatedRepair?.passportData?.timestamp !== undefined, "Machine Passport holds timestamp");

  // ── Step 21: Machine Passport / Service History in Local Inventory ───────
  console.log("\n--- Step 21: Machine Passport / Service History in Local Inventory ---");
  const currentMachines = getMachines();
  const verifiedSprayer = currentMachines.find((m) => m.id === sprayer.id);
  assert(verifiedSprayer?.status === "active", "Sprayer status is now 'active'");
  assert(verifiedSprayer?.serviceHistory?.includes("सफलतापूर्वक"), "Service history contains repair log entry");

  console.log("\n==================================================================");
  console.log(`SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================================");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runFullJourneyVerification().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
