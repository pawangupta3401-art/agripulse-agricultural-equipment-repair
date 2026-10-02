/**
 * Technician Training & Certification Backend Service — AgriPulse
 *
 * Implements:
 * 1. Agricultural Machinery Training Module Catalog (Tractor, Hydraulic, Sprayer, Pump, Tiller).
 * 2. Technician Enrollment, progress tracking, and score assessment.
 * 3. Automatic certification issuance upon passing module examinations.
 * 4. Verification state machine (pending -> verified / rejected / expired).
 * 5. Direct integration with technicianMatchingService via skill & category matrix.
 */

import {
  TrainingModule,
  TechnicianTrainingEnrollment,
  TechnicianCertification,
  CertificationStatus,
} from "@/types";
import { getTechnicians, saveTechnicians } from "./certificationService";
import { Technician } from "./technicianData";

// ─── Master Training Module Catalog ──────────────────────────────────────────

export const MASTER_TRAINING_MODULES: TrainingModule[] = [
  {
    id: "mod-trac-01",
    title: "Tractor Diesel Engine Overhaul & Diagnostics",
    titleHi: "ट्रैक्टर डीजल इंजन ओवरहाल एवं डायग्नोस्टिक्स",
    descriptionHi: "डीजल इंजन की सम्पूर्ण आंतरिक कार्यप्रणाली, संपीडन परीक्षण, इंजेक्टर व नोजल कैलिब्रेशन, टर्बोचार्जर और ओवरहीटिंग निवारण।",
    category: "Engine & Powertrain",
    equipmentCategory: "Tractor",
    durationHours: 30,
    passingScore: 75,
    topicsHi: [
      "सिलेंडर हेड व वाल्व टाइमिंग समायोजन",
      "डीजल इंजेक्शन पंप (FIP) प्रेशर टेस्टिंग",
      "इंजन ऑयल सर्कुलेशन एवं रेडिएटर कूलिंग सर्किट",
      "क्रैंकशाफ्ट व पिस्टन रिंग टॉर्क विनिर्देश",
    ],
    certificationAwardedId: "cert-tractor-master",
  },
  {
    id: "mod-hyd-02",
    title: "Agricultural Hydraulic Systems & 3-Point Linkage",
    titleHi: "कृषि हाइड्रोलिक सिस्टम एवं 3-पॉइंट लिंकेज मरम्मत",
    descriptionHi: "हाइड्रोलिक पंप, स्पूल कंट्रोल वाल्व, हाइड्रोलिक सिलेंडर सील रिप्लेसमेंट और लिफ्ट ड्राफ्ट सेंसिंग का कैलिब्रेशन।",
    category: "Hydraulics",
    equipmentCategory: "Tractor",
    durationHours: 20,
    passingScore: 70,
    topicsHi: [
      "हाइड्रोलिक प्रेशर गेज टेस्टिंग (180-210 Bar)",
      "कंट्रोल वाल्व ओ-रिंग व सील किट बदलाव",
      "हाइड्रोलिक ऑयल ग्रेड एवं सक्शन स्ट्रेनर सफाई",
      "लिफ्ट सेंसिंग व पोजीशन कंट्रोल आर्म सेटिंग",
    ],
    certificationAwardedId: "cert-hydraulic-spec",
  },
  {
    id: "mod-spry-03",
    title: "Power Sprayer Maintenance & Pressure Calibration",
    titleHi: "पावर स्प्रेयर मेंटेनेंस एवं प्रेशर कैलिब्रेशन",
    descriptionHi: "एचटीपी हॉरिजॉन्टल ट्रिपल पिस्टन पंप, डायाफ्राम नोजल, प्रेशर रेगुलेटर और रासायनिक जंग से बचाव के मानक।",
    category: "Sprayer & Protection",
    equipmentCategory: "Sprayer",
    durationHours: 15,
    passingScore: 70,
    topicsHi: [
      "एचटीपी पिस्टन सील व पैकिंग रिप्लेसमेंट",
      "प्रेशर रिलीफ वाल्व एवं पल्सेशन डैम्पर चार्जिंग",
      "नोजल वियर टेस्ट व स्प्रे पैटर्न एकरूपता",
      "2-स्ट्रोक इंजन कार्बोरेटर ट्यूनिंग",
    ],
    certificationAwardedId: "cert-sprayer-pro",
  },
  {
    id: "mod-pump-04",
    title: "Centrifugal & Submersible Pump Mechanical Seals",
    titleHi: "सेंट्रीफ्यूगल व सबमर्सिबल पंप मैकेनिकल सील एवं मोटर",
    descriptionHi: "कृषि बोरवेल व खुले कुएं के पंपों में इम्पेलर घिसाव, कार्बन-सिरेमिक मैकेनिकल सील, प्राइमिंग फॉल्ट्स और मोटर वाइंडिंग सुरक्षा।",
    category: "Water Pump",
    equipmentCategory: "Water Pump",
    durationHours: 18,
    passingScore: 70,
    topicsHi: [
      "मैकेनical शाफ्ट सील असेंबली व अलाइनमेंट",
      "इम्पेलर वियर रिंग क्लीयरेंस और कैविटेशन जांच",
      "सक्शन पाइप फुट वाल्व एयर-लॉक पहचान",
      "कैपेसिटर एवं ओवरलोड रिले सेटिंग",
    ],
    certificationAwardedId: "cert-pump-spec",
  },
  {
    id: "mod-till-05",
    title: "Power Tiller & Rotary Weeder Transmission",
    titleHi: "पावर टिलर एवं रोटरी वीडर गियरबॉक्स ट्रांसमिशन",
    descriptionHi: "पावर टिलर मुख्य क्लच, साइड क्लच स्टीयरिंग, गियरबॉक्स बीयरिंग, और रोटरी ब्लेड शाफ्ट रिपेयर।",
    category: "Tiller & Weeder",
    equipmentCategory: "Power Tiller",
    durationHours: 16,
    passingScore: 70,
    topicsHi: [
      "ड्राई फ्रिक्शन क्लच प्लेट रिप्लेसमेंट",
      "चेन ड्राइव व वी-बेल्ट टेंशनिंग प्रक्रिया",
      "रोटरी टाइन ब्लेड ओरिएंटेशन व लॉकिंग",
      "स्टीयरing डॉग क्लच समायोजन",
    ],
    certificationAwardedId: "cert-tiller-pro",
  },
];

// In-memory / storage enrollments
const ENROLLMENTS_STORAGE_KEY = "agripulse_training_enrollments_v1";

function getStoredEnrollments(): TechnicianTrainingEnrollment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ENROLLMENTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredEnrollments(enrollments: TechnicianTrainingEnrollment[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ENROLLMENTS_STORAGE_KEY, JSON.stringify(enrollments));
  } catch {}
}

/**
 * Retrieve all available training modules, optionally filtered by equipment category.
 */
export function getTrainingModules(equipmentCategory?: string): TrainingModule[] {
  if (!equipmentCategory) return MASTER_TRAINING_MODULES;
  return MASTER_TRAINING_MODULES.filter(
    (m) =>
      m.equipmentCategory.toLowerCase() === equipmentCategory.toLowerCase() ||
      m.equipmentCategory === "All"
  );
}

/**
 * Enroll a technician in a training module.
 */
export function enrollTechnicianInModule(
  technicianId: string,
  moduleId: string
): TechnicianTrainingEnrollment {
  const allEnrollments = getStoredEnrollments();
  const existing = allEnrollments.find(
    (e) => e.technicianId === technicianId && e.moduleId === moduleId
  );
  if (existing) return existing;

  const newEnrollment: TechnicianTrainingEnrollment = {
    id: `enr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    technicianId,
    moduleId,
    status: "in_progress",
    enrolledAt: new Date().toISOString(),
  };

  saveStoredEnrollments([...allEnrollments, newEnrollment]);
  return newEnrollment;
}

/**
 * Record examination score and issue certificate if passed.
 * Automatically updates technician profile and verification status in technician registry!
 */
export function recordModuleCompletion(
  technicianId: string,
  moduleId: string,
  scorePercentage: number
): {
  enrollment: TechnicianTrainingEnrollment;
  passed: boolean;
  certification?: TechnicianCertification;
} {
  const mod = MASTER_TRAINING_MODULES.find((m) => m.id === moduleId);
  if (!mod) {
    throw new Error(`Module ${moduleId} not found`);
  }

  const passed = scorePercentage >= mod.passingScore;
  const allEnrollments = getStoredEnrollments();
  const existingIdx = allEnrollments.findIndex(
    (e) => e.technicianId === technicianId && e.moduleId === moduleId
  );

  const certNumber = `AGRI-CERT-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 900 + 100)}`;

  let updatedEnrollment: TechnicianTrainingEnrollment;

  if (existingIdx >= 0) {
    updatedEnrollment = {
      ...allEnrollments[existingIdx],
      status: passed ? "completed" : "failed",
      completedAt: new Date().toISOString(),
      scorePercentage,
      certificateAwardedNumber: passed ? certNumber : undefined,
    };
    allEnrollments[existingIdx] = updatedEnrollment;
  } else {
    updatedEnrollment = {
      id: `enr-${Date.now()}`,
      technicianId,
      moduleId,
      status: passed ? "completed" : "failed",
      enrolledAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      scorePercentage,
      certificateAwardedNumber: passed ? certNumber : undefined,
    };
    allEnrollments.push(updatedEnrollment);
  }

  saveStoredEnrollments(allEnrollments);

  let newCert: TechnicianCertification | undefined;

  if (passed) {
    // Add verified certification to technician
    const issueDate = new Date().toISOString().split("T")[0];
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 2); // 2 years validity
    const expiryDate = expiry.toISOString().split("T")[0];

    newCert = {
      id: `cert-${Date.now()}`,
      certificationName: `${mod.titleHi} (${mod.title})`,
      category: mod.category,
      issuingOrganization: "AgriPulse Krishi Kaushal Vikas Kendra",
      certificationLevel: scorePercentage >= 90 ? "Master" : "Advanced",
      issueDate,
      expiryDate,
      verificationStatus: "verified",
      certificateNumber: certNumber,
      isDemoRecord: false,
    };

    // Update technician in storage
    const allTechs = getTechnicians();
    const techIdx = allTechs.findIndex((t) => t.id === technicianId);
    if (techIdx >= 0) {
      const tech = allTechs[techIdx];
      const existingCerts = tech.certifications || [];
      const updatedTech: Technician = {
        ...tech,
        certifications: [newCert, ...existingCerts.filter((c) => c.category !== mod.category)],
        verificationStatus: "verified",
      };
      allTechs[techIdx] = updatedTech;
      saveTechnicians(allTechs);
    }
  }

  return { enrollment: updatedEnrollment, passed, certification: newCert };
}

/**
 * Submit external certification for technician verification.
 */
export function submitTechnicianCertification(
  technicianId: string,
  certData: {
    certificationName: string;
    category: string;
    issuingOrganization: string;
    certificationLevel?: "Basic" | "Advanced" | "Master";
    issueDate: string;
    expiryDate?: string;
    certificateNumber?: string;
  }
): TechnicianCertification {
  const newCert: TechnicianCertification = {
    id: `cert-sub-${Date.now()}`,
    certificationName: certData.certificationName,
    category: certData.category,
    issuingOrganization: certData.issuingOrganization,
    certificationLevel: certData.certificationLevel || "Advanced",
    issueDate: certData.issueDate,
    expiryDate: certData.expiryDate,
    certificateNumber: certData.certificateNumber || `SUB-${Date.now().toString().slice(-6)}`,
    verificationStatus: "pending",
    isDemoRecord: false,
  };

  const allTechs = getTechnicians();
  const techIdx = allTechs.findIndex((t) => t.id === technicianId);
  if (techIdx >= 0) {
    const tech = allTechs[techIdx];
    allTechs[techIdx] = {
      ...tech,
      certifications: [newCert, ...(tech.certifications || [])],
    };
    saveTechnicians(allTechs);
  }

  return newCert;
}

/**
 * Admin action to verify or reject submitted technician certification.
 */
export function updateCertificationVerificationStatus(
  technicianId: string,
  certId: string,
  status: CertificationStatus
): boolean {
  const allTechs = getTechnicians();
  const techIdx = allTechs.findIndex((t) => t.id === technicianId);
  if (techIdx < 0) return false;

  const tech = allTechs[techIdx];
  const certs = tech.certifications || [];
  const certIdx = certs.findIndex((c) => c.id === certId);
  if (certIdx < 0) return false;

  certs[certIdx] = {
    ...certs[certIdx],
    verificationStatus: status,
  };

  allTechs[techIdx] = {
    ...tech,
    certifications: certs,
  };
  saveTechnicians(allTechs);
  return true;
}
