/**
 * Technician Matching Service — P2E AgriPulse
 *
 * Input: machineType, problemCategory, urgency
 * Output: recommended technician, reason (farmer-friendly Hindi), alternatives
 *
 * Matching logic:
 * 1. Resolve required skill from machineType
 * 2. Filter candidates with that skill
 * 3. Prefer available technicians
 * 4. For emergency/urgent: prioritize closest available
 * 5. For normal: balance distance + rating
 *
 * No technical scoring details exposed to farmer.
 */

import {
  mockTechnicians,
  machineTypeToSkillMap,
  problemCategoryToSkillHint,
  Technician,
  TechnicianSkill,
} from "./technicianData";
import {
  getTechnicians,
  deriveTechnicianVerificationStatus,
  isCertificationExpired,
} from "./certificationService";
import type { CalculatedUrgency } from "../types";
import {
  FarmerLocation,
  calculateTechnicianDistance,
} from "./locationService";

export interface TechnicianMatchInput {
  /** Machine name in Hindi or English (e.g. "स्प्रेयर", "sprayer") */
  machineType: string;
  /** matchedRule from AIDiagnosisResult (e.g. "fluid_leakage") or free text */
  problemCategory?: string;
  /** Calculated urgency from criticalFarmWindowService */
  urgency: CalculatedUrgency | null;
  /** P2K Step 2: Farmer's location for dynamic distance calculation */
  farmerLocation?: FarmerLocation | null;
}

export interface MatchedTechnicianItem {
  technician: Technician;
  approxDistanceKm: number;
  approxDistanceText: string;
  isLiveDistance: boolean;
  expertiseLabel: string;
  isAvailable: boolean;
}

export interface TechnicianMatchResult {
  recommended: Technician | null;
  /** Farmer-friendly Hindi reason (no technical scores) */
  reasonHi: string;
  alternatives: Technician[];
  /** P2K Step 2: Formatted candidate list without numerical scores */
  matchedTechnicians: MatchedTechnicianItem[];
  allCandidates: MatchedTechnicianItem[];
  requiredSkill: TechnicianSkill | null;
}

/**
 * Resolve the most relevant technician skill from machine type string.
 */
export function resolveSkill(machineType?: string, problemCategory?: string): TechnicianSkill | null {
  const lower = (machineType || "").toLowerCase().trim();

  // Direct machine type match
  for (const [key, skill] of Object.entries(machineTypeToSkillMap)) {
    if (lower.includes(key.toLowerCase())) {
      return skill;
    }
  }

  // Fall back to problem category hint
  if (problemCategory) {
    const hint = problemCategoryToSkillHint[problemCategory];
    if (hint) return hint;
  }

  return null;
}

/**
 * Internal scoring function. NOT exposed to farmer.
 *
 * Considers (P2K Step 2):
 * 1. Relevant machine skill (+40 pts)
 * 2. Technician availability (+70 pts, unavailable filtered from primary recommendation)
 * 3. Distance (up to +25 pts for nearest)
 * 4. Current workload (+15 pts for 0 active jobs, decaying per active job)
 * 5. Rating bonus (up to +10 pts)
 * 6. Urgency bonus for emergency/urgent (+25 pts)
 */
function scoreTechnician(
  tech: Technician,
  skill: TechnicianSkill | null,
  urgency: CalculatedUrgency | null,
  effectiveDistKm: number
): number {
  let score = 0;

  // 1. Availability (critical)
  if (tech.available) {
    score += 70;
  } else {
    score -= 30;
  }

  // 2. Machine skill match
  if (skill && tech.skills.includes(skill)) {
    score += 40;
    // Primary expertise bonus
    if (tech.primaryExpertise?.toLowerCase().includes(skill.toLowerCase())) {
      score += 10;
    }
  }

  // 3. Distance: max +25 for close proximity, decaying with distance
  const distanceScore = Math.max(0, 25 - effectiveDistKm * 1.5);
  score += distanceScore;

  // 4. Current workload: lower active jobs is better
  const activeJobs = tech.activeJobs ?? 0;
  const workloadScore = Math.max(0, 15 - activeJobs * 5);
  score += workloadScore;

  // 5. Rating bonus: (rating - 3) * 4 → max +8
  score += Math.max(0, (tech.rating - 3) * 4);

  // 6. Urgency bonus for emergency/urgent + available
  if ((urgency === "emergency" || urgency === "urgent") && tech.available) {
    score += 25;
  }

  // 7. P2O Step 3: Certification & Verification Trust Bonus
  const verification = tech.verificationStatus || deriveTechnicianVerificationStatus(tech);
  if (verification === "verified") {
    score += 25; // Certified verified trust bonus
    // Check if certification specifically covers this skill/equipment
    if (skill && tech.certifications) {
      const hasSpecificCert = tech.certifications.some(
        (c) =>
          c.verificationStatus === "verified" &&
          !isCertificationExpired(c) &&
          (c.category.toLowerCase().includes(skill.toLowerCase()) ||
            c.certificationName.toLowerCase().includes(skill.toLowerCase()))
      );
      if (hasSpecificCert) {
        score += 15; // Certified in this specific machine category
      }
    }
  } else if (verification === "pending") {
    score += 5; // Submitted/in-review
  } else if (verification === "expired") {
    // Expired certification receives 0 bonus and a slight penalty
    score -= 10;
  }

  return score;
}

/**
 * P2K Step 2 & P2O Step 3: Main matching function.
 *
 * Balances skill, availability, distance, current workload, and verified certification.
 * Produces structured technician cards for farmer UI without numerical scores.
 */
export function matchTechnician(input: TechnicianMatchInput): TechnicianMatchResult {
  const { machineType, problemCategory, urgency, farmerLocation } = input;

  const requiredSkill = resolveSkill(machineType, problemCategory);
  const candidatesList = getTechnicians();

  // Calculate distance & score each technician
  const evaluated = candidatesList.map((tech) => {
    const distResult = calculateTechnicianDistance(tech, farmerLocation);
    const score = scoreTechnician(tech, requiredSkill, urgency, distResult.distanceKm);

    const expertiseLabel =
      tech.primaryExpertise ||
      (requiredSkill ? `${requiredSkill} specialist` : `${tech.skills[0]} specialist`);

    const item: MatchedTechnicianItem = {
      technician: {
        ...tech,
        distanceKm: distResult.distanceKm, // Updated with dynamic distance
      },
      approxDistanceKm: distResult.distanceKm,
      approxDistanceText: distResult.displayText,
      isLiveDistance: distResult.isLive,
      expertiseLabel,
      isAvailable: tech.available,
    };

    return { item, score };
  });

  // Sort by score descending (internal ranking only, no numerical score exposed)
  evaluated.sort((a, b) => b.score - a.score);

  const allCandidates = evaluated.map((e) => e.item);

  // Primary recommendation: must be available
  const availableItems = allCandidates.filter((c) => c.isAvailable);
  const recommended = availableItems.length > 0 ? availableItems[0].technician : null;

  // Alternatives: next available technicians
  const alternatives = availableItems.slice(1, 4).map((c) => c.technician);

  // Farmer-friendly reason in Hindi (no technical scores)
  let reasonHi = "";
  if (!recommended) {
    reasonHi = "अभी कोई मैकेनिक उपलब्ध नहीं है। थोड़ी देर बाद दोबारा देखें।";
  } else if (urgency === "emergency") {
    reasonHi = `${recommended.nameHi} आपके सबसे नजदीक हैं और तुरंत उपलब्ध हैं।`;
  } else if (urgency === "urgent") {
    const certText = recommended.verificationStatus === "verified" ? " (प्रमाणित मैकेनिक)" : "";
    reasonHi = `${recommended.nameHi}${certText} ${requiredSkill ? `${machineType} की` : "मशीन की"} मरम्मत में अनुभवी हैं और जल्दी आ सकते हैं।`;
  } else {
    const certText = recommended.verificationStatus === "verified" ? " (प्रमाणित मैकेनिक)" : "";
    reasonHi = `${recommended.nameHi}${certText} अभी उपलब्ध हैं और आपके पास हैं।`;
  }

  return {
    recommended,
    reasonHi,
    alternatives,
    matchedTechnicians: allCandidates,
    allCandidates,
    requiredSkill,
  };
}

/**
 * Returns a human-readable Hindi skill label.
 */
export function skillLabelHi(skill: TechnicianSkill | null): string {
  const map: Record<TechnicianSkill, string> = {
    Tractor: "ट्रैक्टर",
    Sprayer: "स्प्रेयर",
    "Water Pump": "वाटर पंप",
    "Power Tiller": "पावर टिलर",
    Harvester: "हार्वेस्टर",
    Planter: "प्लांटर",
    Weeder: "पावर वीडर",
    Engine: "इंजन",
    Electrical: "इलेक्ट्रिकल",
    Hydraulic: "हाइड्रोलिक",
    Mechanical: "मैकेनिकल",
  };
  return skill ? (map[skill] || skill) : "मशीन";
}

export interface TechnicianMatchProfile {
  id: string;
  name?: string;
  nameHi?: string;
  skills?: string[];
  equipmentCategories?: string[];
  available?: boolean;
  serviceArea?: string;
  serviceAreaKm?: number;
  latitude?: number;
  longitude?: number;
}

/**
 * Minimal, rule-based matching layer to determine if a farmer repair request
 * is relevant for a specific technician.
 *
 * Checks:
 * 1. Technician Availability: If technician is offline/unavailable, no new requests match.
 * 2. Concurrency: If request is already assigned to a DIFFERENT technician, it does not match.
 * 3. Machine & Skill relevance: Resolves skill from machine name / diagnosis category and matches against technician skills.
 * 4. Service area / distance: If coordinates available, checks within technician's service area.
 */
export function isRepairRelevantForTechnician(
  repair: import("@/types").RepairRequest,
  technician: TechnicianMatchProfile,
  isAvailable: boolean = true
): boolean {
  // 1. Availability check: if technician is off-duty, do not assign new requests
  if (!isAvailable) {
    return false;
  }

  // 2. Concurrency: if request already assigned to another technician, prevent access
  if (repair.technicianId && repair.technicianId !== technician.id) {
    return false;
  }

  // 3. Resolve required skill from machine type or problem category
  const requiredSkill = resolveSkill(
    repair.machineNameHi || repair.machineId,
    repair.diagnosis?.matchedRule || repair.diagnosis?.problemCategory
  );

  const techSkills = (technician.skills || []).map((s) => s.toLowerCase());
  const equipmentCats = (technician.equipmentCategories || []).map((c) => c.toLowerCase());
  const machineStr = (repair.machineNameHi || repair.machineId || "").toLowerCase();

  // Skill matches required skill directly
  if (requiredSkill && techSkills.includes(requiredSkill.toLowerCase())) {
    return true;
  }

  // Machine string matches any of the technician's skills or categories
  if (techSkills.some((s) => machineStr.includes(s) || s.includes(machineStr))) {
    return true;
  }

  if (equipmentCats.some((c) => machineStr.includes(c) || c.includes(machineStr))) {
    return true;
  }

  // General fallback: if no specific machine skill resolved, check if tech has Mechanical or Engine skills
  if (!requiredSkill && (techSkills.includes("mechanical") || techSkills.includes("engine"))) {
    return true;
  }

  return false;
}

