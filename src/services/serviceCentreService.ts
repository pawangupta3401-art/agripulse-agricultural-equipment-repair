/**
 * Local Service Centre & FPO Network Service — P2O Step 4 AgriPulse
 *
 * Implements:
 * 1. Service Centre entity supporting:
 *    - Local Workshop
 *    - FPO (Farmer Producer Organisation)
 *    - Cooperative (सहकारी समिति)
 *    - Entrepreneur-operated Centre (उद्यमी केंद्र)
 *    - Authorized/Partner Service Centre
 * 2. Technician ↔ Service Centre association without duplicate technician records.
 * 3. Equipment capabilities & spare-parts availability linking.
 * 4. Service Centre matching taking equipment, skills, distance, and parts into account.
 * 5. Offline-first localStorage caching & persistence.
 * 6. Explicit isDemoRecord: true marking for simulated seed records.
 */

import {
  ServiceCentre,
  ServiceCentreType,
  ServiceCentreVerificationStatus,
  ServiceMode,
  ServiceCentreStockedPart,
} from "../types";
import { FarmerLocation, haversineDistanceKm } from "./locationService";
import { getTechnicians } from "./certificationService";
import { mockSpareParts } from "./sparePartData";

const SERVICE_CENTRES_STORAGE_KEY = "agripulse_service_centres_v1";
const FARMER_CENTER = { lat: 26.8467, lng: 80.9462 };

export const mockServiceCentres: ServiceCentre[] = [
  {
    id: "sc-001",
    name: "Nagpur Krishi Vikas FPO Service Centre",
    nameHi: "नागपुर कृषि विकास एफपीओ सर्विस सेंटर",
    centreType: "FPO",
    operatingOrgName: "नागपुर किसान उत्पादक कंपनी लि. (FPO)",
    operatingOrgType: "FPO",
    location: {
      lat: FARMER_CENTER.lat + 0.0053,
      lng: FARMER_CENTER.lng + 0.0058,
      addressHi: "हिंगना रोड, ब्लॉक 1, नागपुर ग्रामीण",
      district: "नागपुर",
    },
    distanceKm: 2.8,
    serviceAreaKm: 25,
    equipmentCategories: ["Tractor", "Sprayer", "Power Tiller", "Harvester", "Water Pump"],
    technicalCapabilities: ["Mechanical", "Hydraulic", "Engine", "Diagnostics"],
    associatedTechnicianIds: ["tech-003", "tech-001"],
    operatingStatus: "Open",
    phone: "0712-2849100",
    managerNameHi: "अनिल देशमुख (FPO निदेशक)",
    verificationStatus: "verified",
    isDemoRecord: true,
    notesHi: "एफपीओ संचालित आधुनिक वर्कशॉप। रियायती दरों पर सर्विस व मूल स्पेयर पार्ट्स उपलब्ध।",
    stockedParts: [
      {
        partId: "sp-001",
        partNameHi: "स्प्रेयर नोजल किट",
        inStock: true,
        quantity: 15,
        availabilityStatus: "उपलब्ध (In Stock)",
      },
      {
        partId: "sp-002",
        partNameHi: "वाटर पंप इम्पेलर सील",
        inStock: true,
        quantity: 8,
        availabilityStatus: "उपलब्ध (In Stock)",
      },
      {
        partId: "sp-003",
        partNameHi: "हाइड्रोलिक होज़ पाइप",
        inStock: true,
        quantity: 12,
        availabilityStatus: "उपलब्ध (In Stock)",
      },
      {
        partId: "sp-004",
        partNameHi: "इंजन ऑयल फ़िल्टर",
        inStock: true,
        quantity: 20,
        availabilityStatus: "उपलब्ध (In Stock)",
      },
      {
        partId: "sp-005",
        partNameHi: "अल्टरनेटर बेल्ट",
        inStock: true,
        quantity: 10,
        availabilityStatus: "उपलब्ध (In Stock)",
      },
    ],
  },
  {
    id: "sc-002",
    name: "Vidarbha Kisan Sahakari Samiti Workshop",
    nameHi: "विदर्भ कृषक सहकारी सेवा केंद्र व वर्कशॉप",
    centreType: "Cooperative",
    operatingOrgName: "विदर्भ सहकारी कृषि विकास संस्था",
    operatingOrgType: "Cooperative",
    location: {
      lat: FARMER_CENTER.lat + 0.0143,
      lng: FARMER_CENTER.lng - 0.0082,
      addressHi: "कलमेश्वर ग्रामीण, नागपुर",
      district: "नागपुर",
    },
    distanceKm: 4.1,
    serviceAreaKm: 20,
    equipmentCategories: ["Water Pump", "Sprayer", "Planter", "Weeder"],
    technicalCapabilities: ["Electrical", "Mechanical", "Diagnostics"],
    associatedTechnicianIds: ["tech-002"],
    operatingStatus: "Open",
    phone: "0712-2849200",
    managerNameHi: "राजेश पाटिल (सहकारी प्रबंधक)",
    verificationStatus: "verified",
    isDemoRecord: true,
    notesHi: "सहकारी समिति वर्कशॉप। पंप और छिड़काव यंत्रों की त्वरित मरम्मत व टेस्टिंग सुविधा।",
    stockedParts: [
      {
        partId: "sp-002",
        partNameHi: "वाटर पंप इम्पेलर सील",
        inStock: true,
        quantity: 5,
        availabilityStatus: "उपलब्ध (In Stock)",
      },
      {
        partId: "sp-004",
        partNameHi: "इंजन ऑयल फ़िल्टर",
        inStock: true,
        quantity: 2,
        availabilityStatus: "सीमित स्टॉक (Limited)",
      },
      {
        partId: "sp-003",
        partNameHi: "हाइड्रोलिक होज़ पाइप",
        inStock: false,
        quantity: 0,
        availabilityStatus: "ऑर्डर पर (On Order)",
      },
    ],
  },
  {
    id: "sc-003",
    name: "Kisan Agro Tech Entrepreneur Workshop",
    nameHi: "किसान एग्रो टेक उद्यमी वर्कशॉप",
    centreType: "Entrepreneur-operated Centre",
    operatingOrgName: "अतुल कृषि उद्यमी केंद्र",
    operatingOrgType: "Entrepreneur",
    location: {
      lat: FARMER_CENTER.lat - 0.0087,
      lng: FARMER_CENTER.lng + 0.0188,
      addressHi: "काटोल रोड, नागपुर",
      district: "नागपुर",
    },
    distanceKm: 5.6,
    serviceAreaKm: 15,
    equipmentCategories: ["Tractor", "Power Tiller", "Sprayer"],
    technicalCapabilities: ["Mechanical", "Engine", "Electrical"],
    associatedTechnicianIds: ["tech-004"],
    operatingStatus: "Open",
    phone: "0712-2849300",
    managerNameHi: "अतुल गवंडे (स्थानीय कृषि उद्यमी)",
    verificationStatus: "pending",
    isDemoRecord: true,
    notesHi: "युवा कृषि उद्यमी द्वारा संचालित आधुनिक स्थानीय वर्कशॉप।",
    stockedParts: [
      {
        partId: "sp-001",
        partNameHi: "स्प्रेयर नोजल किट",
        inStock: true,
        quantity: 4,
        availabilityStatus: "उपलब्ध (In Stock)",
      },
      {
        partId: "sp-003",
        partNameHi: "हाइड्रोलिक होज़ पाइप",
        inStock: false,
        quantity: 0,
        availabilityStatus: "ऑर्डर पर (On Order)",
      },
    ],
  },
  {
    id: "sc-004",
    name: "Jai Kisan Partner Service Centre",
    nameHi: "जय किसान ऑथोराइज्ड एग्री वर्कशॉप",
    centreType: "Authorized/Partner Service Centre",
    operatingOrgName: "जय किसान एग्रो इंजीनियर्स",
    operatingOrgType: "Private Workshop",
    location: {
      lat: FARMER_CENTER.lat + 0.0253,
      lng: FARMER_CENTER.lng + 0.0238,
      addressHi: "कामठी रोड, नागपुर",
      district: "नागपुर",
    },
    distanceKm: 8.2,
    serviceAreaKm: 18,
    equipmentCategories: ["Tractor", "Harvester", "Water Pump"],
    technicalCapabilities: ["Hydraulic", "Mechanical", "Engine", "Diagnostics"],
    associatedTechnicianIds: ["tech-005"],
    operatingStatus: "Open",
    phone: "0712-2849400",
    managerNameHi: "संजय कोल्हे (वर्कशॉप इंचार्ज)",
    verificationStatus: "unverified",
    isDemoRecord: true,
    notesHi: "प्राइवेट पार्टनर वर्कशॉप। भारी कृषि मशीनरी के लिए हाइड्रोलिक मरम्मत सेटअप।",
    stockedParts: [
      {
        partId: "sp-003",
        partNameHi: "हाइड्रोलिक होज़ पाइप",
        inStock: true,
        quantity: 6,
        availabilityStatus: "उपलब्ध (In Stock)",
      },
      {
        partId: "sp-005",
        partNameHi: "अल्टरनेटर बेल्ट",
        inStock: true,
        quantity: 3,
        availabilityStatus: "उपलब्ध (In Stock)",
      },
    ],
  },
  {
    id: "sc-005",
    name: "Gramin Krishi Seva Kendra (Closed)",
    nameHi: "ग्रामीण कृषि सहायता केंद्र (वर्तमान में बंद)",
    centreType: "Local Workshop",
    operatingOrgName: "ग्रामीण विकास मंडल",
    operatingOrgType: "Private Workshop",
    location: {
      lat: FARMER_CENTER.lat + 0.0333,
      lng: FARMER_CENTER.lng + 0.0338,
      addressHi: "उमरेड रोड, नागपुर",
      district: "नागपुर",
    },
    distanceKm: 14.5,
    serviceAreaKm: 10,
    equipmentCategories: ["Tractor"],
    technicalCapabilities: ["Mechanical"],
    associatedTechnicianIds: [], // Centre with no technicians
    operatingStatus: "Closed",
    phone: "0712-2849500",
    managerNameHi: "मनोज जोशी",
    verificationStatus: "unverified",
    isDemoRecord: true,
    notesHi: "मरम्मत केंद्र बंद है। कोई मैकेनिक उपलब्ध नहीं।",
    stockedParts: [],
  },
];

/**
 * Retrieve service centres (offline-first from localStorage, fallback to mock).
 */
export function getServiceCentres(): ServiceCentre[] {
  if (typeof window === "undefined") {
    return mockServiceCentres;
  }

  try {
    const raw = localStorage.getItem(SERVICE_CENTRES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Safe fallback
  }

  // Seed with default mock centres
  try {
    localStorage.setItem(SERVICE_CENTRES_STORAGE_KEY, JSON.stringify(mockServiceCentres));
  } catch {
    // Storage quota fallback
  }

  return mockServiceCentres;
}

/**
 * Save service centres to local cache.
 */
export function saveServiceCentres(centres: ServiceCentre[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SERVICE_CENTRES_STORAGE_KEY, JSON.stringify(centres));
  } catch {
    // Storage quota fallback
  }
}

/**
 * Retrieve a specific service centre by ID.
 */
export function getServiceCentreById(centreId: string): ServiceCentre | undefined {
  const centres = getServiceCentres();
  return centres.find((c) => c.id === centreId);
}

/**
 * Verification badge display details for service centres.
 */
export function getServiceCentreVerificationBadge(status: ServiceCentreVerificationStatus): {
  labelHi: string;
  badgeHi: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
} {
  switch (status) {
    case "verified":
      return {
        labelHi: "प्रमाणित",
        badgeHi: "🟢 प्रमाणित केंद्र (Verified)",
        bgClass: "bg-emerald-100",
        borderClass: "border-emerald-300",
        textClass: "text-emerald-900",
      };
    case "pending":
      return {
        labelHi: "सत्यापन प्रक्रियाधीन",
        badgeHi: "🟡 सत्यापन प्रक्रियाधीन (Pending)",
        bgClass: "bg-amber-100",
        borderClass: "border-amber-300",
        textClass: "text-amber-900",
      };
    case "unverified":
    default:
      return {
        labelHi: "असत्यापित",
        badgeHi: "⚪ पंजीकृत वर्कशॉप (Unverified)",
        bgClass: "bg-slate-100",
        borderClass: "border-slate-300",
        textClass: "text-slate-800",
      };
  }
}

/**
 * Hindi label for centre types.
 */
export function getCentreTypeLabelHi(type: ServiceCentreType): {
  labelHi: string;
  icon: string;
  colorClass: string;
} {
  switch (type) {
    case "FPO":
      return {
        labelHi: "FPO सेवा केंद्र",
        icon: "🌾",
        colorClass: "bg-green-100 text-green-900 border-green-300",
      };
    case "Cooperative":
      return {
        labelHi: "सहकारी समिति वर्कशॉप",
        icon: "🤝",
        colorClass: "bg-blue-100 text-blue-900 border-blue-300",
      };
    case "Entrepreneur-operated Centre":
      return {
        labelHi: "उद्यमी सेवा केंद्र",
        icon: "🏢",
        colorClass: "bg-purple-100 text-purple-900 border-purple-300",
      };
    case "Authorized/Partner Service Centre":
      return {
        labelHi: "ऑथोराइज्ड पार्टनर वर्कशॉप",
        icon: "⚙️",
        colorClass: "bg-amber-100 text-amber-900 border-amber-300",
      };
    case "Local Workshop":
    default:
      return {
        labelHi: "स्थानीय वर्कशॉप",
        icon: "🏪",
        colorClass: "bg-slate-100 text-slate-900 border-slate-300",
      };
  }
}

export interface MatchedServiceCentreItem {
  centre: ServiceCentre;
  approxDistanceKm: number;
  approxDistanceText: string;
  associatedTechniciansCount: number;
  hasAvailableTechnicians: boolean;
  partsAvailabilitySummary: string;
  hasRequiredParts: boolean;
  score: number;
}

export interface ServiceCentreMatchResult {
  recommended: ServiceCentre | null;
  alternatives: ServiceCentre[];
  allCandidates: MatchedServiceCentreItem[];
  reasonHi: string;
}

/**
 * Match and rank nearby service centres for a farmer's problem.
 */
export function matchServiceCentres(params: {
  machineType: string;
  problemCategory?: string;
  farmerLocation?: FarmerLocation | null;
  requiredPartIds?: string[];
}): ServiceCentreMatchResult {
  const { machineType, problemCategory, farmerLocation, requiredPartIds = [] } = params;
  const centres = getServiceCentres();
  const allTechs = getTechnicians();

  const machineLower = (machineType || "").toLowerCase();
  const problemLower = (problemCategory || "").toLowerCase();

  const evaluated: MatchedServiceCentreItem[] = centres.map((centre) => {
    // 1. Calculate dynamic distance
    let distKm = centre.distanceKm || 3.0;
    let distText = `${distKm.toFixed(1)} किमी`;

    if (farmerLocation?.latitude && farmerLocation?.longitude) {
      distKm = haversineDistanceKm(
        farmerLocation.latitude,
        farmerLocation.longitude,
        centre.location.lat,
        centre.location.lng
      );
      distText = `${distKm.toFixed(1)} किमी`;
    }

    // 2. Check associated technicians
    const associatedTechs = allTechs.filter((t) => centre.associatedTechnicianIds.includes(t.id));
    const availableTechs = associatedTechs.filter((t) => t.available);
    const hasAvailableTechnicians = availableTechs.length > 0;

    // 3. Check parts availability
    const stockedPartIds = centre.stockedParts.filter((p) => p.inStock).map((p) => p.partId);
    const hasRequiredParts =
      requiredPartIds.length > 0
        ? requiredPartIds.some((id) => stockedPartIds.includes(id))
        : stockedPartIds.length > 0;

    const partsAvailabilitySummary =
      centre.stockedParts.length === 0
        ? "पार्ट्स उपलब्ध नहीं"
        : hasRequiredParts
        ? "✓ आवश्यक स्पेयर पार्ट्स स्टॉक में उपलब्ध"
        : "सामान्य स्पेयर पार्ट्स उपलब्ध";

    // 4. Scoring logic (Internal, not exposed as numbers)
    let score = 0;

    // Operating status: Closed centres receive harsh penalty
    if (centre.operatingStatus === "Open") {
      score += 40;
    } else {
      score -= 50;
    }

    // Equipment category match
    const supportsEquipment = centre.equipmentCategories.some((cat) =>
      machineLower.includes(cat.toLowerCase()) || cat.toLowerCase().includes(machineLower)
    );
    if (supportsEquipment) {
      score += 35;
    }

    // Technical capability match
    const matchesCapability = centre.technicalCapabilities.some((cap) =>
      problemLower.includes(cap.toLowerCase()) || cap.toLowerCase().includes(problemLower)
    );
    if (matchesCapability) {
      score += 20;
    }

    // Distance bonus (closer is better, max +25)
    score += Math.max(0, 25 - distKm * 1.5);

    // Available technicians bonus
    if (hasAvailableTechnicians) {
      score += 25;
    } else if (associatedTechs.length > 0) {
      score += 5; // Technicians exist but currently busy
    }

    // Parts availability bonus
    if (hasRequiredParts) {
      score += 20;
    }

    // Verification bonus
    if (centre.verificationStatus === "verified") {
      score += 15;
    } else if (centre.verificationStatus === "pending") {
      score += 5;
    }

    return {
      centre: {
        ...centre,
        distanceKm: distKm,
      },
      approxDistanceKm: distKm,
      approxDistanceText: distText,
      associatedTechniciansCount: associatedTechs.length,
      hasAvailableTechnicians,
      partsAvailabilitySummary,
      hasRequiredParts,
      score,
    };
  });

  // Sort descending by score
  evaluated.sort((a, b) => b.score - a.score);

  // Filter open candidates
  const openCandidates = evaluated.filter((e) => e.centre.operatingStatus === "Open");
  const recommended = openCandidates.length > 0 ? openCandidates[0].centre : null;
  const alternatives = openCandidates.slice(1, 4).map((e) => e.centre);

  let reasonHi = "";
  if (!recommended) {
    reasonHi = "फिलहाल आपके पास कोई खुला सर्विस सेंटर उपलब्ध नहीं है। कृपया डोरस्टेप मैकेनिक विकल्प चुनें।";
  } else {
    reasonHi = `${recommended.nameHi} आपके नजदीकी ${getCentreTypeLabelHi(recommended.centreType).labelHi} है जहां उपयुक्त उपकरण व पार्ट्स उपलब्ध हैं।`;
  }

  return {
    recommended,
    alternatives,
    allCandidates: evaluated,
    reasonHi,
  };
}

/**
 * Get spare parts stocked at a service centre, cross-referenced with catalog.
 */
export function getServiceCentreStockedParts(centreId: string) {
  const centre = getServiceCentreById(centreId);
  if (!centre) return [];

  return centre.stockedParts.map((sp) => {
    const catalogItem = mockSpareParts.find((p) => p.id === sp.partId);
    return {
      ...sp,
      catalogItem,
    };
  });
}

// ─── P3: FPO, Cooperative & Technician Backend Relationship Helpers ─────────

/**
 * Associate a technician with a Service Centre, FPO, or Cooperative.
 */
export function associateTechnicianWithCentre(
  centreId: string,
  technicianId: string,
  role: "employed" | "affiliate" | "on_call_partner" = "affiliate"
): boolean {
  const centres = getServiceCentres();
  const centreIdx = centres.findIndex((c) => c.id === centreId);
  if (centreIdx < 0) return false;

  const centre = centres[centreIdx];
  const associated = new Set(centre.associatedTechnicianIds || []);
  associated.add(technicianId);

  const existingAffiliations = centre.technicianAffiliations || [];
  const updatedAffiliations = [
    ...existingAffiliations.filter((a) => a.technicianId !== technicianId),
    {
      technicianId,
      role,
      assignedDate: new Date().toISOString(),
      isActive: true,
    },
  ];

  centres[centreIdx] = {
    ...centre,
    associatedTechnicianIds: Array.from(associated),
    technicianAffiliations: updatedAffiliations,
  };

  saveServiceCentres(centres);
  return true;
}

/**
 * Disassociate a technician from a Service Centre / FPO.
 */
export function disassociateTechnicianFromCentre(centreId: string, technicianId: string): boolean {
  const centres = getServiceCentres();
  const centreIdx = centres.findIndex((c) => c.id === centreId);
  if (centreIdx < 0) return false;

  const centre = centres[centreIdx];
  const associated = (centre.associatedTechnicianIds || []).filter((id) => id !== technicianId);
  const affiliations = (centre.technicianAffiliations || []).map((a) =>
    a.technicianId === technicianId ? { ...a, isActive: false } : a
  );

  centres[centreIdx] = {
    ...centre,
    associatedTechnicianIds: associated,
    technicianAffiliations: affiliations,
  };

  saveServiceCentres(centres);
  return true;
}

/**
 * Find all Service Centres / FPOs affiliated with a specific technician.
 */
export function getCentresByTechnicianId(technicianId: string): ServiceCentre[] {
  const centres = getServiceCentres();
  return centres.filter((c) => (c.associatedTechnicianIds || []).includes(technicianId));
}

/**
 * Filter Service Centres by organizational type (e.g. "FPO" or "Cooperative").
 */
export function getCentresByOperatingType(orgType: string): ServiceCentre[] {
  const centres = getServiceCentres();
  return centres.filter(
    (c) =>
      c.centreType.toLowerCase() === orgType.toLowerCase() ||
      c.operatingOrgType?.toLowerCase() === orgType.toLowerCase()
  );
}

/**
 * Create or register a new Service Centre / FPO Workshop.
 */
export function createServiceCentre(data: Omit<ServiceCentre, "id">): ServiceCentre {
  const centres = getServiceCentres();
  const newCentre: ServiceCentre = {
    ...data,
    id: `sc-${Date.now().toString().slice(-6)}`,
  };

  saveServiceCentres([...centres, newCentre]);
  return newCentre;
}

