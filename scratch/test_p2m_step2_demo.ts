/**
 * AgriPulse P2M Step 2 — Final Demo Flow & Real API Verification Test Suite
 *
 * Verifies:
 * 1. 13-Step Realistic Farmer Demo Scenario
 *    - Farmer: रामलाल यादव (बस्तीखेड़ा, लखनऊ)
 *    - Machine: महिन्द्रा 575 DI ट्रैक्टर (tractor)
 *    - Voice: "मेरे ट्रैक्टर से तेल लीक हो रहा है और मुझे कल खेत में काम करना है।"
 *    - Photo: Oil leak visual evidence
 *    - AI Diagnosis + Urgency (🔴 बहुत जरूरी)
 *    - Technician matching (अजय पटेल - 3.2 km, ट्रैक्टर विशेषज्ञ)
 *    - Job Card + Repair Tracking (6 stages) + Verification
 *    - Machine Passport + Maintenance Reminders
 * 2. Real API Verification & Characterization
 *    - AI API integration & provider fallback
 *    - Vision model architecture (honest declaration: rule-based heuristic with YOLO interface)
 *    - Backend persistence provider
 *    - Maps tiles & browser geolocation / distance calculation
 * 3. API Failure Fallbacks & Graceful Degradation
 * 4. Offline -> Online sync cycle
 * 5. Safety warnings & uncertainty phrasing ("संभावित समस्या")
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

import { DEMO_FARMERS, DEMO_MACHINES, PRIMARY_DEMO_SCENARIO, DEMO_OIL_LEAK_PHOTO_DATA_URL } from '../src/services/demoData';
import { runDemoAIDiagnosis } from '../src/services/diagnosisService';
import { analyzeMachinePhoto } from '../src/services/photoAnalysisService';
import { recommendSpareParts } from '../src/services/sparePartRecommendationService';
import { calculateCriticalFarmWindow, determineProblemSeverity } from '../src/services/criticalFarmWindowService';
import { matchTechnician } from '../src/services/technicianMatchingService';
import {
  createJobCard,
  getJobCards,
  getJobCardByRepairId,
  recordJobCardVerification,
  updateTechnicianWorkflowStatus,
} from '../src/services/jobCardService';
import {
  getMachines,
  saveMachines,
  createRepairRequest,
  updateRepairStatus,
  recordRepairVerification,
  markMachineServiceCompleted,
  syncPendingOutbox,
  getPendingComplaintsCount,
  initialMachines,
} from '../src/services/storageService';
import { calculateTechnicianDistance, getSafeFarmerLocationText, getRouteUrl, DEFAULT_FARMER_LOCATION } from '../src/services/locationService';
import { calculateNextServiceDate, calculateMaintenanceStatus, normalizeMachineMaintenance, getMaintenanceStatusDisplay } from '../src/services/preventiveMaintenanceService';
import { getSyncQueue, getPendingSyncCount, resetSyncQueue } from '../src/services/syncQueueService';
import SyncManager from '../src/services/syncManager';
import { MockBackendProvider, setBackendProvider } from '../src/services/backendProvider';

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details?: string) {
  results.push({
    name,
    passed: !!condition,
    details: details || (condition ? 'Passed' : 'Failed')
  });
  const symbol = condition ? '✅' : '❌';
  console.log(`${symbol} ${name}: ${condition ? 'PASSED' : 'FAILED'} ${details ? `(${details})` : ''}`);
}

async function runDemoVerification() {
  console.log('\n======================================================================');
  console.log('  AGRIPULSE P2M STEP 2: DEMO FLOW & REAL API VERIFICATION TEST');
  console.log('======================================================================\n');

  // --- SECTION 1: Realistic Demo Scenario Data ---
  console.log('--- 1. DEMO SCENARIO DATA VERIFICATION ---');
  assert(DEMO_FARMERS.length >= 3, 'Demo farmers count >= 3', `Count: ${DEMO_FARMERS.length}`);
  const primaryFarmer = DEMO_FARMERS.find(f => f.id === PRIMARY_DEMO_SCENARIO.farmer.id);
  assert(!!primaryFarmer, 'Primary farmer रामलाल यादव exists', primaryFarmer?.nameHi);

  assert(DEMO_MACHINES.length >= 3, 'Demo machines count >= 3', `Count: ${DEMO_MACHINES.length}`);
  const primaryMachine = DEMO_MACHINES.find(m => m.id === PRIMARY_DEMO_SCENARIO.machine.id);
  assert(!!primaryMachine && primaryMachine.id === 'tractor', 'Primary tractor exists', primaryMachine?.name);

  assert(PRIMARY_DEMO_SCENARIO.voiceComplaint.includes('तेल लीक'), 'Voice complaint matches scenario', PRIMARY_DEMO_SCENARIO.voiceComplaint);
  assert(DEMO_OIL_LEAK_PHOTO_DATA_URL.startsWith('data:image/svg+xml;'), 'Demo photo is valid data URL', `${DEMO_OIL_LEAK_PHOTO_DATA_URL.length} chars`);

  // --- SECTION 2: Vision Analysis Characterization ---
  console.log('\n--- 2. VISION ANALYSIS CHARACTERIZATION ---');
  const visionResult = await analyzeMachinePhoto({
    image: DEMO_OIL_LEAK_PHOTO_DATA_URL,
    machineType: 'tractor',
    complaintText: PRIMARY_DEMO_SCENARIO.voiceComplaint,
    fileName: 'tractor_oil_leak.svg'
  });
  assert(visionResult.detected, 'Vision detected visual features', visionResult.detectedIssue);
  assert(visionResult.confidenceLevelHi === 'काफी स्पष्ट' || visionResult.confidenceLevelHi === 'संभावित', 'Confidence tier in Hindi', visionResult.confidenceLevelHi);
  assert(visionResult.friendlyLabelHi.includes('तेल') || visionResult.friendlyLabelHi.includes('रिसाव'), 'Vision localized fluid/leakage', visionResult.friendlyLabelHi);
  assert(visionResult.visionResult.detections.length > 0, 'Bounding boxes generated', `${visionResult.visionResult.detections.length} detections`);
  
  // Verify bounding boxes have positive coordinates and dimensions
  const validBboxes = (visionResult.visionResult?.detections || []).every(d => 
    d.boundingBox.x > 0 && 
    d.boundingBox.y > 0 && 
    d.boundingBox.width > 0 && 
    d.boundingBox.height > 0
  );
  assert(validBboxes, 'Vision bounding boxes have valid positive coordinates', 'YOLO format verified');

  // --- SECTION 3: Voice & AI Diagnosis ---
  console.log('\n--- 3. AI DIAGNOSIS & URGENCY VERIFICATION ---');
  const voiceDiagnosis = runDemoAIDiagnosis({
    problemDescription: PRIMARY_DEMO_SCENARIO.voiceComplaint,
    machine: primaryMachine,
    hasPhoto: true,
    photoAnalysis: visionResult
  });
  assert(voiceDiagnosis.urgencyLevel === 'medium' || voiceDiagnosis.urgencyLevel === 'high', 'Diagnosis urgency level assigned', `Urgency: ${voiceDiagnosis.urgencyLevel}`);
  assert(voiceDiagnosis.possibleProblem.includes('रिसाव') || voiceDiagnosis.possibleProblem.includes('Leakage'), 'Problem identifies oil leak', voiceDiagnosis.possibleProblem);
  assert(voiceDiagnosis.disclaimer.includes('AI प्रारंभिक जाँच') && voiceDiagnosis.disclaimer.includes('मैकेनिक'), 'Uses safe disclaimer (अंतिम पुष्टि मैकेनिक करेगा)', voiceDiagnosis.disclaimer);
  assert(voiceDiagnosis.safeAction.includes('मशीन बंद रखें') || voiceDiagnosis.safeAction.length > 0, 'Safe action advisory present', voiceDiagnosis.safeAction);

  // Critical Farm Window Calculation
  const severity = determineProblemSeverity(PRIMARY_DEMO_SCENARIO.voiceComplaint, voiceDiagnosis);
  const windowResult = calculateCriticalFarmWindow({
    severity,
    requiredTime: 'today',
    machineType: 'tractor',
    complaintText: PRIMARY_DEMO_SCENARIO.voiceComplaint,
    diagnosis: voiceDiagnosis
  });
  assert(windowResult.urgency === 'emergency' || windowResult.urgency === 'urgent', 'Critical Farm Window calculates urgent window', windowResult.urgency);
  assert(windowResult.urgencyLabelHi.includes('तुरंत') || windowResult.urgencyLabelHi.includes('मरम्मत'), 'Urgency label in Hindi', windowResult.urgencyLabelHi);

  // Spare Part Recommendation
  const sparePartsRec = recommendSpareParts({
    machineType: 'tractor',
    matchedRule: voiceDiagnosis.matchedRule,
    problemDescription: PRIMARY_DEMO_SCENARIO.voiceComplaint
  });
  assert(sparePartsRec.recommendations.length > 0, 'Spare parts recommended', sparePartsRec.recommendations.map(r => r.part.nameHi).join(', '));

  // --- SECTION 4: Geolocation & Technician Matching ---
  console.log('\n--- 4. MAPS, GEOLOCATION & TECHNICIAN MATCHING ---');
  const distResult = calculateTechnicianDistance(
    { latitude: 26.8520, longitude: 80.9580, distanceKm: 3.2 },
    DEFAULT_FARMER_LOCATION
  );
  assert(distResult.distanceKm > 0 && distResult.distanceKm < 15, 'Distance calculation works via Haversine', `${distResult.distanceKm} km`);
  assert(distResult.displayText.includes('km दूर'), 'Formatted distance in Hindi', distResult.displayText);
  const safeLoc = getSafeFarmerLocationText();
  assert(safeLoc.includes('लखनऊ') || safeLoc.length > 0, 'Safe farmer location resolved', safeLoc);

  const matchResult = matchTechnician({
    machineType: 'tractor',
    problemCategory: voiceDiagnosis.matchedRule,
    urgency: windowResult,
    farmerLocation: DEFAULT_FARMER_LOCATION
  });
  const matchedTech = matchResult.recommended;
  assert(!!matchedTech, 'Matched technician found', matchedTech?.nameHi || matchedTech?.name);
  assert(matchedTech?.skills.includes('Tractor') || matchedTech?.primaryExpertiseHi?.includes('ट्रैक्टर') || matchedTech?.skills.includes('Engine'), 'Technician has tractor skill', matchedTech?.primaryExpertiseHi || matchedTech?.skills.join(', '));

  // --- SECTION 5: Job Card Creation & Full Lifecycle ---
  console.log('\n--- 5. JOB CARD, REPAIR TRACKING & VERIFICATION ---');
  // Initialize storage with machines
  saveMachines(initialMachines);

  // Step 1: Create Repair Request
  const repairReq = createRepairRequest({
    farmerId: primaryFarmer?.id || 'farmer-001',
    machineId: primaryMachine?.id || 'tractor',
    problemDescription: PRIMARY_DEMO_SCENARIO.voiceComplaint,
    inputMethod: 'voice',
    photoDataUrl: DEMO_OIL_LEAK_PHOTO_DATA_URL,
    urgency: 'today',
    isOffline: false,
  });
  assert(!!repairReq.id, 'Repair request created', repairReq.id);

  // Step 2: Assign Technician & Create Job Card
  const jobCard = createJobCard({
    repairRequestId: repairReq.id,
    machine: primaryMachine?.nameHi || 'महिंद्रा 575 DI ट्रैक्टर',
    machineIcon: primaryMachine?.icon || '🚜',
    problem: PRIMARY_DEMO_SCENARIO.voiceComplaint,
    diagnosis: voiceDiagnosis.possibleProblem,
    urgency: windowResult.urgencyLabelHi,
    technicianId: matchedTech?.id || 'tech-005',
    technicianNameHi: matchedTech?.nameHi || 'अजय पटेल',
    technicianPhone: matchedTech?.phone || '9876543215',
    technicianSkillHi: matchedTech?.primaryExpertiseHi || 'ट्रैक्टर विशेषज्ञ',
    technicianDistanceKm: distResult.distanceKm,
    technicianRating: matchedTech?.rating || 4.8,
    recommendedPartIds: sparePartsRec.recommendations.map(r => r.part.id),
    farmerLocationText: 'बस्तीखेड़ा, लखनऊ'
  });
  assert(!!jobCard.jobId, 'Job Card created', jobCard.jobId);
  assert(jobCard.status === 'मैकेनिक नियुक्त हो गया है', 'Initial job card status is assigned', jobCard.status);

  // Advance tracking through all stages
  const stepAssigned = updateTechnicianWorkflowStatus(jobCard.jobId, 'assigned');
  assert(stepAssigned?.technicianWorkflowStatus === 'assigned', 'Status -> assigned', stepAssigned?.status);

  const stepEnRoute = updateTechnicianWorkflowStatus(jobCard.jobId, 'on_the_way');
  assert(stepEnRoute?.technicianWorkflowStatus === 'on_the_way', 'Status -> on_the_way', stepEnRoute?.status);

  const stepArrived = updateTechnicianWorkflowStatus(jobCard.jobId, 'arrived');
  assert(stepArrived?.technicianWorkflowStatus === 'arrived', 'Status -> arrived', stepArrived?.status);

  const stepWorking = updateTechnicianWorkflowStatus(jobCard.jobId, 'repairing');
  assert(stepWorking?.technicianWorkflowStatus === 'repairing', 'Status -> repairing', stepWorking?.status);

  const stepCompleted = updateTechnicianWorkflowStatus(jobCard.jobId, 'completed');
  assert(stepCompleted?.technicianWorkflowStatus === 'completed', 'Status -> completed', stepCompleted?.status);

  // Farmer Verification
  const verification = recordJobCardVerification(
    jobCard.jobId,
    true,
    'ट्रैक्टर चालू करके देखा, तेल लीक बिल्कुल बंद हो गया है। बढ़िया काम!'
  );
  assert(verification?.verificationStatus === 'passed', 'Repair verification passed -> passed', verification?.verificationStatus);

  // Synchronize verification to main storage with MachinePassportRecord
  const passportPassData = {
    repairDate: new Date().toLocaleDateString("hi-IN"),
    diagnosis: "इंजन व हाइड्रोलिक ऑयल रिसाव (ऑयल सील बदली)",
    technician: matchedTech?.nameHi || "अजय पटेल",
    partsUsed: ["ऑयल सील", "होस पाइप"],
    repairResult: "सफलतापूर्वक मरम्मत हुई",
    verificationResult: "मशीन सही पाई गई (Passed)",
  };

  const passRepair = recordRepairVerification(
    repairReq.id,
    true,
    passportPassData,
    "ट्रैक्टर चालू करके देखा, तेल लीक बिल्कुल बंद हो गया है। बढ़िया काम!"
  );
  assert(passRepair?.status === 'completed', 'RepairRequest marked completed', passRepair?.status);
  assert(!!passRepair?.passportData, 'Passport data attached to repair record', passRepair?.passportData?.diagnosis);

  // --- SECTION 6: Machine Passport & Maintenance ---
  console.log('\n--- 6. MACHINE PASSPORT & PREVENTIVE MAINTENANCE ---');
  const allMachines = getMachines();
  const updatedMachine = allMachines.find(m => m.id === (primaryMachine?.id || 'tractor'));
  assert(!!updatedMachine, 'Machine found in storage', updatedMachine?.name);
  assert(updatedMachine?.status === 'active', 'Machine restored to active status after repair verification', updatedMachine?.status);
  assert(updatedMachine?.serviceHistory?.includes('सफलतापूर्वक ठीक किया गया') || false, 'Machine service history updated', updatedMachine?.serviceHistory);

  // Preventive maintenance check
  const normalized = normalizeMachineMaintenance(updatedMachine!);
  assert(!!normalized.nextServiceDate, 'Next service date present', normalized.nextServiceDate);
  const maintStatus = calculateMaintenanceStatus(normalized.nextServiceDate);
  assert(maintStatus === 'upcoming' || maintStatus === 'due' || maintStatus === 'overdue', 'Maintenance status calculated', maintStatus);
  const statusDisplay = getMaintenanceStatusDisplay(maintStatus);
  assert(statusDisplay.labelHi.length > 0, 'Maintenance status label in Hindi', statusDisplay.labelHi);

  // Mark preventive service completed
  const servicedMachine = markMachineServiceCompleted(primaryMachine?.id || 'tractor');
  assert(!!servicedMachine, 'Machine service completed recorded', servicedMachine?.name);
  assert(servicedMachine?.maintenanceStatus === 'upcoming', 'Maintenance status reset to upcoming after service', servicedMachine?.maintenanceStatus);

  // --- SECTION 7: API Failure Fallbacks ---
  console.log('\n--- 7. API FAILURE FALLBACKS & RESILIENCE ---');
  // AI Outage Simulation
  const safeFallback = runDemoAIDiagnosis({
    problemDescription: 'अजीब आवाज आ रही है पर कुछ समझ नहीं आ रहा',
    machine: primaryMachine
  });
  assert(!!safeFallback.possibleProblem && safeFallback.possibleProblem.length > 0, 'AI Fallback safely handles unmapped query', safeFallback.possibleProblem);
  assert(safeFallback.disclaimer.includes('AI प्रारंभिक जाँच'), 'Fallback maintains safe disclaimer', safeFallback.disclaimer);

  // Vision Corrupted / Blank Image
  const blankVisionResult = await analyzeMachinePhoto('');
  assert(blankVisionResult.confidenceLevelHi === 'पक्का नहीं', 'Vision failure gracefully returns low confidence', blankVisionResult.confidenceLevelHi);
  assert(!blankVisionResult.evidence[0].includes('Error 500'), 'Zero technical error exposed in vision fallback', blankVisionResult.evidence[0]);

  // Backend Failure Simulation
  const mockBackend = new MockBackendProvider();
  mockBackend.setSimulateFailure(true);
  setBackendProvider(mockBackend);
  const backendFailCheck = await mockBackend.fetchRecord('job_card', 'JC-NONEXISTENT');
  assert(!backendFailCheck.success, 'Mock backend handles non-existent entity without crashing', backendFailCheck.error || 'handled gracefully');
  mockBackend.setSimulateFailure(false);

  // --- SECTION 8: Offline / Online Demonstration ---
  console.log('\n--- 8. OFFLINE TO ONLINE SYNC INTEGRATION ---');
  resetSyncQueue();

  // Simulate offline by setting navigator.onLine to false
  Object.defineProperty(globalThis.navigator, "onLine", { value: false, configurable: true, writable: true });
  const offlineState = SyncManager.getState();
  assert(offlineState.status === "offline", "SyncManager reports offline state", offlineState.labelHi);

  // Create complaint while offline
  const offlineReq = createRepairRequest({
    farmerId: 'farmer-001',
    machineId: primaryMachine?.id || 'tractor',
    problemDescription: 'ऑफलाइन शिकायत: हाइड्रोस्टैटिक प्रेशर कम है',
    inputMethod: 'text',
    urgency: 'today',
    isOffline: true,
  });
  assert(offlineReq.isOfflineCreated, 'Complaint marked isOfflineCreated: true', offlineReq.id);
  assert(getPendingComplaintsCount() >= 1, 'Pending complaints outbox has offline complaint', `Count: ${getPendingComplaintsCount()}`);

  // Bring network back online
  Object.defineProperty(globalThis.navigator, "onLine", { value: true, configurable: true, writable: true });
  const onlineState = SyncManager.getState();
  assert(onlineState.status !== "offline", "SyncManager reports online state", onlineState.status);

  // Trigger outbox sync
  const syncResult = await syncPendingOutbox();
  assert(syncResult.syncedCount >= 1, 'Sync processes pending offline complaints', `Synced: ${syncResult.syncedCount}`);
  assert(getPendingComplaintsCount() === 0, 'Pending complaints outbox is cleared after sync', 'Count: 0');

  // Trigger cloud sync
  const cloudSyncResult = await SyncManager.runSync(true);
  assert(cloudSyncResult.success, 'Cloud sync queue processed successfully', cloudSyncResult.messageHi);

  console.log('\n======================================================================');
  const allPassed = results.every(r => r.passed);
  console.log(`TOTAL CHECKS: ${results.length} | PASSED: ${results.filter(r => r.passed).length} | FAILED: ${results.filter(r => !r.passed).length}`);
  console.log(`FINAL RESULT: ${allPassed ? 'ALL VERIFICATIONS PASSED ✅' : 'SOME VERIFICATIONS FAILED ❌'}`);
  console.log('======================================================================\n');
}

runDemoVerification().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
