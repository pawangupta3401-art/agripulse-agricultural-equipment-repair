/**
 * P2O Step 2 — Transparent Pricing Verification Test Suite
 */

import {
  MACHINE_RATE_CARD,
  DEFAULT_MACHINE_RATE,
  PRICE_CHANGE_REASONS,
  getMachineRate,
  calculateTravelFee,
  calculatePartsCost,
  calculateEstimatedPricing,
  calculateFinalPricing,
  formatCurrencyHi,
} from "../services/pricingService";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`✓ PASS: ${msg}`);
}

console.log("=== AgriPulse P2O Step 2: Transparent Pricing Tests ===\n");

// 1. Supported Machine Categories
console.log("--- 1. Testing All Supported Machine Categories ---");
const categories = [
  { key: "tractor", expectedDiag: 150, expectedLabour: 350 },
  { key: "sprayer", expectedDiag: 80, expectedLabour: 150 },
  { key: "water_pump", expectedDiag: 100, expectedLabour: 200 },
  { key: "tiller", expectedDiag: 120, expectedLabour: 280 },
  { key: "harvester", expectedDiag: 250, expectedLabour: 600 },
  { key: "planter", expectedDiag: 120, expectedLabour: 250 },
  { key: "weeder", expectedDiag: 100, expectedLabour: 200 },
];

for (const cat of categories) {
  const rate = getMachineRate(cat.key);
  assert(
    rate.diagnosticFee === cat.expectedDiag,
    `Machine '${cat.key}' diagnostic fee should be ${cat.expectedDiag}, got ${rate.diagnosticFee}`
  );
  assert(
    rate.baseLabourFee === cat.expectedLabour,
    `Machine '${cat.key}' base labour fee should be ${cat.expectedLabour}, got ${rate.baseLabourFee}`
  );
}

// Substring Hindi match testing
assert(getMachineRate("महिंद्रा ट्रैक्टर 575 DI").diagnosticFee === 150, "Hindi tractor match works");
assert(getMachineRate("नेप्सैक स्प्रेयर").diagnosticFee === 80, "Hindi sprayer match works");
assert(getMachineRate("किर्लोस्कर वाटर पंप 5HP").diagnosticFee === 100, "Hindi pump match works");

// Fallback to default
const defaultRate = getMachineRate("अज्ञात नया उपकरण");
assert(defaultRate.diagnosticFee === 100 && defaultRate.baseLabourFee === 250, "Unknown equipment fallback works");

// 2. Zero / Empty Parts
console.log("\n--- 2. Testing Zero / Empty Parts ---");
const emptyCost = calculatePartsCost({});
assert(emptyCost === 0, "Empty parts config yields ₹0");

const estZeroParts = calculateEstimatedPricing({
  machineType: "tractor",
  distanceKm: 0,
});
assert(estZeroParts.partsEstimate === 0, "Estimate with no parts has partsEstimate === 0");
assert(estZeroParts.total === 150 + 350 + 0, `Tractor zero parts total is 500, got ${estZeroParts.total}`);

// 3. Multiple Parts
console.log("\n--- 3. Testing Multiple Parts Calculation ---");
const multiPartsEst = calculatePartsCost({
  partIds: ["part-001", "part-002"],
});
assert(multiPartsEst > 0, `Multiple parts calculate non-zero sum: ₹${multiPartsEst}`);

// From technician partSelections
const selPartsEst = calculatePartsCost({
  partSelections: [
    { partId: "part-001", partNameHi: "इंजन ऑयल", decision: "needed" },
    { partId: "part-002", partNameHi: "ऑयल फ़िल्टर", decision: "not_needed" },
  ],
});
assert(selPartsEst === 480, `Technician part selection honors 'needed' decision only (expected 480): ₹${selPartsEst}`);

// 4. Travel Fee based on Distance
console.log("\n--- 4. Testing Doorstep / Travel Fee ---");
assert(calculateTravelFee(1.5) === 50, "Distance <= 2km yields ₹50");
assert(calculateTravelFee(4.0) === 100, "Distance <= 5km yields ₹100");
assert(calculateTravelFee(8.0) === 150, "Distance <= 10km yields ₹150");
assert(calculateTravelFee(15.0) === 225, "Distance 15km yields 15*15 = ₹225");
assert(calculateTravelFee(30.0) === 250, "Distance > 16.6km caps at ₹250 max");
assert(calculateTravelFee(undefined) === 100, "Undefined distance defaults to ₹100 flat");

// 5. Discount Support & Non-negative Total
console.log("\n--- 5. Testing Discount Support & Bounds ---");
const estWithDiscount = calculateEstimatedPricing({
  machineType: "water_pump",
  distanceKm: 3,
  discount: 100,
});
// 100 diag + 200 labour + 100 travel - 100 discount = 300
assert(estWithDiscount.discount === 100, "Discount recorded accurately");
assert(estWithDiscount.total === 300, `Discount correctly deducted: expected 300, got ${estWithDiscount.total}`);

const estOverDiscount = calculateEstimatedPricing({
  machineType: "sprayer",
  distanceKm: 1,
  discount: 5000, // Excessive discount
});
assert(estOverDiscount.total === 0, "Total is non-negative and never negative (Math.max(0, ...))");

// 6. Final Amount Different from Estimate & Reason Audit
console.log("\n--- 6. Testing Estimate vs Final Price Change ---");
const baseEst = calculateEstimatedPricing({
  machineType: "tractor",
  distanceKm: 5,
});

const { finalPricing, priceAdjustment } = calculateFinalPricing({
  estimatedPricing: baseEst,
  revisedLabourFee: 500, // Revised from 350 to 500
  reason: "अतिरिक्त श्रम आवश्यक",
  customReasonNote: "नट-बोल्ट जंग खाए हुए थे",
  technicianId: "tech-1",
});

assert(finalPricing.labourFee === 500, "Revised labour fee updated in final pricing");
assert(priceAdjustment !== undefined, "Price adjustment record created when difference exists");
assert(priceAdjustment?.difference === 150, `Difference calculated accurately (+150): got ${priceAdjustment?.difference}`);
assert(priceAdjustment?.reason === "अतिरिक्त श्रम आवश्यक", "Explicit reason recorded");
assert(priceAdjustment?.customReasonNote === "नट-बोल्ट जंग खाए हुए थे", "Custom reason note recorded");
assert(priceAdjustment?.adjustedByTechnicianId === "tech-1", "Technician ID recorded for audit");

// 7. Non-NaN and Type Safety
console.log("\n--- 7. Testing NaN and Undefined Immunity ---");
const safeEst = calculateEstimatedPricing({
  machineType: undefined,
  distanceKm: NaN,
  discount: -50,
});
assert(!isNaN(safeEst.total), "Total is never NaN");
assert(!isNaN(safeEst.diagnosticFee), "Diagnostic fee is never NaN");
assert(!isNaN(safeEst.labourFee), "Labour fee is never NaN");
assert(!isNaN(safeEst.travelFee), "Travel fee is never NaN");
assert(safeEst.discount === 0, "Negative discount clamped to 0");
assert(safeEst.isDemoPricing === true, "Demo pricing explicitly flagged (no fake external API claim)");

// 8. Hindi Currency Formatting
console.log("\n--- 8. Testing Hindi Currency Formatting ---");
assert(formatCurrencyHi(0) === "₹0", "formatCurrencyHi(0) === '₹0'");
assert(formatCurrencyHi(1500).includes("1,500") || formatCurrencyHi(1500) === "₹1,500", "Formatted 1500 correctly");
assert(formatCurrencyHi(undefined) === "₹0", "formatCurrencyHi(undefined) is safe");
assert(formatCurrencyHi(NaN) === "₹0", "formatCurrencyHi(NaN) is safe");

console.log("\n=======================================================");
console.log("🎉 ALL TRANSPARENT PRICING LOGIC TESTS PASSED (100%)");
console.log("=======================================================\n");
