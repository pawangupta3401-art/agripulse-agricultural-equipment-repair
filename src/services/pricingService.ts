/**
 * Centralized Transparent Pricing Engine — P2O Step 2 AgriPulse
 *
 * Provides deterministic, verifiable, and transparent cost estimates for farmers:
 * 1. Diagnostic / inspection charge (जांच शुल्क)
 * 2. Labour / service charge (मजदूरी शुल्क)
 * 3. Estimated spare-parts cost (स्पेयर पार्ट्स)
 * 4. Travel / doorstep charge (घर पर आने का शुल्क)
 * 5. Applicable discounts / subsidies (छूट)
 * 6. Total estimated and revised cost (कुल राशि)
 *
 * Formula:
 * diagnostic_fee + labour_fee + parts_estimate + travel_fee - discount = total
 *
 * Note: Clearly flags isDemoPricing: true to distinguish simulated rates from
 * external live market pricing APIs.
 */

import type { PricingBreakdown, PriceChangeReason, FinalPriceAdjustment, PartSelection } from "../types";
import { mockSpareParts } from "./sparePartData";

export interface MachineRateConfig {
  diagnosticFee: number;
  baseLabourFee: number;
  nameHi: string;
}

/**
 * Standardized rate card by agricultural machine category.
 * Prevents anti-gouging and provides transparent, predictable pricing to farmers.
 */
export const MACHINE_RATE_CARD: Record<string, MachineRateConfig> = {
  tractor: { diagnosticFee: 150, baseLabourFee: 350, nameHi: "ट्रैक्टर" },
  "ट्रैक्टर": { diagnosticFee: 150, baseLabourFee: 350, nameHi: "ट्रैक्टर" },
  sprayer: { diagnosticFee: 80, baseLabourFee: 150, nameHi: "स्प्रेयर" },
  "स्प्रेयर": { diagnosticFee: 80, baseLabourFee: 150, nameHi: "स्प्रेयर" },
  water_pump: { diagnosticFee: 100, baseLabourFee: 200, nameHi: "वाटर पंप" },
  "वाटर पंप": { diagnosticFee: 100, baseLabourFee: 200, nameHi: "वाटर पंप" },
  power_tiller: { diagnosticFee: 120, baseLabourFee: 280, nameHi: "पावर टिलर" },
  tiller: { diagnosticFee: 120, baseLabourFee: 280, nameHi: "पावर टिलर" },
  "पावर टिलर": { diagnosticFee: 120, baseLabourFee: 280, nameHi: "पावर टिलर" },
  harvester: { diagnosticFee: 250, baseLabourFee: 600, nameHi: "कंबाइन हार्वेस्टर" },
  "हार्वेस्टर": { diagnosticFee: 250, baseLabourFee: 600, nameHi: "कंबाइन हार्वेस्टर" },
  planter: { diagnosticFee: 120, baseLabourFee: 250, nameHi: "सीड प्लांटर" },
  "प्लांटर": { diagnosticFee: 120, baseLabourFee: 250, nameHi: "सीड प्लांटर" },
  weeder: { diagnosticFee: 100, baseLabourFee: 200, nameHi: "पावर वीडर" },
  "वीडर": { diagnosticFee: 100, baseLabourFee: 200, nameHi: "पावर वीडर" },
};

export const DEFAULT_MACHINE_RATE: MachineRateConfig = {
  diagnosticFee: 100,
  baseLabourFee: 250,
  nameHi: "सामान्य कृषि उपकरण",
};

export const PRICE_CHANGE_REASONS: PriceChangeReason[] = [
  "अतिरिक्त पार्ट खराब मिला",
  "अतिरिक्त श्रम आवश्यक",
  "मूल पार्ट उपलब्ध नहीं",
  "अन्य",
];

/**
 * Get machine rate card matching machineId, machineType, or name.
 */
export function getMachineRate(machineIdOrType?: string): MachineRateConfig {
  if (!machineIdOrType) return DEFAULT_MACHINE_RATE;
  const key = machineIdOrType.trim().toLowerCase();
  if (MACHINE_RATE_CARD[key]) return MACHINE_RATE_CARD[key];

  // Substring matching for Hindi or English terms
  if (key.includes("tractor") || key.includes("ट्रैक्टर")) return MACHINE_RATE_CARD["tractor"];
  if (key.includes("sprayer") || key.includes("स्प्रेयर")) return MACHINE_RATE_CARD["sprayer"];
  if (key.includes("pump") || key.includes("पंप")) return MACHINE_RATE_CARD["water_pump"];
  if (key.includes("tiller") || key.includes("टिलर")) return MACHINE_RATE_CARD["power_tiller"];
  if (key.includes("harvester") || key.includes("हार्वेस्टर")) return MACHINE_RATE_CARD["harvester"];
  if (key.includes("planter") || key.includes("प्लांटर")) return MACHINE_RATE_CARD["planter"];
  if (key.includes("weeder") || key.includes("वीडर")) return MACHINE_RATE_CARD["weeder"];

  return DEFAULT_MACHINE_RATE;
}

/**
 * Calculate travel/doorstep fee deterministically based on distance.
 */
export function calculateTravelFee(distanceKm?: number): number {
  if (distanceKm === undefined || distanceKm === null || isNaN(distanceKm)) {
    return 100; // Standard flat demo doorstep fee
  }
  if (distanceKm === 0) return 0; // Workshop / centre service has zero doorstep travel fee
  if (distanceKm <= 2) return 50;
  if (distanceKm <= 5) return 100;
  if (distanceKm <= 10) return 150;
  return Math.min(250, Math.round(distanceKm * 15));
}

/**
 * Calculate total parts estimate from part IDs or selections.
 */
export function calculatePartsCost(params: {
  partIds?: string[];
  partSelections?: PartSelection[];
}): number {
  let sum = 0;

  if (params.partSelections && params.partSelections.length > 0) {
    for (const sel of params.partSelections) {
      if (sel.decision === "needed") {
        const found = mockSpareParts.find((p) => p.id === sel.partId);
        if (found) sum += found.estimatedPrice;
      }
    }
    return sum;
  }

  if (params.partIds && params.partIds.length > 0) {
    for (const id of params.partIds) {
      const found = mockSpareParts.find((p) => p.id === id);
      if (found) sum += found.estimatedPrice;
    }
  }

  return sum;
}

export interface EstimatePricingParams {
  machineType?: string;
  machineId?: string;
  distanceKm?: number;
  recommendedPartIds?: string[];
  partSelections?: PartSelection[];
  discount?: number;
  discountReason?: string;
}

/**
 * Centralized function to calculate upfront estimated pricing before farmer booking.
 * Guarantees no NaN, no negative values, and deterministic calculations.
 */
export function calculateEstimatedPricing(params: EstimatePricingParams): PricingBreakdown {
  const rate = getMachineRate(params.machineId || params.machineType);
  const diagnosticFee = Math.max(0, rate.diagnosticFee || 0);
  const labourFee = Math.max(0, rate.baseLabourFee || 0);
  const travelFee = calculateTravelFee(params.distanceKm);
  const partsEstimate = calculatePartsCost({
    partIds: params.recommendedPartIds,
    partSelections: params.partSelections,
  });
  const discount = Math.max(0, params.discount || 0);

  const subtotal = diagnosticFee + labourFee + partsEstimate + travelFee;
  const total = Math.max(0, subtotal - discount);

  return {
    diagnosticFee,
    labourFee,
    partsEstimate,
    travelFee,
    discount,
    total,
    currency: "₹",
    isDemoPricing: true,
    discountReason: params.discountReason,
  };
}

export interface FinalPricingParams {
  estimatedPricing: PricingBreakdown;
  revisedLabourFee?: number;
  revisedDiagnosticFee?: number;
  revisedTravelFee?: number;
  revisedPartsCost?: number;
  revisedDiscount?: number;
  reason?: PriceChangeReason;
  customReasonNote?: string;
  technicianId?: string;
}

/**
 * Calculates final pricing upon repair completion.
 * Generates an auditable FinalPriceAdjustment record if final differs from estimate.
 */
export function calculateFinalPricing(params: FinalPricingParams): {
  finalPricing: PricingBreakdown;
  priceAdjustment?: FinalPriceAdjustment;
} {
  const est = params.estimatedPricing;

  const diagnosticFee = Math.max(0, params.revisedDiagnosticFee ?? est.diagnosticFee);
  const labourFee = Math.max(0, params.revisedLabourFee ?? est.labourFee);
  const travelFee = Math.max(0, params.revisedTravelFee ?? est.travelFee);
  const partsEstimate = Math.max(0, params.revisedPartsCost ?? est.partsEstimate);
  const discount = Math.max(0, params.revisedDiscount ?? est.discount);

  const total = Math.max(0, diagnosticFee + labourFee + partsEstimate + travelFee - discount);

  const finalPricing: PricingBreakdown = {
    diagnosticFee,
    labourFee,
    partsEstimate,
    travelFee,
    discount,
    total,
    currency: "₹",
    isDemoPricing: true,
  };

  let priceAdjustment: FinalPriceAdjustment | undefined;

  const diff = total - est.total;
  if (diff !== 0) {
    priceAdjustment = {
      estimatedTotal: est.total,
      revisedTotal: total,
      difference: diff,
      reason: params.reason || "अतिरिक्त श्रम आवश्यक",
      customReasonNote: params.customReasonNote,
      adjustedAt: new Date().toISOString(),
      adjustedByTechnicianId: params.technicianId,
    };
  }

  return { finalPricing, priceAdjustment };
}

/**
 * Helper to format price with Hindi locale (₹1,800).
 */
export function formatCurrencyHi(amount?: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  return `₹${Math.round(amount).toLocaleString("hi-IN")}`;
}
