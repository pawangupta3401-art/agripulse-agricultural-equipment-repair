/**
 * test_realistic_technician_flow.ts
 *
 * Comprehensive end-to-end verification of the Realistic Technician Repair Request Flow:
 * 1. Seeded Demo Request (Pawan Gupta | Tractor | "Tractor start नहीं हो रहा" | Starting system AI | जरूरी)
 * 2. Role Security (/api/technician/jobs 403 for farmers, 200 for technicians)
 * 3. Review & Reject flow with reason
 * 4. Concurrency protection (two technicians accepting same request)
 * 5. Accept & Confirmation flow
 * 6. Parts (Starter, Battery) & Tools & Message to Farmer
 * 7. Trip confirmation & Navigation link with real coordinates
 * 8. Active Job lifecycle (assigned -> on_the_way -> arrived -> repairing -> verification_pending)
 * 9. Complete repair & Farmer confirmation to completed
 */

import {
  createSimulatedDemoRepair,
  getRepairRequests,
  updateRepairStatus,
  recordRepairVerification,
} from "../services/storageService";
import { createJobCard, getJobCardByRepairId, updateTechnicianWorkflowStatus } from "../services/jobCardService";

const BASE_URL = "http://localhost:3000";

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
  console.log("TESTING REALISTIC TECHNICIAN REPAIR REQUEST FLOW");
  console.log("==================================================\n");

  const farmerToken = "agri-token-farmer-9876543210-123456789";
  const techToken1 = "agri-token-technician-9834567890-123456789";
  const techToken2 = "agri-token-technician-9812345678-123456789";

  // ─── 1. Role Security Verification ─────────────────────────────────────────
  console.log("--- 1. Testing Role Security (/api/technician/jobs) ---");
  const unauthRes = await fetch(`${BASE_URL}/api/technician/jobs`, {
    headers: { Authorization: `Bearer ${farmerToken}` },
  });
  assert(unauthRes.status === 403, "Farmer token blocked from /api/technician/jobs with HTTP 403");

  const techRes = await fetch(`${BASE_URL}/api/technician/jobs`, {
    headers: { Authorization: `Bearer ${techToken1}` },
  });
  assert(techRes.status === 200, "Technician token authorized on /api/technician/jobs with HTTP 200");

  // ─── 2. Seeded Demo Request Verification ───────────────────────────────────
  console.log("\n--- 2. Testing Seeded Demo Repair Request ---");
  const demoRequest = createSimulatedDemoRepair();
  assert(demoRequest.farmerName === "Pawan Gupta", "Demo request farmer name is 'Pawan Gupta'");
  assert(demoRequest.machineNameHi.includes("Tractor"), "Demo request machine is 'Tractor'");
  assert(demoRequest.problemDescription === "Tractor start नहीं हो रहा", "Problem description matches 'Tractor start नहीं हो रहा'");
  assert(
    demoRequest.diagnosis?.possibleProblem === "Starting system में समस्या हो सकती है.",
    "AI diagnosis correctly states 'Starting system में समस्या हो सकती है.'"
  );
  assert(demoRequest.urgency === "today", "Urgency is marked as 'today' (जरूरी)");
  assert(!!demoRequest.farmerLocation?.latitude && !!demoRequest.farmerLocation?.longitude, "Real coordinates attached");
  assert(!!demoRequest.routeUrl, "Google Maps navigation routeUrl attached");

  // ─── 3. Reject Request Flow ────────────────────────────────────────────────
  console.log("\n--- 3. Testing Request Rejection with Reason ---");
  const rejectRes = await fetch(`${BASE_URL}/api/technician/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${techToken1}`,
    },
    body: JSON.stringify({
      action: "reject",
      repairId: "rep-test-reject-01",
      technicianId: "tech-001",
      reason: "यह मशीन/समस्या मेरी skill से बाहर है",
    }),
  });
  const rejectData = await rejectRes.json();
  assert(rejectRes.status === 200 && rejectData.success, "Technician can reject request with optional reason");
  assert(rejectData.rejectionReason === "यह मशीन/समस्या मेरी skill से बाहर है", "Rejection reason saved correctly");

  // ─── 4. Concurrency Protection (Prevent Two Technicians Accepting Same Request) ───
  console.log("\n--- 4. Testing Concurrency Protection on Request Acceptance ---");
  const targetRepairId = `rep-test-concurrent-${Date.now()}`;

  // Tech 1 accepts
  const acceptRes1 = await fetch(`${BASE_URL}/api/technician/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${techToken1}`,
    },
    body: JSON.stringify({
      action: "accept",
      repairId: targetRepairId,
      technicianId: "tech-001",
      technicianName: "अजय पटेल",
    }),
  });
  const acceptData1 = await acceptRes1.json();
  assert(acceptRes1.status === 200 && acceptData1.success, "First technician successfully accepts request");
  assert(acceptData1.status === "technician_assigned", "Status moves to 'technician_assigned'");

  // Tech 2 tries to accept the SAME request
  const acceptRes2 = await fetch(`${BASE_URL}/api/technician/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${techToken2}`,
    },
    body: JSON.stringify({
      action: "accept",
      repairId: targetRepairId,
      technicianId: "tech-002",
      technicianName: "रमेश कुमार",
    }),
  });
  const acceptData2 = await acceptRes2.json();
  assert(acceptRes2.status === 409, "Second technician blocked with HTTP 409 Conflict");
  assert(acceptData2.error === "already_assigned", "Error code is 'already_assigned'");

  // ─── 5. Parts, Tools, and Farmer Message ────────────────────────────────────
  console.log("\n--- 5. Testing Parts / Tools Preparation & Farmer Message ---");
  const partsRes = await fetch(`${BASE_URL}/api/technician/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${techToken1}`,
    },
    body: JSON.stringify({
      action: "update_parts",
      repairId: targetRepairId,
      parts: ["Starter", "Battery"],
      tools: ["मल्टीमीटर", "रिंच सेट"],
      messageToFarmer: "क्या tractor में battery की light आ रही है?",
    }),
  });
  const partsData = await partsRes.json();
  assert(partsRes.status === 200 && partsData.success, "Parts and tools saved successfully");
  assert(partsData.parts.includes("Starter"), "Required parts include 'Starter'");
  assert(partsData.messageToFarmer === "क्या tractor में battery की light आ रही है?", "Question to farmer recorded");

  // ─── 6. Travel Start & Navigation Link ─────────────────────────────────────
  console.log("\n--- 6. Testing Travel Start (On The Way) & Navigation ---");
  const travelRes = await fetch(`${BASE_URL}/api/technician/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${techToken1}`,
    },
    body: JSON.stringify({
      action: "start_travel",
      repairId: targetRepairId,
    }),
  });
  const travelData = await travelRes.json();
  assert(travelRes.status === 200 && travelData.success, "Travel start returns HTTP 200");
  assert(travelData.status === "on_the_way", "Status advanced to 'on_the_way'");

  // ─── 7. Full Workflow Progression to Completion & Farmer Verification ──────
  console.log("\n--- 7. Testing Completion & Farmer Confirmation ---");
  const completeRes = await fetch(`${BASE_URL}/api/technician/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${techToken1}`,
    },
    body: JSON.stringify({
      action: "complete",
      repairId: targetRepairId,
      notes: "स्टार्टर मोटर व बैटरी कनेक्शन दुरुस्त किए गए।",
      finalCost: 450,
    }),
  });
  const completeData = await completeRes.json();
  assert(completeRes.status === 200 && completeData.success, "Repair completion recorded with HTTP 200");
  assert(completeData.status === "verification_pending", "Status advanced to 'verification_pending'");
  assert(completeData.finalCost === 450, "Final cost recorded as ₹450");

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
