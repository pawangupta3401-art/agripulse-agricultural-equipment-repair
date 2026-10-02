/**
 * Technician Training & Certification Service — P2O Step 3 AgriPulse
 *
 * Implements:
 * 1. Derivation of verification badge (🟢 Verified, 🟡 Pending, 🔴 Expired)
 * 2. Strict separation of self-declared skills vs submitted certs vs verified certs
 * 3. Offline storage & persistence for technician certifications and training
 * 4. Realistic DEMO certification and training records clearly flagged (isDemoRecord: true)
 * 5. Expiry tracking to ensure expired certifications are flagged for renewal
 */

import type {
  TechnicianCertification,
  TechnicianTrainingRecord,
  TechnicianVerificationBadge,
  CertificationStatus,
} from "../types";
import { Technician, mockTechnicians } from "./technicianData";

const TECHNICIANS_STORAGE_KEY = "agripulse_technicians_v2";

/**
 * Check if a certification has passed its expiry date.
 */
export function isCertificationExpired(cert: TechnicianCertification): boolean {
  if (!cert.expiryDate) return false;
  const expiry = new Date(cert.expiryDate);
  const now = new Date();
  return expiry.getTime() < now.getTime();
}

/**
 * Derive technician verification status dynamically from their certifications:
 * 🟢 "verified": Has at least one non-expired verified certification
 * 🔴 "expired": All verified certifications have expired (needs renewal)
 * 🟡 "pending": Only pending/submitted certifications or no certification submitted yet
 */
export function deriveTechnicianVerificationStatus(
  tech: Partial<Technician>
): TechnicianVerificationBadge {
  const certs = tech.certifications || [];
  if (certs.length === 0) {
    return "pending";
  }

  const verifiedCerts = certs.filter((c) => c.verificationStatus === "verified");

  if (verifiedCerts.length === 0) {
    // Only pending or unverified submissions exist
    return "pending";
  }

  const hasValidActiveCert = verifiedCerts.some((c) => !isCertificationExpired(c));
  if (hasValidActiveCert) {
    return "verified";
  }

  // All verified certificates are expired
  return "expired";
}

/**
 * Get Hindi UI display details for verification status.
 */
export function getVerificationBadgeDisplay(status?: TechnicianVerificationBadge): {
  labelHi: string;
  fullLabelHi: string;
  statusBadge: string;
  icon: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
} {
  switch (status) {
    case "verified":
      return {
        labelHi: "प्रमाणित",
        fullLabelHi: "🟢 प्रमाणित मैकेनिक (Verified)",
        statusBadge: "🟢 प्रमाणित",
        icon: "🟢",
        bgClass: "bg-emerald-100",
        borderClass: "border-emerald-300",
        textClass: "text-emerald-900",
      };
    case "expired":
      return {
        labelHi: "प्रमाणन समाप्त",
        fullLabelHi: "🔴 प्रमाणन समाप्त / नवीनीकरण आवश्यक",
        statusBadge: "🔴 प्रमाणन समाप्त",
        icon: "🔴",
        bgClass: "bg-red-100",
        borderClass: "border-red-300",
        textClass: "text-red-900",
      };
    case "pending":
    default:
      return {
        labelHi: "सत्यापन प्रक्रियाधीन",
        fullLabelHi: "🟡 सत्यापन प्रक्रियाधीन (Pending)",
        statusBadge: "🟡 सत्यापन प्रक्रियाधीन",
        icon: "🟡",
        bgClass: "bg-amber-100",
        borderClass: "border-amber-300",
        textClass: "text-amber-900",
      };
  }
}

// In-memory cache for server-side / test environments
let inMemoryTechnicians: Technician[] | null = null;

export function getTechnicians(): Technician[] {
  if (typeof window === "undefined") {
    if (!inMemoryTechnicians) {
      inMemoryTechnicians = mockTechnicians.map((t) => ({
        ...t,
        verificationStatus: deriveTechnicianVerificationStatus(t),
      }));
    }
    return inMemoryTechnicians;
  }

  try {
    const raw = localStorage.getItem(TECHNICIANS_STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Technician[];
      return stored.map((t) => ({
        ...t,
        verificationStatus: deriveTechnicianVerificationStatus(t),
      }));
    }
  } catch {
    // Fall back safely
  }

  // Seed with mock technicians
  const seeded = mockTechnicians.map((t) => ({
    ...t,
    verificationStatus: deriveTechnicianVerificationStatus(t),
  }));

  try {
    localStorage.setItem(TECHNICIANS_STORAGE_KEY, JSON.stringify(seeded));
  } catch {
    // LocalStorage quota or safe mode
  }

  return seeded;
}

/**
 * Save updated technicians list locally.
 */
export function saveTechnicians(technicians: Technician[]): void {
  inMemoryTechnicians = technicians;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(TECHNICIANS_STORAGE_KEY, JSON.stringify(technicians));
  } catch {
    // Safe fallback
  }
}

/**
 * Get technician by ID.
 */
export function getTechnicianById(techId: string): Technician | undefined {
  const techs = getTechnicians();
  return techs.find((t) => t.id === techId);
}

/**
 * Submit a new certification for verification review.
 * SECURITY: Status is strictly "pending". Technicians cannot self-verify.
 */
export function submitTechnicianCertification(
  techId: string,
  certData: {
    certificationName: string;
    category: string;
    issuingOrganization: string;
    certificationLevel: "Basic" | "Advanced" | "Master";
    issueDate: string;
    expiryDate?: string;
    certificateNumber?: string;
  }
): TechnicianCertification | null {
  const techs = getTechnicians();
  const tech = techs.find((t) => t.id === techId);
  if (!tech) return null;

  const newCert: TechnicianCertification = {
    id: `cert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...certData,
    verificationStatus: "pending", // Strictly pending until audited
    isDemoRecord: true,
  };

  const updatedCerts = [...(tech.certifications || []), newCert];
  tech.certifications = updatedCerts;
  tech.verificationStatus = deriveTechnicianVerificationStatus(tech);

  saveTechnicians(techs);
  return newCert;
}

/**
 * Add a self-declared skill.
 * SECURITY: Stored in selfDeclaredSkills separately from verified technical skills.
 */
export function addSelfDeclaredSkill(techId: string, skill: string): string[] | null {
  const techs = getTechnicians();
  const tech = techs.find((t) => t.id === techId);
  if (!tech) return null;

  const current = tech.selfDeclaredSkills || [];
  if (!current.includes(skill)) {
    tech.selfDeclaredSkills = [...current, skill];
    saveTechnicians(techs);
  }
  return tech.selfDeclaredSkills || [];
}
