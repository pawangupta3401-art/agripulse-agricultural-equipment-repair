/**
 * test_job_readiness_flow.ts
 *
 * Automated verification of the JOB-READY VERIFICATION feature:
 * 1. Spraying checks validation
 * 2. Deterministic rule engine evaluation:
 *    - All Pass + Evidence -> JOB_READY (100)
 *    - Safety Check Fail -> STOP_AND_TECHNICIAN (0)
 *    - Leakage / Nozzle Fail -> NOT_JOB_READY (20 / 30)
 *    - Missing Evidence -> NEED_RECHECK (50)
 *    - Incomplete / Pending Checks -> NEED_RECHECK (40)
 * 3. Record generation with technician and farmer confirmation
 * 4. Machine Passport & storage integration
 */

// Mock localStorage for Node.js environment
const memoryStore: Record<string, string> = {};
(globalThis as any).window = {
  localStorage: {
    getItem: (key: string) => memoryStore[key] || null,
    setItem: (key: string, val: string) => { memoryStore[key] = val; },
    removeItem: (key: string) => { delete memoryStore[key]; },
    clear: () => { Object.keys(memoryStore).forEach(k => delete memoryStore[k]); },
  },
};
(globalThis as any).localStorage = (globalThis as any).window.localStorage;

import {
  getInitialSprayingChecks,
  computeJobReadyResult,
  buildJobReadinessRecord,
  saveJobReadinessRecord,
  getJobReadinessForRepair,
  getJobReadinessRecords,
} from "../services/jobReadinessService";
import { JobReadyCheck } from "../types";

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

async function runTests() {
  console.log("==================================================");
  console.log("TESTING JOB-READY VERIFICATION FEATURE");
  console.log("==================================================\n");

  // 1. Initial Spraying Checks
  console.log("--- 1. Testing Initial Spraying Checks ---");
  const checks = getInitialSprayingChecks();
  assert(checks.length === 4, "Returns 4 standard checks for Spraying operation", `Count: ${checks.length}`);

  const requiredIds = [
    "no_leak",
    "all_nozzles_active",
    "spray_pattern_normal",
    "safety_check",
  ];
  const allFound = requiredIds.every((reqId) => checks.some((c) => c.id === reqId));
  assert(allFound, "All mandatory spraying checks are present");

  const safetyCheck = checks.find((c) => c.id === "safety_check");
  assert(safetyCheck?.isTechnicianVerified === true, "Technician-verified safety check is flagged");

  // 2. All Checks Pass + Evidence -> JOB_READY
  console.log("\n--- 2. Testing All Pass Result (JOB_READY) ---");
  const allPassedChecks: JobReadyCheck[] = checks.map((c) => ({
    ...c,
    status: "pass" as const,
  }));
  const mockEvidence = ["data:image/png;base64,mockSprayTestPhoto"];
  const passResult = computeJobReadyResult(allPassedChecks, mockEvidence);
  assert(passResult.status === "JOB_READY", "Status is JOB_READY when all pass with evidence", `Status: ${passResult.status}`);
  assert(passResult.score === 100, "Score is 100 when all pass", `Score: ${passResult.score}`);
  assert(passResult.reason.includes("मशीन Job-Ready है"), "Reason confirms machine is ready");

  // 3. Rule Priority: Safety Failure -> STOP_AND_TECHNICIAN
  console.log("\n--- 3. Testing Safety Failure (STOP_AND_TECHNICIAN) ---");
  const safetyFailChecks: JobReadyCheck[] = checks.map((c) => {
    if (c.id === "safety_check") {
      return { ...c, status: "fail" as const };
    }
    return { ...c, status: "pass" as const };
  });
  const stopResult = computeJobReadyResult(safetyFailChecks, mockEvidence);
  assert(
    stopResult.status === "STOP_AND_TECHNICIAN",
    "Safety check fail immediately triggers STOP_AND_TECHNICIAN",
    `Status: ${stopResult.status}`
  );
  assert(stopResult.score === 0, "Score is 0 for safety stop", `Score: ${stopResult.score}`);

  // 4. Leakage Failure -> NOT_JOB_READY
  console.log("\n--- 4. Testing Leakage Failure (NOT_JOB_READY) ---");
  const leakFailChecks: JobReadyCheck[] = checks.map((c) => {
    if (c.id === "no_leak") {
      return { ...c, status: "fail" as const };
    }
    return { ...c, status: "pass" as const };
  });
  const leakResult = computeJobReadyResult(leakFailChecks, mockEvidence);
  assert(
    leakResult.status === "NOT_JOB_READY",
    "Leakage triggers NOT_JOB_READY",
    `Status: ${leakResult.status}`
  );
  assert(leakResult.score === 20, "Score reflects leak penalty", `Score: ${leakResult.score}`);

  // 5. Missing Evidence -> NEED_RECHECK
  console.log("\n--- 5. Testing Missing Evidence (NEED_RECHECK) ---");
  const noEvidenceResult = computeJobReadyResult(allPassedChecks, []);
  assert(
    noEvidenceResult.status === "NEED_RECHECK",
    "Missing Clean Water Test photo/video triggers NEED_RECHECK",
    `Status: ${noEvidenceResult.status}`
  );

  // 6. Record Construction & Farmer Confirmation
  console.log("\n--- 6. Testing Record Construction ---");
  const record = buildJobReadinessRecord({
    repairRequestId: "rep-sp-889",
    machineId: "sprayer-1",
    technicianNameHi: "राजेश वर्मा (प्रमाणित मैकेनिक)",
    technicianId: "tech-1",
    checks: allPassedChecks,
    evidence: mockEvidence,
    farmerVerified: true,
  });

  assert(record.id.startsWith("jrv-"), "Record generates valid ID prefix");
  assert(record.status === "JOB_READY", "Record preserves computed status");
  assert(record.farmerVerified === true, "Farmer verification is recorded");
  assert(record.evidence.length === 1, "Evidence attachments are captured");
  assert(record.operation === "spraying", "Operation is spraying");

  // 7. Storage & Retrieval
  console.log("\n--- 7. Testing Storage & Retrieval ---");
  saveJobReadinessRecord(record);
  const retrieved = getJobReadinessForRepair("rep-sp-889");
  assert(retrieved !== null && retrieved.id === record.id, "Saved record retrieved by repair ID");
  assert(retrieved?.score === 100, "Retrieved record matches score");
  assert(retrieved?.farmerVerified === true, "Retrieved record has farmerVerified=true");

  const allRecords = getJobReadinessRecords();
  assert(allRecords.length >= 1, "getJobReadinessRecords lists saved record");

  console.log("\n==================================================");
  console.log(`SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
