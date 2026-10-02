/**
 * AgriPulse — Backend Features Verification Test Suite
 *
 * Tests the 5 requested backend features:
 * 1. WhatsApp Support (Webhook, 1000 Q&A reuse, photo, voice, safety warnings, booking)
 * 2. Spare Parts Network (Suppliers, inventory, compatibility, diagnosis matching, nearby matching)
 * 3. Technician Training & Certification (Modules, enrollments, certification issuance, skill matching)
 * 4. Service Centre / FPO / Cooperative (FPO/Coop models, technician affiliations, equipment routing)
 * 5. Business & Revenue Logic (Multi-party split, real payment state machine, supplier settlements)
 */

import {
  processWhatsAppIncomingMessage,
  dispatchWhatsAppMessage,
  getOrCreateWhatsAppSession,
  buildWhatsAppTextMessage,
  buildWhatsAppInteractiveButtons,
} from "../services/whatsappService";
import {
  MASTER_SUPPLIERS,
  MASTER_STOCK_ITEMS,
  MASTER_COMPATIBILITY_RULES,
  identifyRequiredPartsFromDiagnosis,
  findNearbySuppliersWithParts,
  isPartCompatibleWithMachine,
  checkSupplierPartStock,
} from "../services/sparePartsNetworkService";
import {
  MASTER_TRAINING_MODULES,
  getTrainingModules,
  enrollTechnicianInModule,
  recordModuleCompletion,
  submitTechnicianCertification,
  updateCertificationVerificationStatus,
} from "../services/technicianTrainingService";
import {
  getServiceCentres,
  getServiceCentreById,
  associateTechnicianWithCentre,
  disassociateTechnicianFromCentre,
  getCentresByTechnicianId,
  getCentresByOperatingType,
  matchServiceCentres,
} from "../services/serviceCentreService";
import {
  calculateMultiPartyRevenueBreakdown,
  createPaymentTransaction,
  verifyAndCompletePayment,
  recordPaymentFailure,
  calculateSupplierSettlement,
  getEcosystemFinancialSummary,
} from "../services/billingAndRevenueService";
import { getTechnicians } from "../services/certificationService";
import { matchTechnician } from "../services/technicianMatchingService";
import { getRepairRequests } from "../services/storageService";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ PASS: ${msg}`);
}

async function runTestSuite() {
  console.log("================================================================================");
  console.log("🌾 AGRIPULSE — COMPREHENSIVE BACKEND FEATURES TEST SUITE");
  console.log("================================================================================\n");

  // ════════════════════════════════════════════════════════════════════════════
  // 1. WHATSAPP SUPPORT BACKEND TESTS
  // ════════════════════════════════════════════════════════════════════════════
  console.log("--- FEATURE 1: WHATSAPP SUPPORT BACKEND ---");

  // Test 1.1: Incoming greeting message returns welcome menu
  const session = getOrCreateWhatsAppSession("919876543210");
  assert(session.phoneNumber === "919876543210", "WhatsApp session initialized with normalized phone");

  const welcomeReply = await processWhatsAppIncomingMessage({
    from: "919876543210",
    id: "msg_test_01",
    timestamp: new Date().toISOString(),
    type: "text",
    text: { body: "नमस्ते" },
  });
  assert(welcomeReply.type === "interactive", "Greeting message returns interactive buttons");
  assert(
    welcomeReply.interactive?.body.text.includes("AgriPulse"),
    "Welcome message identifies as AgriPulse WhatsApp service"
  );

  // Test 1.2: Symptom query reuses 1000 Q&A Knowledge Base
  const symptomReply = await processWhatsAppIncomingMessage({
    from: "919876543210",
    id: "msg_test_02",
    timestamp: new Date().toISOString(),
    type: "text",
    text: { body: "ट्रैक्टर में चाबी घुमाने पर सिर्फ कट-कट की आवाज आती है और स्टार्ट नहीं होता" },
  });
  assert(symptomReply.type === "interactive", "Symptom query returns structured interactive reply");
  assert(
    symptomReply.interactive?.body.text.includes("बैटरी") || symptomReply.interactive?.body.text.includes("कट-कट"),
    "Knowledge Base correctly diagnoses starter clicking / battery issue from 1000 Q&A"
  );

  // Test 1.3: Dangerous condition detection enforces safety and emergency stop
  const dangerReply = await processWhatsAppIncomingMessage({
    from: "919876543210",
    id: "msg_test_03",
    timestamp: new Date().toISOString(),
    type: "text",
    text: { body: "इंजन से बहुत काला धुआं निकल रहा है और आग की चिंगारी दिख रही है" },
  });
  assert(
    dangerReply.interactive?.body.text.includes("सुरक्षा चेतावनी") || dangerReply.interactive?.body.text.includes("मशीन तुरंत बंद रखें"),
    "Dangerous symptoms trigger immediate stop-machine safety alert in WhatsApp"
  );

  // Test 1.4: Photo message analysis
  const photoReply = await processWhatsAppIncomingMessage({
    from: "919876543210",
    id: "msg_test_04",
    timestamp: new Date().toISOString(),
    type: "image",
    image: { id: "img_01", caption: "स्प्रेयर के नोजल में प्रेशर नहीं बन रहा" },
  });
  assert(photoReply.type === "interactive", "Photo message produces structured diagnostic guidance");
  assert(photoReply.interactive?.body.text.includes("फोटो विश्लेषण"), "Photo analysis response formatted for farmer");

  // Test 1.5: Voice note handling
  const voiceReply = await processWhatsAppIncomingMessage({
    from: "919876543210",
    id: "msg_test_05",
    timestamp: new Date().toISOString(),
    type: "audio",
    audio: { id: "aud_01", voice: true },
  });
  assert(voiceReply.type === "interactive", "Audio note processed into diagnostic steps");

  // Test 1.6: Interactive button reply to book mechanic creates RepairRequest with channel="WHATSAPP"
  const bookingReply = await processWhatsAppIncomingMessage({
    from: "919876543210",
    id: "msg_test_06",
    timestamp: new Date().toISOString(),
    type: "interactive",
    interactive: {
      type: "button_reply",
      button_reply: { id: "btn_book_mechanic", title: "मैकेनिक बुलाएं" },
    },
  });
  assert(bookingReply.interactive?.body.text.includes("मरम्मत अनुरोध दर्ज"), "Booking confirmation sent to farmer");
  const allRepairs = getRepairRequests();
  const whatsappRepair = allRepairs.find((r) => r.callerPhoneNumber === "919876543210");
  assert(whatsappRepair !== undefined, "Repair request created in backend from WhatsApp button");
  assert(whatsappRepair?.channel === "WHATSAPP", "Repair request tagged with channel='WHATSAPP'");

  // Test 1.7: Outbound message dispatch simulation / adapter
  const dispatchRes = await dispatchWhatsAppMessage(buildWhatsAppTextMessage("919876543210", "टेस्ट संदेश"));
  assert(dispatchRes.success === true, "Outbound message dispatcher handles communication gracefully");
  console.log("✓ Feature 1 (WhatsApp Support) passed all tests.\n");

  // ════════════════════════════════════════════════════════════════════════════
  // 2. SPARE PARTS NETWORK BACKEND TESTS
  // ════════════════════════════════════════════════════════════════════════════
  console.log("--- FEATURE 2: SPARE PARTS NETWORK ---");

  // Test 2.1: Master Suppliers Registry
  assert(MASTER_SUPPLIERS.length >= 4, `At least 4 suppliers registered, found ${MASTER_SUPPLIERS.length}`);
  const fpoDepot = MASTER_SUPPLIERS.find((s) => s.supplierType === "fpo_depot");
  assert(fpoDepot !== undefined, "FPO Parts Depot present in supplier network");

  // Test 2.2: Compatibility verification
  const isOilCompatible = isPartCompatibleWithMachine("part-001", "Tractor");
  assert(isOilCompatible === true, "Engine oil compatible with Tractor");
  const isSprayerNozzleOnTractor = isPartCompatibleWithMachine("part-007", "Tractor");
  assert(isSprayerNozzleOnTractor === false, "Sprayer nozzle correctly flagged incompatible with Tractor");

  // Test 2.3: Diagnosis text to required parts identification
  const identifiedParts = identifyRequiredPartsFromDiagnosis("इंजन बहुत गरम हो रहा है और काला धुआं निकल रहा है", "Tractor");
  assert(identifiedParts.length > 0, `Identified ${identifiedParts.length} parts from overheating diagnosis`);
  assert(identifiedParts.some((p) => p.part.id === "part-001"), "Engine oil identified for overheating");

  // Test 2.4: Nearby supplier matching with inventory & distance
  const farmerLoc = { lat: 21.1458, lng: 79.0882 }; // Nagpur coordinates
  const supplierMatches = findNearbySuppliersWithParts({
    partIds: ["part-001", "part-002"],
    location: farmerLoc,
    maxDistanceKm: 40,
  });
  assert(supplierMatches.length > 0, `Found ${supplierMatches.length} nearby suppliers for parts`);
  const nearest = supplierMatches[0];
  assert(nearest.distanceKm <= 5, `Nearest supplier is within 5km (got ${nearest.distanceKm} km)`);
  assert(nearest.partAvailability.length === 2, "Availability checked for all requested parts");

  // Test 2.5: Stock checking
  const stockCheck = checkSupplierPartStock("sup-001", "part-001", 5);
  assert(stockCheck.available === true, "Stock check confirms quantity available at supplier");
  console.log("✓ Feature 2 (Spare Parts Network) passed all tests.\n");

  // ════════════════════════════════════════════════════════════════════════════
  // 3. TECHNICIAN TRAINING & CERTIFICATION BACKEND TESTS
  // ════════════════════════════════════════════════════════════════════════════
  console.log("--- FEATURE 3: TECHNICIAN TRAINING & CERTIFICATION ---");

  // Test 3.1: Master training modules catalog
  const modules = getTrainingModules();
  assert(modules.length >= 5, `At least 5 training modules configured, found ${modules.length}`);
  const tractorModules = getTrainingModules("Tractor");
  assert(tractorModules.length >= 2, `Tractor has ${tractorModules.length} specialized modules`);

  // Test 3.2: Technician enrollment
  const tech = getTechnicians()[0];
  assert(tech !== undefined, "Technician found for training enrollment");
  const enrollment = enrollTechnicianInModule(tech.id, "mod-trac-01");
  assert(enrollment.status === "in_progress", "Technician enrolled with status 'in_progress'");

  // Test 3.3: Module examination completion and certification issuance
  const examResult = recordModuleCompletion(tech.id, "mod-trac-01", 85);
  assert(examResult.passed === true, "Technician passed exam with 85% score");
  assert(examResult.certification !== undefined, "Certificate awarded upon passing module");
  assert(
    examResult.certification?.verificationStatus === "verified",
    "Issued certification marked 'verified'"
  );

  // Test 3.4: External certification submission and admin verification update
  const submittedCert = submitTechnicianCertification(tech.id, {
    certificationName: "Government Vocational Diesel Mechanic Level 3",
    category: "Engine",
    issuingOrganization: "National Skill Development Corporation (NSDC)",
    issueDate: "2025-01-15",
  });
  assert(submittedCert.verificationStatus === "pending", "Submitted external certificate starts as 'pending'");

  const verifySuccess = updateCertificationVerificationStatus(tech.id, submittedCert.id, "verified");
  assert(verifySuccess === true, "Admin successfully verified submitted certificate");

  // Test 3.5: Technician matching utilizes skills and verified status
  const matchResult = matchTechnician({
    machineType: "ट्रैक्टर",
    problemCategory: "smoke_overheating",
    urgency: "urgent",
  });
  assert(matchResult.recommended !== null, "Technician matching found certified candidate");
  assert(matchResult.recommended?.available === true, "Recommended technician is currently available");
  console.log("✓ Feature 3 (Technician Training & Certification) passed all tests.\n");

  // ════════════════════════════════════════════════════════════════════════════
  // 4. SERVICE CENTRE / FPO / COOPERATIVE RELATIONSHIPS TESTS
  // ════════════════════════════════════════════════════════════════════════════
  console.log("--- FEATURE 4: SERVICE CENTRE / FPO / COOPERATIVE ---");

  // Test 4.1: Query Service Centres by Operating Type
  const fpoCentres = getCentresByOperatingType("FPO");
  assert(fpoCentres.length > 0, `Found ${fpoCentres.length} FPO service centres`);
  assert(fpoCentres[0].centreType === "FPO", "FPO centre type matches");

  const coopCentres = getCentresByOperatingType("Cooperative");
  assert(coopCentres.length > 0, `Found ${coopCentres.length} Cooperative service centres`);

  // Test 4.2: Associate Technician with FPO / Service Centre
  const targetCentre = fpoCentres[0];
  const assocSuccess = associateTechnicianWithCentre(targetCentre.id, tech.id, "affiliate");
  assert(assocSuccess === true, "Associated technician with FPO Service Centre");

  const affiliatedCentres = getCentresByTechnicianId(tech.id);
  assert(
    affiliatedCentres.some((c) => c.id === targetCentre.id),
    "Technician successfully listed under affiliated FPO Service Centre"
  );

  // Test 4.3: Disassociate technician
  const disassocSuccess = disassociateTechnicianFromCentre(targetCentre.id, tech.id);
  assert(disassocSuccess === true, "Disassociated technician from centre cleanly");

  // Test 4.4: Service Centre matching considering equipment, distance, and parts
  const centreMatch = matchServiceCentres({
    machineType: "Tractor",
    problemCategory: "Mechanical",
  });
  assert(centreMatch.recommended !== null, "Recommended open service centre found");
  assert(centreMatch.recommended?.operatingStatus === "Open", "Recommended centre is Open for business");
  console.log("✓ Feature 4 (Service Centre / FPO / Cooperative) passed all tests.\n");

  // ════════════════════════════════════════════════════════════════════════════
  // 5. BUSINESS & REVENUE LOGIC TESTS
  // ════════════════════════════════════════════════════════════════════════════
  console.log("--- FEATURE 5: BUSINESS & REVENUE LOGIC ---");

  // Test 5.1: Multi-party revenue split calculation
  const split = calculateMultiPartyRevenueBreakdown({
    diagnosticFee: 150,
    labourCharge: 350,
    partsCost: 700,
    travelCharge: 100,
    discountAmount: 50,
    isWorkshopService: false,
  });

  // Verify farmer payable = 150 + 350 + 700 + 100 - 50 = 1250
  assert(split.subtotal === 1300, `Subtotal is 1300 (got ${split.subtotal})`);
  assert(split.netFarmerPayable === 1250, `Net farmer payable is 1250 (got ${split.netFarmerPayable})`);

  // Technician receives 85% of 350 (298) + 100% of 100 (100) = 398
  assert(split.technicianLabourShare === Math.round(350 * 0.85), `Technician labour share is 85% (got ${split.technicianLabourShare})`);
  assert(split.technicianTravelShare === 100, `Technician travel share is 100% (got ${split.technicianTravelShare})`);
  assert(split.technicianTotalPayout === split.technicianLabourShare + 100, `Technician total payout is ${split.technicianTotalPayout}`);

  // Supplier receives 95% of parts = 665
  assert(split.supplierPartsShare === Math.round(700 * 0.95), `Supplier parts share is 95% (got ${split.supplierPartsShare})`);
  assert(split.supplierTotalPayout === 665, `Supplier total payout is 665 (got ${split.supplierTotalPayout})`);

  // Platform retains fees
  assert(split.platformTotalRevenue > 0, `Platform fee is positive (got ${split.platformTotalRevenue})`);

  // Test 5.2: Authentic Transaction Lifecycle (starts in "pending", no fake instant success)
  const txn = createPaymentTransaction({
    repairRequestId: "rep-test-99",
    farmerId: "farmer-01",
    farmerPhone: "919876543210",
    pricing: {
      diagnosticFee: 150,
      labourFee: 350,
      partsEstimate: 700,
      travelFee: 100,
      discount: 0,
      total: 1300,
      currency: "INR",
      isDemoPricing: true,
    },
    paymentMethod: "upi",
  });
  assert(txn.paymentStatus === "pending", "Payment transaction starts in authentic 'pending' status");
  assert(txn.completedAt === undefined, "Transaction has no premature completion timestamp");

  // Test 5.3: Payment verification & completion via webhook / receipt
  const verifiedTxn = verifyAndCompletePayment({
    transactionId: txn.id,
    gatewayReference: "UPI-REF-987654321",
    externalTransactionId: "TXN_NPCI_123456789",
    verifiedBy: "Razorpay/UPI Webhook",
  });
  assert(verifiedTxn.success === true, "Payment verification processed successfully");
  assert(verifiedTxn.transaction?.paymentStatus === "completed", "Status transitioned to 'completed'");
  assert(verifiedTxn.transaction?.completedAt !== undefined, "Completed timestamp recorded");

  // Test 5.4: Payment failure handling (remains failed, no fake success fallback)
  const failedTxnIntent = createPaymentTransaction({
    repairRequestId: "rep-test-100",
    farmerId: "farmer-01",
    farmerPhone: "919876543210",
    pricing: {
      diagnosticFee: 100,
      labourFee: 200,
      partsEstimate: 0,
      travelFee: 50,
      discount: 0,
      total: 350,
      currency: "INR",
      isDemoPricing: true,
    },
    paymentMethod: "upi",
  });
  const failureResult = recordPaymentFailure({
    transactionId: failedTxnIntent.id,
    failureReason: "Bank server declined transaction (Insufficient Funds / Timeout)",
  });
  assert(failureResult.success === true, "Failure recorded");
  assert(failureResult.transaction?.paymentStatus === "failed", "Transaction accurately marked 'failed'");
  assert(
    failureResult.transaction?.failureReason?.includes("Bank server declined"),
    "Failure reason preserved"
  );

  // Test 5.5: Supplier Settlement Ledger
  const supplierSettlement = calculateSupplierSettlement("sup-001");
  assert(supplierSettlement.supplierId === "sup-001", "Supplier settlement calculated for sup-001");
  assert(supplierSettlement.grossPartsBilled > 0, "Gross parts billed is positive");
  assert(supplierSettlement.netPayableToSupplier > 0, "Net payable to supplier is positive");

  // Test 5.6: Aggregated Ecosystem Financial Summary
  const ecoSummary = getEcosystemFinancialSummary();
  assert(ecoSummary.supplierSettlements.length >= 4, "Settlement generated for all registered suppliers");
  assert(ecoSummary.platformSummary.totalJobsCompleted > 0, "Platform total jobs aggregated");
  console.log("✓ Feature 5 (Business & Revenue Logic) passed all tests.\n");

  console.log("================================================================================");
  console.log("🎉 ALL 5 BACKEND FEATURES VERIFIED & PASSED WITH 100% SUCCESS!");
  console.log("================================================================================");
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
