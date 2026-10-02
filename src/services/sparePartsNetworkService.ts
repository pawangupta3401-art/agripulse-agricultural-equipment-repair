/**
 * Spare Parts Network & Multi-Supplier Backend Service — AgriPulse
 *
 * Implements:
 * 1. Supplier registry (OEM Distributors, FPO Depots, Authorized Dealers, Local Retailers).
 * 2. Multi-supplier inventory & live stock management.
 * 3. Machine & engine compatibility validation.
 * 4. AI Diagnosis -> Required part identification engine.
 * 5. Proximity-based nearby supplier matching with stock completeness scoring.
 * 6. Integration with existing sparePartData and recommendation rules.
 */

import {
  Supplier,
  SparePartStockItem,
  SparePartCompatibilityRule,
  NearbySupplierMatch,
  AIDiagnosisResult,
} from "@/types";
import { mockSpareParts, SparePart, getSparePartById } from "./sparePartData";
import { recommendSpareParts } from "./sparePartRecommendationService";
import { haversineDistanceKm } from "./locationService";

// ─── Master Supplier Registry ───────────────────────────────────────────────

export const MASTER_SUPPLIERS: Supplier[] = [
  {
    id: "sup-001",
    name: "Vidarbha Agro Machinery Spares Depot",
    nameHi: "विदर्भ एग्रो मशीनरी स्पेयर डिपो",
    supplierType: "oem_distributor",
    contactPhone: "0712-2589001",
    email: "vidarbha.spares@agripulse.in",
    location: {
      lat: 21.1458,
      lng: 79.0882,
      addressHi: "एमआईडीसी हिंगना, नागपुर",
      district: "नागपुर",
      state: "महाराष्ट्र",
      pincode: "440016",
    },
    rating: 4.8,
    verifiedStatus: "verified",
    deliveryAvailable: true,
    deliveryRadiusKm: 60,
    operatingStatus: "open",
    notesHi: "प्रमुख ट्रैक्टर व इंजन मूल स्पेयर पार्ट्स का अधिकृत क्षेत्रीय डिपो।",
  },
  {
    id: "sup-002",
    name: "Nagpur Krishi Vikas FPO Parts Centre",
    nameHi: "नागपुर कृषि विकास एफपीओ पार्ट्स सेंटर",
    supplierType: "fpo_depot",
    contactPhone: "0712-2849105",
    email: "nagpur.fpo.parts@agripulse.in",
    location: {
      lat: 21.152,
      lng: 79.094,
      addressHi: "हिंगना रोड, ब्लॉक 1, नागपुर ग्रामीण",
      district: "नागपुर",
      state: "महाराष्ट्र",
      pincode: "440028",
    },
    rating: 4.6,
    verifiedStatus: "verified",
    deliveryAvailable: true,
    deliveryRadiusKm: 25,
    operatingStatus: "open",
    notesHi: "एफपीओ संचालित रियायती स्पेयर पार्ट्स केंद्र — सदस्यों के लिए 10% छूट।",
  },
  {
    id: "sup-003",
    name: "Kisan Tractor & Pump Spares",
    nameHi: "किसान ट्रैक्टर एवं पंप स्पेयर पार्ट्स",
    supplierType: "local_retailer",
    contactPhone: "0712-2733412",
    location: {
      lat: 21.161,
      lng: 79.072,
      addressHi: "कलमेश्वर मुख्य बाजार, नागपुर ग्रामीण",
      district: "नागपुर",
      state: "महाराष्ट्र",
      pincode: "441501",
    },
    rating: 4.4,
    verifiedStatus: "verified",
    deliveryAvailable: true,
    deliveryRadiusKm: 15,
    operatingStatus: "open",
    notesHi: "पंप सील, पाइप, बेल्ट, स्पार्क प्लग और फिल्टर का त्वरित स्थानीय भंडार।",
  },
  {
    id: "sup-004",
    name: "Umred Authorized Swaraj & Mahindra Dealer",
    nameHi: "उमरेड अधिकृत स्वराज व महिंद्रा पार्ट्स डीलर",
    supplierType: "authorized_dealer",
    contactPhone: "07116-242100",
    location: {
      lat: 20.854,
      lng: 79.326,
      addressHi: "बाईपास रोड, उमरेड, नागपुर",
      district: "नागपुर",
      state: "महाराष्ट्र",
      pincode: "441203",
    },
    rating: 4.7,
    verifiedStatus: "verified",
    deliveryAvailable: true,
    deliveryRadiusKm: 35,
    operatingStatus: "open",
    notesHi: "ओरिजिनल कंपनी सील व वारंटी वाले स्पेयर पार्ट्स।",
  },
];

// ─── Master Stock Registry ──────────────────────────────────────────────────

export const MASTER_STOCK_ITEMS: SparePartStockItem[] = [
  // sup-001 (Vidarbha Depot - Comprehensive stock)
  { supplierId: "sup-001", partId: "part-001", inStock: true, quantity: 45, unitPrice: 480, wholesalePrice: 410, leadTimeHours: 2, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-001", partId: "part-002", inStock: true, quantity: 30, unitPrice: 220, wholesalePrice: 185, leadTimeHours: 2, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-001", partId: "part-003", inStock: true, quantity: 25, unitPrice: 350, wholesalePrice: 295, leadTimeHours: 2, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-001", partId: "part-004", inStock: true, quantity: 50, unitPrice: 90, wholesalePrice: 75, leadTimeHours: 2, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-001", partId: "part-005", inStock: true, quantity: 20, unitPrice: 650, wholesalePrice: 560, leadTimeHours: 2, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-001", partId: "part-006", inStock: true, quantity: 18, unitPrice: 180, wholesalePrice: 145, leadTimeHours: 2, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-001", partId: "part-007", inStock: true, quantity: 40, unitPrice: 75, wholesalePrice: 60, leadTimeHours: 2, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-001", partId: "part-008", inStock: true, quantity: 12, unitPrice: 3200, wholesalePrice: 2850, leadTimeHours: 4, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-001", partId: "part-009", inStock: true, quantity: 80, unitPrice: 35, wholesalePrice: 25, leadTimeHours: 2, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-001", partId: "part-010", inStock: true, quantity: 35, unitPrice: 120, wholesalePrice: 95, leadTimeHours: 2, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-001", partId: "part-011", inStock: true, quantity: 15, unitPrice: 95, wholesalePrice: 78, leadTimeHours: 2, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-001", partId: "part-012", inStock: true, quantity: 22, unitPrice: 310, wholesalePrice: 260, leadTimeHours: 2, lastUpdated: new Date().toISOString() },

  // sup-002 (FPO Parts Centre - High rotation consumables)
  { supplierId: "sup-002", partId: "part-001", inStock: true, quantity: 20, unitPrice: 460, wholesalePrice: 410, leadTimeHours: 1, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-002", partId: "part-002", inStock: true, quantity: 15, unitPrice: 210, wholesalePrice: 185, leadTimeHours: 1, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-002", partId: "part-003", inStock: true, quantity: 12, unitPrice: 330, wholesalePrice: 295, leadTimeHours: 1, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-002", partId: "part-006", inStock: true, quantity: 8, unitPrice: 170, wholesalePrice: 145, leadTimeHours: 1, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-002", partId: "part-007", inStock: true, quantity: 25, unitPrice: 70, wholesalePrice: 60, leadTimeHours: 1, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-002", partId: "part-010", inStock: true, quantity: 18, unitPrice: 110, wholesalePrice: 95, leadTimeHours: 1, lastUpdated: new Date().toISOString() },

  // sup-003 (Local Retailer - Quick pump & sprayer spares)
  { supplierId: "sup-003", partId: "part-004", inStock: true, quantity: 15, unitPrice: 95, leadTimeHours: 1, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-003", partId: "part-005", inStock: true, quantity: 6, unitPrice: 660, leadTimeHours: 1, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-003", partId: "part-006", inStock: true, quantity: 10, unitPrice: 185, leadTimeHours: 1, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-003", partId: "part-007", inStock: true, quantity: 18, unitPrice: 80, leadTimeHours: 1, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-003", partId: "part-009", inStock: true, quantity: 40, unitPrice: 40, leadTimeHours: 1, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-003", partId: "part-010", inStock: true, quantity: 12, unitPrice: 125, leadTimeHours: 1, lastUpdated: new Date().toISOString() },

  // sup-004 (Umred Dealer)
  { supplierId: "sup-004", partId: "part-001", inStock: true, quantity: 16, unitPrice: 490, leadTimeHours: 3, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-004", partId: "part-002", inStock: true, quantity: 10, unitPrice: 225, leadTimeHours: 3, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-004", partId: "part-005", inStock: true, quantity: 8, unitPrice: 650, leadTimeHours: 3, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-004", partId: "part-008", inStock: true, quantity: 5, unitPrice: 3250, leadTimeHours: 4, lastUpdated: new Date().toISOString() },
  { supplierId: "sup-004", partId: "part-011", inStock: true, quantity: 7, unitPrice: 100, leadTimeHours: 3, lastUpdated: new Date().toISOString() },
];

// ─── Machine Compatibility Registry ─────────────────────────────────────────

export const MASTER_COMPATIBILITY_RULES: SparePartCompatibilityRule[] = [
  { partId: "part-001", machineType: "Tractor", notes: "15W-40 Universal Diesel Engine Oil" },
  { partId: "part-001", machineType: "Power Tiller", notes: "Engine Crankcase Oil" },
  { partId: "part-001", machineType: "Water Pump", notes: "4-stroke Pump Engine Oil" },
  { partId: "part-002", machineType: "Tractor", machineModel: "Mahindra 575 DI / Swaraj 744", notes: "Spin-on Oil Filter" },
  { partId: "part-003", machineType: "Tractor", notes: "Dry Element Air Cleaner" },
  { partId: "part-003", machineType: "Power Tiller", notes: "Air Cleaner Element" },
  { partId: "part-004", machineType: "Power Tiller", engineModel: "Petrol/Kerosene Spark Engine", notes: "NGK Standard Spark Plug" },
  { partId: "part-004", machineType: "Sprayer", notes: "2-Stroke Engine Spark Plug" },
  { partId: "part-005", machineType: "Tractor", notes: "Alternator / Fan V-Belt" },
  { partId: "part-005", machineType: "Water Pump", notes: "Centrifugal Pump Drive Belt" },
  { partId: "part-006", machineType: "Water Pump", notes: "Mechanical Shaft Impeller Seal" },
  { partId: "part-006", machineType: "Sprayer", notes: "HTP Sprayer Pressure Piston Seal" },
  { partId: "part-007", machineType: "Sprayer", notes: "Solid Cone / Flat Fan Brass Spray Nozzle" },
  { partId: "part-008", machineType: "Tractor", notes: "12V 75Ah / 88Ah Starting Battery" },
  { partId: "part-009", machineType: "Tractor", notes: "Blade Fuse Set (10A, 15A, 20A, 30A)" },
  { partId: "part-010", machineType: "Water Pump", notes: "Reinforced Suction & Delivery Hose" },
  { partId: "part-010", machineType: "Sprayer", notes: "High Pressure Spray Hose 8.5mm" },
  { partId: "part-011", machineType: "Tractor", notes: "0.9 bar Pressurized Radiator Cap" },
  { partId: "part-012", machineType: "Tractor", notes: "Pre-diluted Glycol Engine Coolant" },
];

/**
 * Check if a spare part is compatible with a given machine and model.
 */
export function isPartCompatibleWithMachine(partId: string, machineType: string, machineModel?: string): boolean {
  const part = getSparePartById(partId);
  if (!part) return false;

  const matchType = part.compatibleMachines.some(
    (m) => m === "All" || m.toLowerCase() === machineType.toLowerCase()
  );
  if (matchType) return true;

  return MASTER_COMPATIBILITY_RULES.some(
    (r) =>
      r.partId === partId &&
      r.machineType.toLowerCase() === machineType.toLowerCase() &&
      (!machineModel || !r.machineModel || r.machineModel.toLowerCase().includes(machineModel.toLowerCase()))
  );
}

/**
 * Identify required spare parts from AI diagnosis text or AIDiagnosisResult.
 * Uses deterministic symptom & rule mapping with compatibility checks.
 */
export function identifyRequiredPartsFromDiagnosis(
  diagnosis: AIDiagnosisResult | string,
  machineType?: string
): Array<{
  part: SparePart;
  reasonHi: string;
  priority: number;
  isCompatible: boolean;
}> {
  let matchedRule: string | undefined;
  let problemDesc = "";
  let resolvedMachine = machineType || "Tractor";

  if (typeof diagnosis === "object") {
    matchedRule = diagnosis.matchedRule;
    problemDesc = `${diagnosis.possibleProblem} ${diagnosis.reasons.join(" ")}`;
    if (!machineType && diagnosis.machineIdentified) {
      resolvedMachine = diagnosis.machineIdentified;
    }
  } else {
    problemDesc = diagnosis;
  }

  const recResult = recommendSpareParts({
    machineType: resolvedMachine,
    matchedRule,
    problemDescription: problemDesc,
  });

  return recResult.recommendations.map((rec) => ({
    part: rec.part,
    reasonHi: rec.reasonHi,
    priority: rec.priority,
    isCompatible: isPartCompatibleWithMachine(rec.part.id, resolvedMachine),
  }));
}

/**
 * Find nearby suppliers who have the requested spare parts in stock.
 * Calculates distance, verifies inventory, and ranks suppliers by completeness and proximity.
 */
export function findNearbySuppliersWithParts(params: {
  partIds: string[];
  location: { lat: number; lng: number };
  maxDistanceKm?: number;
}): NearbySupplierMatch[] {
  const { partIds, location, maxDistanceKm = 50 } = params;

  const matches: NearbySupplierMatch[] = [];

  for (const supplier of MASTER_SUPPLIERS) {
    const distKm = haversineDistanceKm(
      location.lat,
      location.lng,
      supplier.location.lat,
      supplier.location.lng
    );

    if (distKm > maxDistanceKm) continue;

    // Check inventory for requested parts
    const supplierStock = MASTER_STOCK_ITEMS.filter((item) => item.supplierId === supplier.id);

    let allInStock = true;
    let totalCost = 0;
    let maxLeadTime = 1;

    const partAvailability = partIds.map((pid) => {
      const stockEntry = supplierStock.find((s) => s.partId === pid && s.inStock && s.quantity > 0);
      const part = getSparePartById(pid);

      if (stockEntry) {
        totalCost += stockEntry.unitPrice;
        if (stockEntry.leadTimeHours > maxLeadTime) maxLeadTime = stockEntry.leadTimeHours;
        return {
          partId: pid,
          partNameHi: part?.nameHi || pid,
          partNameEn: part?.name || pid,
          inStock: true,
          quantity: stockEntry.quantity,
          unitPrice: stockEntry.unitPrice,
          leadTimeHours: stockEntry.leadTimeHours,
        };
      } else {
        allInStock = false;
        return {
          partId: pid,
          partNameHi: part?.nameHi || pid,
          partNameEn: part?.name || pid,
          inStock: false,
          quantity: 0,
          unitPrice: part?.estimatedPrice || 0,
          leadTimeHours: 24, // Out of stock / order needed
        };
      }
    });

    matches.push({
      supplier: {
        ...supplier,
        distanceKm: Math.round(distKm * 10) / 10,
      },
      distanceKm: Math.round(distKm * 10) / 10,
      distanceText: `${(Math.round(distKm * 10) / 10).toFixed(1)} किमी`,
      partAvailability,
      allRequestedPartsInStock: allInStock,
      totalPartsCost: totalCost,
      deliveryAvailable: supplier.deliveryAvailable && distKm <= supplier.deliveryRadiusKm,
      estimatedDeliveryHours: maxLeadTime,
    });
  }

  // Sort: 1. All parts in stock first, 2. Closest distance, 3. Rating
  matches.sort((a, b) => {
    if (a.allRequestedPartsInStock !== b.allRequestedPartsInStock) {
      return a.allRequestedPartsInStock ? -1 : 1;
    }
    return a.distanceKm - b.distanceKm;
  });

  return matches;
}

/**
 * Check supplier stock availability for specific part and quantity.
 */
export function checkSupplierPartStock(
  supplierId: string,
  partId: string,
  requestedQuantity: number = 1
): {
  available: boolean;
  availableQuantity: number;
  unitPrice: number;
  leadTimeHours: number;
  supplierNameHi: string;
} {
  const supplier = MASTER_SUPPLIERS.find((s) => s.id === supplierId);
  const stock = MASTER_STOCK_ITEMS.find((s) => s.supplierId === supplierId && s.partId === partId);

  if (!stock || !supplier) {
    return {
      available: false,
      availableQuantity: 0,
      unitPrice: 0,
      leadTimeHours: 24,
      supplierNameHi: supplier?.nameHi || "अज्ञात सप्लायर",
    };
  }

  const isAvail = stock.inStock && stock.quantity >= requestedQuantity;
  return {
    available: isAvail,
    availableQuantity: stock.quantity,
    unitPrice: stock.unitPrice,
    leadTimeHours: stock.leadTimeHours,
    supplierNameHi: supplier.nameHi,
  };
}
