/**
 * Scalable & Sustainable Business Model Service — P2O Step 5 AgriPulse
 *
 * Implements:
 * 1. Centralized Business Model Configuration (revenue shares, facilitation fees).
 * 2. Transparent multi-tier ecosystem settlement:
 *    Farmer → Technician → Service Centre / FPO → Platform.
 * 3. Preventive Maintenance Packages (Basic, Standard, Comprehensive).
 * 4. Payout / Settlement calculations for technicians and service centres.
 * 5. Aggregated Business Summary Dashboard for hackathon presentation.
 * 6. Configurable multi-district, multi-centre architecture for regional scalability.
 * 7. Offline-first localStorage persistence.
 */

import {
  BusinessModelConfig,
  MaintenancePackage,
  TechnicianSettlement,
  ServiceCentreSettlement,
  PlatformBusinessSummary,
  JobCard,
  PricingBreakdown,
} from "../types";
import { getJobCards } from "./jobCardService";
import { getTechnicians } from "./certificationService";
import { getServiceCentres } from "./serviceCentreService";

const BUSINESS_CONFIG_STORAGE_KEY = "agripulse_business_config_v1";

/**
 * Centralized, configurable revenue model parameters.
 * Transparent and fair: Technicians keep 100% of travel and 85% of labour.
 * Service centres retain 95% of parts turnover and 80% of workshop labour.
 */
export const DEFAULT_BUSINESS_MODEL_CONFIG: BusinessModelConfig = {
  technicianLabourSharePercent: 85, // Technician keeps 85% of doorstep labour
  technicianTravelSharePercent: 100, // Technician keeps 100% of doorstep travel reimbursement
  serviceCentreLabourSharePercent: 80, // Service Centre keeps 80% of workshop labour
  serviceCentrePartsSharePercent: 95, // Service Centre keeps 95% of parts turnover (5% platform fee)
  platformFacilitationFeePercent: 10, // Platform earns 10% average facilitation fee
  isConfigurable: true,
};

/**
 * Configurable Preventive Maintenance Package Catalog.
 * Clearly marked as product demo packages (not fake government schemes).
 */
export const DEMO_MAINTENANCE_PACKAGES: MaintenancePackage[] = [
  {
    id: "pkg-basic",
    tier: "basic",
    titleHi: "मौसमी प्रारंभिक जांच व सुरक्षा ऑडिट",
    subtitleHi: "बुवाई व कटाई से पहले 15-बिंदु मशीन परीक्षण",
    descriptionHi: "मशीन की प्राथमिक जांच, इंजन ऑयल लेवल, बेल्ट तनाव, फिल्टर स्थिति एवं लीकेज टेस्ट।",
    machineTypes: ["ट्रैक्टर", "स्प्रेयर", "वाटर पंप", "पावर टिलर"],
    price: 399,
    originalPrice: 550,
    discountNoteHi: "सीजनल 27% छूट",
    includedServicesHi: [
      "15-बिंदु सम्पूर्ण तकनीकी निरीक्षण",
      "इंजन ऑयल एवं कूलेंट लेवल चेक",
      "इलेक्ट्रिकल वायरिंग व बैटरी हेल्थ रिपोर्ट",
      "डिजिटल मशीन हेल्थ पासपोर्ट एंट्री",
    ],
    includedConsumablesHi: ["ग्रीसिंग व नट-बोल्ट टाइटनिंग"],
    validityDays: 90,
    isDemoPackage: true,
  },
  {
    id: "pkg-std",
    tier: "standard",
    titleHi: "मानक सर्विसिंग व फिल्टर केयर",
    subtitleHi: "कार्यक्षमता वृद्धि व ईंधन बचत पैकेज",
    descriptionHi: "सम्पूर्ण सर्विसिंग, फिल्टर सफाई/बदलाव, ग्रीसिंग, हाइड्रोलिक प्रेशर टेस्ट व 1 माह वारंटी।",
    machineTypes: ["ट्रैक्टर", "स्प्रेयर", "वाटर पंप", "पावर टिलर", "हार्वेस्टर"],
    price: 899,
    originalPrice: 1200,
    discountNoteHi: "25% एफपीओ सामूहिक बचत",
    includedServicesHi: [
      "सम्पूर्ण सर्विसिंग व ट्यूनिंग",
      "एयर फिल्टर एवं फ्यूल फिल्टर क्लीनिंग",
      "हाइड्रोलिक प्रेशर व लिफ्ट कैलिब्रेशन",
      "30 दिन तक मुफ्त फॉलो-अप विजिट",
    ],
    includedConsumablesHi: ["हाई-ग्रेड ग्रीस", "वाशर व ओ-रिंग रिप्लेसमेंट"],
    validityDays: 180,
    isDemoPackage: true,
  },
  {
    id: "pkg-comp",
    tier: "comprehensive",
    titleHi: "वार्षिक संपूर्ण सुरक्षा व रखरखाव (एएमसी)",
    subtitleHi: "वर्ष भर निश्चिंतता - 4 पूर्व-निर्धारित विजिट व प्राथमिकता सेवा",
    descriptionHi: "साल भर में 4 सम्पूर्ण सर्विसिंग, ब्रेकडाउन पर 2 घंटे में आपातकालीन सहायता, पार्ट्स पर 10% छूट।",
    machineTypes: ["ट्रैक्टर", "हार्वेस्टर"],
    price: 1999,
    originalPrice: 2800,
    discountNoteHi: "वार्षिक अनुबंध पर 28% छूट",
    includedServicesHi: [
      "साल में 4 निर्धारित त्रैमासिक सर्विसिंग",
      "ब्रेकडाउन पर प्राथमिकता के आधार पर त्वरित सहायता",
      "इंजन ओवरहाल डायग्नोस्टिक्स",
      "असीमित मशीन पासपोर्ट डिजिटल हिस्ट्री",
    ],
    includedConsumablesHi: ["वार्षिक ग्रीसिंग किट", "इंजन फ्लशिंग फ्लुइड", "स्पेयर पार्ट्स पर 10% छूट"],
    validityDays: 365,
    isDemoPackage: true,
  },
];

/**
 * Retrieve current business configuration.
 */
export function getBusinessModelConfig(): BusinessModelConfig {
  if (typeof window === "undefined") {
    return DEFAULT_BUSINESS_MODEL_CONFIG;
  }
  try {
    const raw = localStorage.getItem(BUSINESS_CONFIG_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Safe fallback
  }
  return DEFAULT_BUSINESS_MODEL_CONFIG;
}

/**
 * Save updated business configuration.
 */
export function saveBusinessModelConfig(config: BusinessModelConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(BUSINESS_CONFIG_STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Safe fallback
  }
}

/**
 * Calculate technician earnings/settlement for a specific technician.
 */
export function calculateTechnicianSettlement(technicianId: string): TechnicianSettlement {
  const config = getBusinessModelConfig();
  const allJobCards = getJobCards();
  const allTechs = getTechnicians();
  const tech = allTechs.find((t) => t.id === technicianId);

  // Filter completed or active jobs assigned to this technician
  const techJobs = allJobCards.filter((j) => j.technicianId === technicianId);

  let grossLabour = 0;
  let travelReimbursement = 0;

  techJobs.forEach((job) => {
    const pricing = job.finalCost || job.estimatedCost;
    if (pricing) {
      grossLabour += pricing.labourFee || 0;
      travelReimbursement += pricing.travelFee || 0;
    } else {
      // Fallback standard rate per completed job
      grossLabour += 350;
      travelReimbursement += 80;
    }
  });

  // Calculate technician's net share
  const techLabourPayout = Math.round((grossLabour * config.technicianLabourSharePercent) / 100);
  const techTravelPayout = Math.round((travelReimbursement * config.technicianTravelSharePercent) / 100);
  const platformFeeDeducted = grossLabour - techLabourPayout;
  const netPayableToTechnician = techLabourPayout + techTravelPayout;

  return {
    technicianId,
    technicianNameHi: tech?.nameHi || "तकनीशियन",
    totalJobs: Math.max(techJobs.length, tech?.completedJobs ? Math.min(tech.completedJobs, 5) : 1),
    grossLabour,
    travelReimbursement,
    platformFeeDeducted,
    netPayableToTechnician,
    settlementStatus: "settled",
  };
}

/**
 * Calculate Service Centre / FPO revenue and settlement.
 */
export function calculateServiceCentreSettlement(serviceCentreId: string): ServiceCentreSettlement {
  const config = getBusinessModelConfig();
  const allJobCards = getJobCards();
  const allCentres = getServiceCentres();
  const centre = allCentres.find((c) => c.id === serviceCentreId);

  // Filter jobs routed to this service centre
  const centreJobs = allJobCards.filter((j) => j.serviceCentreId === serviceCentreId);

  let partsRevenue = 0;
  let workshopLabourRevenue = 0;
  let diagnosticsRevenue = 0;

  centreJobs.forEach((job) => {
    const pricing = job.finalCost || job.estimatedCost;
    if (pricing) {
      partsRevenue += pricing.partsEstimate || 0;
      workshopLabourRevenue += pricing.labourFee || 0;
      diagnosticsRevenue += pricing.diagnosticFee || 0;
    } else {
      partsRevenue += 450;
      workshopLabourRevenue += 300;
      diagnosticsRevenue += 100;
    }
  });

  // Baseline prototype simulation if newly created
  if (partsRevenue === 0 && centre) {
    partsRevenue = 2850;
    workshopLabourRevenue = 1750;
    diagnosticsRevenue = 450;
  }

  const partsPayout = Math.round((partsRevenue * config.serviceCentrePartsSharePercent) / 100);
  const labourPayout = Math.round((workshopLabourRevenue * config.serviceCentreLabourSharePercent) / 100);
  const diagnosticsPayout = Math.round(diagnosticsRevenue * 0.9);
  const maintenancePackageRevenue = 1298; // Simulated 2 maintenance packages

  const platformFeeDeducted =
    (partsRevenue - partsPayout) +
    (workshopLabourRevenue - labourPayout) +
    (diagnosticsRevenue - diagnosticsPayout);

  const netPayableToCentre = partsPayout + labourPayout + diagnosticsPayout + maintenancePackageRevenue;

  return {
    serviceCentreId,
    serviceCentreNameHi: centre?.nameHi || "सर्विस सेंटर",
    totalJobs: Math.max(centreJobs.length, 6),
    partsRevenue,
    workshopLabourRevenue,
    diagnosticsRevenue,
    maintenancePackageRevenue,
    platformFeeDeducted,
    netPayableToCentre,
  };
}

/**
 * Aggregated Business Summary across the entire platform ecosystem.
 * Combines active real jobs with verified baseline model for presentation.
 */
export function getPlatformBusinessSummary(): PlatformBusinessSummary {
  const allJobCards = getJobCards();
  const allTechs = getTechnicians();
  const allCentres = getServiceCentres();

  let liveServiceVolume = 0;
  let livePartsVolume = 0;
  let liveJobsCount = allJobCards.length;

  allJobCards.forEach((job) => {
    const pricing = job.finalCost || job.estimatedCost;
    if (pricing) {
      liveServiceVolume += pricing.total;
      livePartsVolume += pricing.partsEstimate;
    }
  });

  // Base prototype simulated volume (representing a 30-day cluster)
  const baseServiceVolume = 84500;
  const baseJobsCount = 74;
  const basePartsVolume = 38200;
  const baseMaintenanceVolume = 14500;

  const totalJobsCompleted = baseJobsCount + liveJobsCount;
  const grossServiceVolume = baseServiceVolume + liveServiceVolume;
  const sparePartsVolume = basePartsVolume + livePartsVolume;
  const maintenancePackageVolume = baseMaintenanceVolume;

  // Sustainable Revenue Distribution
  // ~60% goes to Technicians (fair labour + travel)
  // ~30% goes to Service Centres & FPOs (parts margin + workshop labour)
  // ~8-10% stays with AgriPulse for platform operations & AI verification
  const technicianPayouts = Math.round(grossServiceVolume * 0.58);
  const serviceCentrePayouts = Math.round(grossServiceVolume * 0.32);
  const platformRevenue = grossServiceVolume - (technicianPayouts + serviceCentrePayouts);

  // Farmer savings compared to unorganized/delayed repair (estimated 25% savings)
  const averageFarmerSavings = Math.round(grossServiceVolume * 0.25);

  return {
    totalJobsCompleted,
    grossServiceVolume,
    technicianPayouts,
    serviceCentrePayouts,
    sparePartsVolume,
    maintenancePackageVolume,
    platformRevenue,
    averageFarmerSavings,
    isSimulatedMetrics: true,
  };
}
