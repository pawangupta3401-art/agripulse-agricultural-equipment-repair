/**
 * Technician Data & Profiles — P2O Step 3 AgriPulse
 *
 * Local mock data only.
 * Includes skills, certifications, training history, and dynamic verification statuses.
 * All demo records are explicitly marked isDemoRecord: true.
 */

import type {
  TechnicianCertification,
  TechnicianTrainingRecord,
  TechnicianVerificationBadge,
} from "../types/index.ts";

export type TechnicianSkill =
  | "Tractor"
  | "Sprayer"
  | "Water Pump"
  | "Power Tiller"
  | "Harvester"
  | "Planter"
  | "Weeder"
  | "Engine"
  | "Electrical"
  | "Hydraulic"
  | "Mechanical";

export interface Technician {
  id: string;
  name: string;
  nameHi: string;
  phone: string;
  skills: TechnicianSkill[];
  available: boolean;
  distanceKm: number;
  rating: number; // 1.0 – 5.0
  completedJobs: number;
  activeJobs?: number;
  primaryExpertise?: string;
  primaryExpertiseHi?: string;
  latitude?: number;
  longitude?: number;
  serviceAreaKm?: number;
  locationUpdatedAt?: string;

  // ─── P2O Step 3: Technician Training & Certification Profile ──────────────
  experienceYears?: number;
  serviceArea?: string;
  equipmentCategories?: string[];
  technicalSkills?: string[];
  selfDeclaredSkills?: string[];
  certifications?: TechnicianCertification[];
  trainingRecords?: TechnicianTrainingRecord[];
  verificationStatus?: TechnicianVerificationBadge;

  // ─── P2O Step 4: Local Service Centre / FPO Connection ──────────────────
  serviceCentreId?: string;
  employmentType?: "centre_technician" | "associated" | "independent";
  providesDoorstepService?: boolean;
}

const FARMER_CENTER = { lat: 26.8467, lng: 80.9462 };

export const mockTechnicians: Technician[] = [
  {
    id: "tech-001",
    name: "Ramesh Kumar",
    nameHi: "रमेश कुमार",
    phone: "9876543210",
    skills: ["Sprayer", "Engine", "Power Tiller", "Mechanical"],
    primaryExpertise: "Sprayer specialist",
    primaryExpertiseHi: "स्प्रेयर विशेषज्ञ",
    available: true,
    distanceKm: 2.4,
    rating: 4.7,
    completedJobs: 83,
    activeJobs: 1,
    latitude: FARMER_CENTER.lat + 0.0140,
    longitude: FARMER_CENTER.lng + 0.0180,
    serviceAreaKm: 10,
    locationUpdatedAt: "2026-09-28T06:00:00.000Z",

    // P2O Step 3 Profile Fields
    experienceYears: 6,
    serviceArea: "नागपुर ग्रामीण - ब्लॉक 1 (10 किमी)",
    equipmentCategories: ["स्प्रेयर", "पावर टिलर", "इंजन"],
    technicalSkills: ["Mechanical", "Sprayer Calibration"],
    verificationStatus: "verified",
    certifications: [
      {
        id: "cert-001",
        certificationName: "National Agritech Sprayer Systems Certification (Demo)",
        category: "Sprayer",
        issuingOrganization: "National Agricultural Machinery Institute (NAMI) Demo",
        certificationLevel: "Advanced",
        issueDate: "2025-02-15",
        expiryDate: "2027-02-15",
        verificationStatus: "verified",
        certificateNumber: "NAMI-SP-2025-882",
        isDemoRecord: true,
      },
    ],
    trainingRecords: [
      {
        id: "train-001",
        trainingTitle: "High-Pressure Sprayer Nozzle & Flow Maintenance",
        category: "Sprayer",
        completionDate: "2025-01-20",
        trainingProvider: "State Krishi Skill Mission Demo",
        status: "Completed",
        isDemoRecord: true,
      },
    ],
  },
  {
    id: "tech-002",
    name: "Suresh Yadav",
    nameHi: "सुरेश यादव",
    phone: "9876501234",
    skills: ["Water Pump", "Engine", "Electrical"],
    primaryExpertise: "Water Pump specialist",
    primaryExpertiseHi: "वाटर पंप विशेषज्ञ",
    available: true,
    distanceKm: 4.1,
    rating: 4.5,
    completedJobs: 61,
    activeJobs: 0,
    latitude: FARMER_CENTER.lat - 0.0030,
    longitude: FARMER_CENTER.lng + 0.0380,
    serviceAreaKm: 15,
    locationUpdatedAt: "2026-09-28T06:30:00.000Z",

    // P2O Step 3 Profile Fields
    experienceYears: 4,
    serviceArea: "हिंगना व बुटीबोरी (15 किमी)",
    equipmentCategories: ["वाटर पंप", "डीजल पंप", "सोलर पंप"],
    technicalSkills: ["Electrical", "Motor Rewinding", "Pump Alignment"],
    verificationStatus: "verified",
    certifications: [
      {
        id: "cert-002",
        certificationName: "Agricultural Water Pump Repair & Safety (Demo)",
        category: "Water Pump",
        issuingOrganization: "Agritech Skill Council of India Demo",
        certificationLevel: "Advanced",
        issueDate: "2024-10-10",
        expiryDate: "2027-10-10",
        verificationStatus: "verified",
        certificateNumber: "ASCI-WP-2024-419",
        isDemoRecord: true,
      },
    ],
    trainingRecords: [
      {
        id: "train-002",
        trainingTitle: "Solar & Diesel Pump Troubleshooting",
        category: "Electrical",
        completionDate: "2026-03-05",
        trainingProvider: "Renewable Agri-Power Institute Demo",
        status: "Completed",
        isDemoRecord: true,
      },
    ],
  },
  {
    id: "tech-003",
    name: "Mohan Singh",
    nameHi: "मोहन सिंह",
    phone: "9812345678",
    skills: ["Tractor", "Power Tiller", "Engine", "Hydraulic", "Harvester"],
    primaryExpertise: "Tractor specialist",
    primaryExpertiseHi: "ट्रैक्टर विशेषज्ञ",
    available: false,
    distanceKm: 1.8,
    rating: 4.9,
    completedJobs: 142,
    activeJobs: 3,
    latitude: FARMER_CENTER.lat + 0.0060,
    longitude: FARMER_CENTER.lng - 0.0160,
    serviceAreaKm: 8,
    locationUpdatedAt: "2026-09-28T07:00:00.000Z",

    // P2O Step 3 Profile Fields
    experienceYears: 9,
    serviceArea: "नागपुर सेंट्रल व काटोल (8 किमी)",
    equipmentCategories: ["ट्रैक्टर", "कंबाइन हार्वेस्टर", "पावर टिलर"],
    technicalSkills: ["Hydraulic", "Mechanical", "Engine Overhaul", "Transmission"],
    verificationStatus: "verified",
    certifications: [
      {
        id: "cert-003a",
        certificationName: "Master Tractor Mechanic Certification (Demo)",
        category: "Tractor",
        issuingOrganization: "Central Farm Machinery Training Institute Demo",
        certificationLevel: "Master",
        issueDate: "2024-04-12",
        expiryDate: "2027-04-12",
        verificationStatus: "verified",
        certificateNumber: "CFMTI-TR-2024-091",
        isDemoRecord: true,
      },
      {
        id: "cert-003b",
        certificationName: "Heavy Agricultural Hydraulics Specialist (Demo)",
        category: "Hydraulic",
        issuingOrganization: "NAMI Hydraulic Division Demo",
        certificationLevel: "Advanced",
        issueDate: "2025-06-18",
        expiryDate: "2028-06-18",
        verificationStatus: "verified",
        certificateNumber: "NAMI-HY-2025-331",
        isDemoRecord: true,
      },
    ],
    trainingRecords: [
      {
        id: "train-003",
        trainingTitle: "Multi-Cylinder Turbo Diesel Diagnostics",
        category: "Engine",
        completionDate: "2024-03-25",
        trainingProvider: "Tractor Tech Academy Demo",
        status: "Completed",
        isDemoRecord: true,
      },
    ],
  },
  {
    id: "tech-004",
    name: "Deepak Verma",
    nameHi: "दीपक वर्मा",
    phone: "9823456789",
    skills: ["Electrical", "Sprayer", "Water Pump"],
    primaryExpertise: "Electrical specialist",
    primaryExpertiseHi: "इलेक्ट्रिकल विशेषज्ञ",
    available: true,
    distanceKm: 6.5,
    rating: 4.3,
    completedJobs: 39,
    activeJobs: 0,
    latitude: FARMER_CENTER.lat + 0.0380,
    longitude: FARMER_CENTER.lng + 0.0500,
    serviceAreaKm: 20,
    locationUpdatedAt: "2026-09-28T05:45:00.000Z",

    // P2O Step 3 Profile Fields
    experienceYears: 2,
    serviceArea: "उमरेड क्षेत्र (20 किमी)",
    equipmentCategories: ["इलेक्ट्रिकल", "वाटर पंप", "स्प्रेयर"],
    technicalSkills: ["Electrical", "Wiring", "Relays"],
    verificationStatus: "pending",
    certifications: [
      {
        id: "cert-004",
        certificationName: "Farm Equipment Electrification Certificate (Demo)",
        category: "Electrical",
        issuingOrganization: "Regional Skill Center Demo",
        certificationLevel: "Basic",
        issueDate: "2026-08-15",
        expiryDate: "2028-08-15",
        verificationStatus: "pending", // Pending audit review
        certificateNumber: "RSC-EL-2026-105",
        isDemoRecord: true,
      },
    ],
    trainingRecords: [
      {
        id: "train-004",
        trainingTitle: "Sensor & Starter Motor Troubleshooting",
        category: "Electrical",
        completionDate: "2026-09-01",
        trainingProvider: "National Rural Skill Mission Demo",
        status: "In Progress",
        isDemoRecord: true,
      },
    ],
  },
  {
    id: "tech-005",
    name: "Ajay Patel",
    nameHi: "अजय पटेल",
    phone: "9834567890",
    skills: ["Tractor", "Engine", "Electrical", "Mechanical"],
    primaryExpertise: "Tractor specialist",
    primaryExpertiseHi: "ट्रैक्टर विशेषज्ञ",
    available: true,
    distanceKm: 3.2,
    rating: 4.6,
    completedJobs: 58,
    activeJobs: 1,
    latitude: FARMER_CENTER.lat - 0.0220,
    longitude: FARMER_CENTER.lng - 0.0110,
    serviceAreaKm: 12,
    locationUpdatedAt: "2026-09-28T06:15:00.000Z",

    // P2O Step 3 Profile Fields
    experienceYears: 5,
    serviceArea: "नरखेड व वरुड (12 किमी)",
    equipmentCategories: ["ट्रैक्टर", "पावर टिलर"],
    technicalSkills: ["Mechanical", "Engine Tuning"],
    verificationStatus: "expired", // Expired on 2026-06-15
    certifications: [
      {
        id: "cert-005",
        certificationName: "Tractor Maintenance Certificate (Demo)",
        category: "Tractor",
        issuingOrganization: "State Agro Mechanics Guild Demo",
        certificationLevel: "Basic",
        issueDate: "2023-06-01",
        expiryDate: "2026-06-01", // Past expiry
        verificationStatus: "expired",
        certificateNumber: "SAMG-TR-2023-772",
        isDemoRecord: true,
      },
    ],
    trainingRecords: [
      {
        id: "train-005",
        trainingTitle: "Tractor Fuel Injection Calibration",
        category: "Engine",
        completionDate: "2023-05-15",
        trainingProvider: "Diesel Workshop Demo",
        status: "Expired",
        isDemoRecord: true,
      },
    ],
  },
  {
    id: "tech-006",
    name: "Vijay Sharma",
    nameHi: "विजय शर्मा",
    phone: "9845678901",
    skills: ["Water Pump", "Power Tiller", "Planter", "Weeder"],
    primaryExpertise: "Water Pump specialist",
    primaryExpertiseHi: "वाटर पंप विशेषज्ञ",
    available: false,
    distanceKm: 2.9,
    rating: 4.2,
    completedJobs: 27,
    activeJobs: 2,
    latitude: FARMER_CENTER.lat - 0.0150,
    longitude: FARMER_CENTER.lng - 0.0240,
    serviceAreaKm: 10,
    locationUpdatedAt: "2026-09-28T07:30:00.000Z",

    // P2O Step 3 Profile Fields
    experienceYears: 3,
    serviceArea: "कामठी ग्रामीण (10 किमी)",
    equipmentCategories: ["वाटर पंप", "पावर टिलर", "पावर वीडर"],
    technicalSkills: ["Mechanical"],
    selfDeclaredSkills: ["Water Pump", "Power Tiller", "Weeder"],
    verificationStatus: "pending",
    certifications: [], // No official certificate submitted yet
    trainingRecords: [
      {
        id: "train-006",
        trainingTitle: "Basic Power Tiller Implement Operations",
        category: "Mechanical",
        completionDate: "2025-09-10",
        trainingProvider: "Krishi Vigyan Kendra Demo",
        status: "Completed",
        isDemoRecord: true,
      },
    ],
  },
];

/**
 * Maps machine type strings (from machineNameHi / type fields) to skill tags.
 */
export const machineTypeToSkillMap: Record<string, TechnicianSkill> = {
  "स्प्रेयर": "Sprayer",
  sprayer: "Sprayer",
  "वाटर पंप": "Water Pump",
  "water pump": "Water Pump",
  "डीजल पंप": "Water Pump",
  pump: "Water Pump",
  "पंप": "Water Pump",
  "पावर टिलर": "Power Tiller",
  "power tiller": "Power Tiller",
  tiller: "Power Tiller",
  "टिलर": "Power Tiller",
  "ट्रैक्टर": "Tractor",
  tractor: "Tractor",
  "हार्वेस्टर": "Harvester",
  harvester: "Harvester",
  "कंबाइन हार्वेस्टर": "Harvester",
  "प्लांटर": "Planter",
  planter: "Planter",
  "सीड प्लांटर": "Planter",
  "वीडर": "Weeder",
  weeder: "Weeder",
  "पावर वीडर": "Weeder",
  engine: "Engine",
  "इंजन": "Engine",
  electrical: "Electrical",
  "इलेक्ट्रिकल": "Electrical",
  hydraulic: "Hydraulic",
  "हाइड्रोलिक": "Hydraulic",
  mechanical: "Mechanical",
  "मैकेनिकल": "Mechanical",
};

/**
 * Maps diagnosis matchedRule / problem category to a secondary skill hint.
 */
export const problemCategoryToSkillHint: Record<string, TechnicianSkill> = {
  smoke_overheating: "Engine",
  fluid_leakage: "Hydraulic",
  visible_damage: "Mechanical",
  loose_broken_component: "Mechanical",
  starting_issue: "Electrical",
  unusual_sound: "Mechanical",
  pump_issue: "Water Pump",
  electrical: "Electrical",
  hydraulic_issue: "Hydraulic",
  general_fallback: "Mechanical",
};
