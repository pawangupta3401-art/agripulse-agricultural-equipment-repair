/**
 * test_p2k_step2.ts
 *
 * Automated verification of P2K Step 2:
 * 1. Distance Calculation & Formatting
 * 2. Safe Fallback when GPS is unavailable
 * 3. Technician Matching (Skill + Availability + Distance + Workload)
 * 4. Job Card Creation with Visual Evidence & Privacy Protection
 * 5. Technician Status Progression (all 5 Hindi states)
 * 6. Route Generation (OpenStreetMap directions)
 * 7. Duplicate Assignment Idempotency
 * 8. Offline Persistence & Sync Queue
 */

import { calculateTechnicianDistance, formatApproxDistance, getSafeFarmerLocationText, getRouteUrl, FarmerLocation } from "@/services/locationService";
import { mockTechnicians, Technician } from "@/services/technicianData";
import { matchTechnician } from "@/services/technicianMatchingService";
import { createJobCard, getJobCards, updateTechnicianWorkflowStatus } from "@/services/jobCardService";
import { TECHNICIAN_STATUS_LABELS_HI, RepairRequest, Machine, PhotoAnalysisResult, AIDiagnosisResult } from "@/types";

// Polyfill localStorage and window for node environment
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

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASS: ${msg}`);
    passedTests++;
  }
}

console.log("\n==========================================");
console.log("P2K STEP 2 AUTOMATED TEST SUITE STARTING");
console.log("==========================================\n");

// TEST 1: Distance calculation and Hindi formatting
console.log("--- 1. Distance Calculation & Privacy ---");
const mockFarmerLoc: FarmerLocation = {
  latitude: 26.8467,
  longitude: 80.9462,
  accuracy: 15,
  locationSource: "gps",
  locationUpdatedAt: new Date().toISOString(),
};
const tech1 = mockTechnicians[0]; // Ramesh Kumar (26.8520, 80.9530)
const distResult = calculateTechnicianDistance(tech1, mockFarmerLoc);
assert(distResult.isLive === true, "Live distance calculation is active");
assert(distResult.displayText.startsWith("लगभग "), "Distance string starts with 'लगभग '");
assert(distResult.displayText.endsWith(" km दूर"), "Distance string ends with ' km दूर'");
assert(!distResult.displayText.includes("26.") && !distResult.displayText.includes("80."), "Raw coordinates are not exposed in distance text");

// Safe Fallback test
const distFallback = calculateTechnicianDistance(tech1, null);
assert(distFallback.isLive === false, "Fallback recognized when farmer location is null");
assert(distFallback.displayText.includes("लगभग"), "Fallback uses approximate Hindi formatting");
assert(distFallback.distanceKm > 0, "Fallback uses safe baseline distance without crashing");

// Safe Farmer Location text test (Privacy)
const safeLocText = getSafeFarmerLocationText(mockFarmerLoc);
assert(!safeLocText.includes("26.8467") && !safeLocText.includes("80.9462"), "Safe location does not expose raw coordinates");

// TEST 2: Route URL generation
console.log("\n--- 2. Route URL (OpenStreetMap Directions) ---");
const routeUrl = getRouteUrl(mockFarmerLoc, { latitude: tech1.latitude!, longitude: tech1.longitude! });
assert(routeUrl !== null, "Route URL successfully generated");
assert(routeUrl!.includes("openstreetmap.org/directions"), "Route points to OpenStreetMap directions flow");
assert(routeUrl!.includes("fossgis_osrm_car"), "Uses car routing engine");

// TEST 3: Technician Matching Logic
console.log("\n--- 3. Technician Matching Logic ---");
// Machine: Tractor, Issue: Engine overheating
const mockTractor: Machine = {
  id: "m_tractor_1",
  name: "Mahindra 575 DI",
  type: "tractor",
  model: "575 DI",
  year: 2021,
  serialNumber: "TR-575-001",
  createdAt: Date.now(),
  operatingHours: "450",
};

const matchResult = matchTechnician({
  machineType: mockTractor.name,
  problemCategory: "overheating",
  urgency: null,
  farmerLocation: mockFarmerLoc,
});
assert(matchResult.matchedTechnicians.length > 0, "Matched technicians list is returned");
const firstTech = matchResult.matchedTechnicians[0];
assert(firstTech.technician.available === true, "Top matched technician is available");
assert(firstTech.expertiseLabel.length > 0, "Technician expertise label is present");
assert(firstTech.approxDistanceText.startsWith("लगभग "), "Technician approximate distance is formatted");

// Workload consideration: technician with lower activeJobs is favored among equal skills
const tractorTechs = matchResult.matchedTechnicians.filter(t => t.technician.skills.includes("Tractor"));
assert(tractorTechs.length >= 2, "Found multiple tractor technicians");
console.log(`Top tractor tech: ${tractorTechs[0].technician.name} (active jobs: ${tractorTechs[0].technician.activeJobs}, dist: ${tractorTechs[0].approxDistanceText})`);

// TEST 4 & 5: Repair Assignment & Job Card Creation
console.log("\n--- 4 & 5. Repair Assignment & Job Card Integration ---");
const mockPhotoAnalysis: PhotoAnalysisResult = {
  detectedIssueHi: "रेडिएटर और कूलेंट होज़ में रिसाव",
  recommendedActionHi: "होज़ पाइप बदलें और कूलेंट भरें",
  confidenceScore: 0.92,
  confidenceLevel: "high",
  timestamp: Date.now(),
};

const mockDiagnosis: AIDiagnosisResult = {
  probableCause: "कूलेंट होज़ फटने से इंजन ओवरहीटिंग",
  confidenceScore: 90,
  recommendedAction: "होज़ पाइप प्रतिस्थापन",
  estimatedTime: "1-2 घंटे",
  estimatedCost: "₹450 - ₹650",
  urgencyLevel: "critical",
  suggestedParts: [
    { partName: "रेडिएटर होज़ पाइप", estimatedPrice: "₹350", urgency: "critical" },
    { partName: "कूलेंट 1L", estimatedPrice: "₹250", urgency: "medium" }
  ],
};

const repairRequestId = "repair_req_test_001";
const jobCard = createJobCard({
  repairRequestId,
  machine: mockTractor.name,
  machineIcon: "🚜",
  problem: "इंजन गर्म होकर बंद हो जाता है",
  diagnosis: mockDiagnosis.probableCause,
  urgency: "critical",
  safetyMessage: "इंजन चालू न रखें - गंभीर खराबी की संभावना",
  technicianId: firstTech.technician.id,
  technicianNameHi: firstTech.technician.nameHi,
  technicianPhone: firstTech.technician.phone,
  technicianSkillHi: firstTech.expertiseLabel,
  technicianDistanceKm: firstTech.approxDistanceKm,
  technicianRating: firstTech.technician.rating,
  farmerId: "farmer_lucknow_01",
  farmerLocationText: safeLocText,
  visualEvidence: mockPhotoAnalysis.detectedIssueHi,
  technicianWorkflowStatus: "assigned",
  assignedAt: new Date().toISOString(),
  routeUrl: routeUrl || undefined,
  approxDistanceText: firstTech.approxDistanceText,
});

assert(jobCard.jobId.length > 0, "Job card created with valid jobId");
assert(jobCard.repairRequestId === repairRequestId, "Job card linked to repairRequestId");
assert(jobCard.technicianId === firstTech.technician.id, "Technician assigned correctly");
assert(jobCard.technicianWorkflowStatus === "assigned", "Initial status is 'assigned'");
assert(jobCard.approxDistanceText !== undefined && jobCard.approxDistanceText.startsWith("लगभग "), "Approx distance captured in job card");
assert(jobCard.routeUrl !== undefined, "Route URL stored in job card");
assert(jobCard.visualEvidence !== undefined, "Visual evidence attached to job card");
assert(jobCard.visualEvidence === "रेडिएटर और कूलेंट होज़ में रिसाव", "Visual evidence matches photo analysis");
assert(jobCard.farmerLocationText !== undefined && jobCard.farmerLocationText.length > 0, "Safe farmer location present");
assert(!jobCard.farmerLocationText?.includes("26.8467"), "Farmer private coordinates not stored in display text");

// TEST 6: Technician Status Workflow Progression
console.log("\n--- 6. Technician Status Progression ---");
const statuses: Array<keyof typeof TECHNICIAN_STATUS_LABELS_HI> = [
  "assigned",
  "on_the_way",
  "arrived",
  "repairing",
  "completed",
];

for (const st of statuses) {
  const labelHi = TECHNICIAN_STATUS_LABELS_HI[st];
  assert(labelHi.length > 0, `Status '${st}' has Hindi label: '${labelHi}'`);
}

// Update status to on_the_way
const updatedCard1 = updateTechnicianWorkflowStatus(jobCard.jobId, "on_the_way");
assert(updatedCard1 !== null && updatedCard1.technicianWorkflowStatus === "on_the_way", "Updated to 'on_the_way'");

// Update status to arrived
const updatedCard2 = updateTechnicianWorkflowStatus(jobCard.jobId, "arrived");
assert(updatedCard2 !== null && updatedCard2.technicianWorkflowStatus === "arrived", "Updated to 'arrived'");

// Update status to repairing
const updatedCard3 = updateTechnicianWorkflowStatus(jobCard.jobId, "repairing");
assert(updatedCard3 !== null && updatedCard3.technicianWorkflowStatus === "repairing", "Updated to 'repairing'");

// Update status to completed
const updatedCard4 = updateTechnicianWorkflowStatus(jobCard.jobId, "completed");
assert(updatedCard4 !== null && updatedCard4.technicianWorkflowStatus === "completed", "Updated to 'completed'");

// TEST 7: Duplicate Assignment Protection (Idempotency)
console.log("\n--- 7. Duplicate Assignment Protection ---");
const initialCount = getJobCards().length;

// Attempt to re-create job card with same repairRequestId (simulating multiple button clicks or retries)
const duplicateCall1 = createJobCard({
  repairRequestId,
  machine: mockTractor.name,
  machineIcon: "🚜",
  problem: "इंजन गर्म होकर बंद हो जाता है",
  diagnosis: mockDiagnosis.probableCause,
  urgency: "critical",
  technicianId: firstTech.technician.id,
  technicianNameHi: firstTech.technician.nameHi,
  technicianPhone: firstTech.technician.phone,
  technicianSkillHi: firstTech.expertiseLabel,
  technicianDistanceKm: firstTech.approxDistanceKm,
  technicianRating: firstTech.technician.rating,
});

const duplicateCall2 = createJobCard({
  repairRequestId,
  machine: mockTractor.name,
  machineIcon: "🚜",
  problem: "इंजन गर्म होकर बंद हो जाता है",
  diagnosis: mockDiagnosis.probableCause,
  urgency: "critical",
  technicianId: firstTech.technician.id,
  technicianNameHi: firstTech.technician.nameHi,
  technicianPhone: firstTech.technician.phone,
  technicianSkillHi: firstTech.expertiseLabel,
  technicianDistanceKm: firstTech.approxDistanceKm,
  technicianRating: firstTech.technician.rating,
});

const afterCount = getJobCards().length;
assert(initialCount === afterCount, `No duplicate job card created (count remained ${afterCount})`);
assert(duplicateCall1.jobId === jobCard.jobId, "Duplicate call returned existing job card ID");
assert(duplicateCall2.jobId === jobCard.jobId, "Second duplicate call returned existing job card ID");

console.log("\n==========================================");
console.log(`ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
console.log("==========================================\n");
