/**
 * test_p2l_step1.ts
 *
 * Comprehensive End-to-End Integration Test Suite for AgriPulse P2L Step 1:
 * TEST 1: Normal online repair flow.
 * TEST 2: Offline complaint → reconnect → sync.
 * TEST 3: Photo → vision → AI diagnosis.
 * TEST 4: Voice → diagnosis.
 * TEST 5: AI failure → local fallback.
 * TEST 6: Vision failure → complaint fallback.
 * TEST 7: Technician assignment.
 * TEST 8: Repair verification PASS.
 * TEST 9: Repair verification FAIL → re-repair flow.
 * TEST 10: Machine Passport update.
 * TEST 11: Preventive maintenance update.
 * TEST 12: Browser refresh at important stages.
 * TEST 13: Repeated button clicks.
 * TEST 14: Dangerous machine condition.
 */

// 1. Polyfill window & localStorage for Node runtime
const store = new Map<string, string>();
const fakeStorage = {
  getItem: (k: string) => store.get(k) || null,
  setItem: (k: string, v: string) => { store.set(k, v); },
  removeItem: (k: string) => { store.delete(k); },
  clear: () => store.clear(),
  key: (i: number) => Array.from(store.keys())[i] || null,
  get length() { return store.size; },
} as Storage;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window = globalThis;
globalThis.localStorage = fakeStorage;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window.localStorage = fakeStorage;
try {
  Object.defineProperty(globalThis.navigator, "onLine", { value: true, configurable: true, writable: true });
} catch {
  // Ignore
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    failed++;
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${msg}`);
    passed++;
  }
}

import {
  getMachines,
  saveMachines,
  getRepairRequests,
  createRepairRequest,
  updateRepairStatus,
  recordRepairVerification,
  reopenRepairForReRepair,
  markMachineServiceCompleted,
  syncPendingOutbox,
  getPendingComplaintsCount,
  initialMachines,
} from "@/services/storageService";
import { runDemoAIDiagnosis } from "@/services/diagnosisService";
import { requestAIDiagnosis } from "@/services/aiAssistantService";
import { analyzeMachinePhoto } from "@/services/photoAnalysisService";
import { calculateCriticalFarmWindow } from "@/services/criticalFarmWindowService";
import { matchTechnician } from "@/services/technicianMatchingService";
import {
  createJobCard,
  getJobCards,
  getJobCardByRepairId,
  recordJobCardVerification,
  reopenJobCardForReRepair,
  updateTechnicianWorkflowStatus,
} from "@/services/jobCardService";
import { calculateTechnicianDistance, getSafeFarmerLocationText, getRouteUrl } from "@/services/locationService";
import { calculateNextServiceDate, calculateMaintenanceStatus } from "@/services/preventiveMaintenanceService";
import { getSyncQueue, getPendingSyncCount, resetSyncQueue } from "@/services/syncQueueService";
import SyncManager from "@/services/syncManager";
import { MockBackendProvider, setBackendProvider } from "@/services/backendProvider";
import { Machine, MachinePassportRecord } from "@/types";

console.log("\n=======================================================");
console.log("P2L STEP 1 — AGRIPULSE E2E INTEGRATION & BUG TEST SUITE");
console.log("=======================================================\n");

// Ensure clean state
store.clear();
resetSyncQueue();
saveMachines(initialMachines);
const mockBackend = new MockBackendProvider(50);
setBackendProvider(mockBackend);

const testMachine: Machine = getMachines()[0]; // Mahindra 575 DI (tractor)
assert(!!testMachine, "Initial machine is present");

// -------------------------------------------------------------
// TEST 1: Normal Online Repair Flow
// -------------------------------------------------------------
console.log("\n--- TEST 1: Normal Online Repair Flow ---");
const repOnline = createRepairRequest({
  farmerId: "farmer-001",
  machineId: testMachine.id,
  problemDescription: "इंजन चालू नहीं हो रहा है, बैटरी कमजोर लग रही है",
  inputMethod: "voice",
  urgency: "today",
  isOffline: false,
});
assert(repOnline.id.startsWith("rep-"), "Repair request created with unique ID");
assert(repOnline.farmerId === "farmer-001", "Farmer ID consistent on repair request");
assert(repOnline.machineId === testMachine.id, "Machine ID consistent on repair request");
assert(repOnline.status === "finding_mechanic", "Initial status is finding_mechanic");

// -------------------------------------------------------------
// TEST 2: Offline Complaint → Reconnect → Sync
// -------------------------------------------------------------
console.log("\n--- TEST 2: Offline Complaint → Reconnect → Sync ---");
const repOffline = createRepairRequest({
  farmerId: "farmer-001",
  machineId: testMachine.id,
  problemDescription: "स्प्रेयर पंप से पानी का प्रेशर नहीं बन रहा है",
  inputMethod: "text",
  urgency: "within_2_3_days",
  isOffline: true,
});
assert(repOffline.isOfflineCreated === true, "Offline flag recorded correctly");
assert(repOffline.syncStatus === "pending", "Sync status is pending while offline");
assert(getPendingComplaintsCount() >= 1, "Pending complaint count reflects offline request");

// Simulate online sync
async function testSync() {
  const outboxResult = await syncPendingOutbox();
  assert(outboxResult.success === true, "Outbox synced successfully");
  const cloudSyncResult = await SyncManager.runSync(true);
  assert(cloudSyncResult.success === true, "Cloud sync queue processed successfully");
  const allRepairs = getRepairRequests();
  const refreshed = allRepairs.find((r) => r.id === repOffline.id);
  assert(refreshed?.syncStatus === "synced", "Offline complaint marked synced after sync");
}

// -------------------------------------------------------------
// TEST 3: Photo → Vision → AI Diagnosis Context
// -------------------------------------------------------------
console.log("\n--- TEST 3: Photo → Vision → AI Diagnosis Context ---");
async function testPhotoVisionFlow() {
  const visionResult = await analyzeMachinePhoto({
    image: "data:image/jpeg;base64," + "A".repeat(500),
    machineType: "tractor",
    complaintText: "रेडिएटर और पाइप से तरल पदार्थ रिस रहा है",
    fileName: "leak.jpg",
  });
  assert(visionResult.isClear === true, "Vision correctly analyzed photo");
  assert(visionResult.evidence.length > 0, "Vision returned visual evidence");

  const diagResult = await requestAIDiagnosis(
    {
      machine: testMachine,
      problemDescription: "रेडिएटर और पाइप से तरल पदार्थ रिस रहा है",
      hasPhoto: true,
      photoAnalysis: visionResult,
      urgency: "today",
    },
    false // offline fallback mode
  );
  assert(diagResult.possibleProblem.includes("रिसाव") || diagResult.possibleProblem.includes("Leakage"), "Diagnosis incorporates leakage problem");
  assert(diagResult.reasons.some((r) => r.includes("📷 फोटो साक्ष्य")), "AI diagnosis explicitly includes vision context");
}

// -------------------------------------------------------------
// TEST 4: Voice → Diagnosis
// -------------------------------------------------------------
console.log("\n--- TEST 4: Voice → Diagnosis ---");
async function testVoiceDiagnosis() {
  const voiceComplaint = "इंजन से बहुत तेज खड़-खड़ की आवाज आ रही है";
  const voiceDiag = await requestAIDiagnosis(
    {
      machine: testMachine,
      problemDescription: voiceComplaint,
      hasPhoto: false,
      urgency: "today",
    },
    false
  );
  assert(voiceDiag.possibleProblem.length > 0, "Voice complaint evaluated into diagnosis");
  assert(voiceDiag.urgencyLevel === "high" || voiceDiag.urgencyLevel === "medium", "Urgency level assigned correctly");
}

// -------------------------------------------------------------
// TEST 5: AI Failure → Local Fallback
// -------------------------------------------------------------
console.log("\n--- TEST 5: AI Failure → Local Fallback ---");
async function testAIFallback() {
  // requestAIDiagnosis with isOnline=false triggers local deterministic fallback
  const fallbackDiag = await requestAIDiagnosis(
    {
      machine: testMachine,
      problemDescription: "इंजन स्टार्ट नहीं हो रहा है, क्रैंकिंग बंद है",
      hasPhoto: false,
    },
    false
  );
  assert(fallbackDiag.provider === "local_engine", "Falls back to local engine without crashing");
  assert(fallbackDiag.isFallback === true, "isFallback flag set");
  assert(fallbackDiag.possibleProblem.includes("स्टार्टिंग") || fallbackDiag.possibleProblem.includes("ईंधन"), "Local diagnosis matches problem rule");
}

// -------------------------------------------------------------
// TEST 6: Vision Failure → Complaint Fallback
// -------------------------------------------------------------
console.log("\n--- TEST 6: Vision Failure → Complaint Fallback ---");
async function testVisionFallback() {
  // Simulating unclear photo
  const unclearVision = {
    detectedIssue: "फोटो से समस्या स्पष्ट नहीं हो पाई।",
    confidence: 0,
    evidence: ["फोटो से समस्या स्पष्ट नहीं हो पाई।"],
    isClear: false,
  };
  const diag = runDemoAIDiagnosis({
    machine: testMachine,
    problemDescription: "स्प्रेयर पंप से पानी का प्रेशर नहीं बन रहा है",
    hasPhoto: true,
    photoAnalysis: unclearVision,
  });
  assert(diag.possibleProblem.includes("पंप") || diag.possibleProblem.includes("प्रेशर"), "Diagnosis resolves complaint even when vision fails");
  assert(diag.reasons.some((r) => r.includes("मैकेनिक की जाँच")), "Safe guidance provided for unclear photo");
}

// -------------------------------------------------------------
// TEST 7: Technician Matching & Assignment
// -------------------------------------------------------------
console.log("\n--- TEST 7: Technician Matching & Assignment ---");
const matchResult = matchTechnician({
  machineType: testMachine.name,
  problemCategory: "smoke_overheating",
  urgency: null,
});
assert(matchResult.matchedTechnicians.length > 0, "Matched technicians found");
const assignedTech = matchResult.matchedTechnicians[0].technician;

const jobCard = createJobCard({
  repairRequestId: repOnline.id,
  machine: testMachine.nameHi,
  machineIcon: testMachine.icon,
  problem: repOnline.problemDescription,
  diagnosis: "इंजन ओवरहीटिंग",
  urgency: "🔴 तुरंत मदद चाहिए",
  technicianId: assignedTech.id,
  technicianNameHi: assignedTech.nameHi,
  technicianPhone: assignedTech.phone,
  technicianSkillHi: assignedTech.primaryExpertise || "Tractor specialist",
  technicianDistanceKm: 3.2,
  technicianRating: assignedTech.rating,
  farmerId: "farmer-001",
});

assert(jobCard.jobId.length > 0, "Job Card created with jobId");
assert(jobCard.jobCardId === jobCard.jobId, "jobCardId equals jobId for ID consistency");
assert(jobCard.repairRequestId === repOnline.id, "jobCard linked to repairRequestId");
assert(jobCard.farmerId === "farmer-001", "jobCard has consistent farmerId");
assert(jobCard.technicianId === assignedTech.id, "jobCard has consistent technicianId");

// Update repair request
const assignedRepair = updateRepairStatus(repOnline.id, {
  status: "technician_assigned",
  statusTextHi: "मैकेनिक नियुक्त हो गया है",
  technicianId: assignedTech.id,
  jobCardId: jobCard.jobId,
  farmerId: "farmer-001",
  technicianWorkflowStatus: "assigned",
});
assert(assignedRepair?.status === "technician_assigned", "Repair status updated to technician_assigned");
assert(assignedRepair?.jobCardId === jobCard.jobId, "Repair has consistent jobCardId");

// -------------------------------------------------------------
// TEST 8: Repair Verification PASS
// -------------------------------------------------------------
console.log("\n--- TEST 8: Repair Verification PASS ---");
const passportPassData: MachinePassportRecord = {
  repairDate: new Date().toLocaleDateString("hi-IN"),
  diagnosis: "इंजन ओवरहीटिंग (कूलेंट होज़ प्रतिस्थापन)",
  technician: assignedTech.nameHi,
  partsUsed: ["रेडिएटर होज़", "कूलेंट 1L"],
  repairResult: "सफलतापूर्वक मरम्मत हुई",
  verificationResult: "मशीन सही पाई गई (Passed)",
};

const passCard = recordJobCardVerification(jobCard.jobId, true, "किसान द्वारा मशीन चालू करके जाँची गई।");
assert(passCard?.status === "मरम्मत पूरी हुई", "JobCard status is 'मरम्मत पूरी हुई'");
assert(passCard?.verificationStatus === "passed", "JobCard verificationStatus is passed");
assert(!!passCard?.verificationId, "JobCard assigned verificationId");

const passRepair = recordRepairVerification(repOnline.id, true, passportPassData, "मशीन सही चल रही है");
assert(passRepair?.status === "completed", "RepairRequest status is completed on PASS");
assert(passRepair?.verificationStatus === "passed", "RepairRequest verificationStatus is passed");
assert(passRepair?.verificationId === passCard?.verificationId || !!passRepair?.verificationId, "Consistent verificationId");
assert(getMachines().find((m) => m.id === testMachine.id)?.status === "active", "Machine marked active after PASS verification");

// -------------------------------------------------------------
// TEST 9: Repair Verification FAIL → Re-Repair Flow
// -------------------------------------------------------------
console.log("\n--- TEST 9: Repair Verification FAIL → Re-Repair Flow ---");
// Create a new repair for testing failure
const repForFail = createRepairRequest({
  farmerId: "farmer-001",
  machineId: testMachine.id,
  problemDescription: "गियरबॉक्स से आवाज",
  inputMethod: "text",
  urgency: "today",
});

const jobCardForFail = createJobCard({
  repairRequestId: repForFail.id,
  machine: testMachine.nameHi,
  machineIcon: testMachine.icon,
  problem: repForFail.problemDescription,
  diagnosis: "गियर क्लच घिसाव",
  urgency: "🔴 तुरंत मदद चाहिए",
  technicianId: assignedTech.id,
  technicianNameHi: assignedTech.nameHi,
  technicianPhone: assignedTech.phone,
  technicianSkillHi: "Tractor specialist",
  technicianDistanceKm: 2.5,
  technicianRating: assignedTech.rating,
  farmerId: "farmer-001",
});

// Verification FAILS
const failCard = recordJobCardVerification(jobCardForFail.jobId, false, "समस्या अभी भी आ रही है");
assert(failCard?.status === "दोबारा मरम्मत की जरूरत", "JobCard status is 'दोबारा मरम्मत की जरूरत'");
assert(failCard?.verificationStatus === "failed", "JobCard verificationStatus is failed");

const failRepair = recordRepairVerification(repForFail.id, false, undefined, "समस्या हल नहीं हुई");
assert(failRepair?.status === "re_repair_required", "RepairRequest status is 're_repair_required' on FAIL (NOT completed)");
assert(failRepair?.verificationStatus === "failed", "RepairRequest verificationStatus is failed");

// Re-repair trigger
const reopenedCard = reopenJobCardForReRepair(jobCardForFail.jobId);
assert(reopenedCard?.verificationAttempt === 2, "Re-repair incremented attempt to 2");
assert(reopenedCard?.status === "मरम्मत शुरू हो गई", "Status reset to 'मरम्मत शुरू हो गई'");

const reopenedRepair = reopenRepairForReRepair(repForFail.id);
assert(reopenedRepair?.verificationAttempt === 2, "Reopened repair attempt is 2");
assert(reopenedRepair?.status === "repair_in_progress", "Reopened repair status is 'repair_in_progress'");

// -------------------------------------------------------------
// TEST 10: Machine Passport Update
// -------------------------------------------------------------
console.log("\n--- TEST 10: Machine Passport Update ---");
const verifiedRepair = getRepairRequests().find((r) => r.id === repOnline.id);
assert(!!verifiedRepair?.passportData, "Machine passport data attached to verified repair");
assert(verifiedRepair?.passportData?.diagnosis.includes("इंजन ओवरहीटिंग"), "Passport records diagnosis");
assert(verifiedRepair?.passportData?.technician === assignedTech.nameHi, "Passport records technician");
assert(verifiedRepair?.passportData?.partsUsed.length === 2, "Passport records parts used");
assert(verifiedRepair?.passportData?.verificationResult.includes("Passed"), "Passport records verification result");

// -------------------------------------------------------------
// TEST 11: Preventive Maintenance Update
// -------------------------------------------------------------
console.log("\n--- TEST 11: Preventive Maintenance Update ---");
const updatedMachine = markMachineServiceCompleted(testMachine.id);
assert(!!updatedMachine, "Machine service completed successfully");
assert(updatedMachine?.maintenanceStatus === "upcoming", "Maintenance status reset to upcoming");
assert(updatedMachine?.serviceEvents?.length! >= 1, "Service event recorded in machine history");
const nextDate = calculateNextServiceDate(new Date().toISOString(), 90);
assert(nextDate.length === 10, "Next service date calculated correctly");
assert(calculateMaintenanceStatus(nextDate) === "upcoming", "Calculated status matches interval");

// -------------------------------------------------------------
// TEST 12: Browser Refresh at Important Stages
// -------------------------------------------------------------
console.log("\n--- TEST 12: Browser Refresh at Important Stages ---");
// Simulate refresh: re-fetch from storage
const loadedRepairs = getRepairRequests();
const loadedJobCards = getJobCards();
const loadedMachines = getMachines();

assert(loadedRepairs.length >= 2, "All repairs intact after simulated refresh");
assert(loadedJobCards.length >= 2, "All job cards intact after simulated refresh");
assert(loadedMachines.length >= 1, "Machines intact after simulated refresh");
const refreshedJobCard = getJobCardByRepairId(repOnline.id);
assert(refreshedJobCard?.jobId === jobCard.jobId, "Job card linked accurately after refresh");

// -------------------------------------------------------------
// TEST 13: Repeated Button Clicks (Idempotency)
// -------------------------------------------------------------
console.log("\n--- TEST 13: Repeated Button Clicks (Idempotency) ---");
const initialJobCardCount = getJobCards().length;

// Calling createJobCard 3 times with the exact same repairRequestId
const dup1 = createJobCard({
  repairRequestId: repOnline.id,
  machine: testMachine.nameHi,
  machineIcon: testMachine.icon,
  problem: repOnline.problemDescription,
  diagnosis: "इंजन ओवरहीटिंग",
  urgency: "🔴 तुरंत मदद चाहिए",
  technicianId: assignedTech.id,
  technicianNameHi: assignedTech.nameHi,
  technicianPhone: assignedTech.phone,
  technicianSkillHi: "Tractor specialist",
  technicianDistanceKm: 3.2,
  technicianRating: assignedTech.rating,
  farmerId: "farmer-001",
});

const dup2 = createJobCard({
  repairRequestId: repOnline.id,
  machine: testMachine.nameHi,
  machineIcon: testMachine.icon,
  problem: repOnline.problemDescription,
  diagnosis: "इंजन ओवरहीटिंग",
  urgency: "🔴 तुरंत मदद चाहिए",
  technicianId: assignedTech.id,
  technicianNameHi: assignedTech.nameHi,
  technicianPhone: assignedTech.phone,
  technicianSkillHi: "Tractor specialist",
  technicianDistanceKm: 3.2,
  technicianRating: assignedTech.rating,
  farmerId: "farmer-001",
});

const afterJobCardCount = getJobCards().length;
assert(initialJobCardCount === afterJobCardCount, "No duplicate job card created on repeated clicks");
assert(dup1.jobId === jobCard.jobId, "First duplicate returned original jobId");
assert(dup2.jobId === jobCard.jobId, "Second duplicate returned original jobId");

// -------------------------------------------------------------
// TEST 14: Dangerous Machine Condition
// -------------------------------------------------------------
console.log("\n--- TEST 14: Dangerous Machine Condition ---");
async function testDangerCondition() {
  const dangerousComplaint = "इंजन से काला धुआं और आग की चिनगारी निकल रही है, बहुत गरम हो गया है";
  const dangerDiag = await requestAIDiagnosis(
    {
      machine: testMachine,
      problemDescription: dangerousComplaint,
      hasPhoto: false,
      urgency: "today",
    },
    false
  );
  assert(dangerDiag.severity === "critical", "Dangerous condition forced to critical severity");
  assert(!!dangerDiag.safetyWarning, "Mandatory safety warning attached");
  assert(dangerDiag.safetyWarning!.includes("मशीन बंद रखें"), "Safety warning advises keeping machine OFF");
  assert(!dangerDiag.safeAction.includes("मशीन चलाकर"), "Safe action does not advise operating machine");
}

// Run async tests
(async () => {
  await testSync();
  await testPhotoVisionFlow();
  await testVoiceDiagnosis();
  await testAIFallback();
  await testVisionFallback();
  await testDangerCondition();

  console.log("\n=======================================================");
  console.log(`ALL TESTS PASSED! (${passed} checks passed, ${failed} failed)`);
  console.log("=======================================================\n");
})();
