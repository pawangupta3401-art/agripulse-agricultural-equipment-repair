export type MachineStatus = "active" | "issue" | "service_soon";

export type MaintenanceStatus = "upcoming" | "due" | "overdue";

export interface ServiceEvent {
  id: string;
  date: string;
  type: "service" | "repair";
  titleHi: string;
  notes?: string;
  itemsChecked?: string[];
  performedBy?: string;
}

export interface Machine {
  id: string;
  name: string;
  nameHi: string;
  type: string;
  icon: string;
  status: MachineStatus;
  statusText: string;
  lastService: string;
  nextService: string;
  operatingHours: string;
  serviceHistory: string;
  previousRepairs: string;
  partsReplaced: string;
  // P2G Step 2: Preventive Maintenance
  lastServiceDate?: string;
  nextServiceDate?: string;
  serviceIntervalDays?: number;
  maintenanceItems?: string[];
  maintenanceStatus?: MaintenanceStatus;
  serviceEvents?: ServiceEvent[];
}

export type UrgencyType = "today" | "within_2_3_days" | "not_urgent" | "later";
export type FarmerRequiredTime = "today" | "within_2_3_days" | "not_urgent";
export type ProblemSeverity = "critical" | "high" | "medium" | "low";
export type CalculatedUrgency = "emergency" | "urgent" | "normal";

export interface CriticalFarmWindowResult {
  urgency: CalculatedUrgency;
  urgencyLabelHi: string;
  score: number;
  reason: string;
  recommendedResponseTime: string;
  safetyMessage?: string;
}

export type TechnicianWorkflowStatus =
  | "available"
  | "assigned"
  | "on_the_way"
  | "arrived"
  | "repairing"
  | "completed";

export const TECHNICIAN_STATUS_LABELS_HI: Record<TechnicianWorkflowStatus, string> = {
  available: "उपलब्ध",
  assigned: "मैकेनिक नियुक्त हो गया है",
  on_the_way: "मैकेनिक रास्ते में है",
  arrived: "मैकेनिक पहुँच गया है",
  repairing: "मरम्मत चल रही है",
  completed: "मरम्मत पूरी हुई",
};

export type RepairStatus =
  | "reported"
  | "finding_mechanic"
  | "technician_assigned"
  | "mechanic_assigned"
  | "on_the_way"
  | "arrived"
  | "repairing"
  | "mechanic_accepted"
  | "repair_in_progress"
  | "verification"
  | "verification_pending"
  | "re_repair_required"
  | "completed";

// ─── P2E & P2K: Job Card Types ──────────────────────────────────────────────

export type JobCardStatus =
  | "मैकेनिक नियुक्त हो गया है"
  | "मैकेनिक रास्ते में है"
  | "मैकेनिक पहुँच गया है"
  | "मरम्मत चल रही है"
  | "मरम्मत पूरी हुई"
  | "मैकेनिक को भेजा गया"
  | "मैकेनिक ने काम स्वीकार किया"
  | "मरम्मत शुरू हो गई"
  | "verification_pending"
  | "दोबारा मरम्मत की जरूरत";

// ─── P2F: Spare Part Types ───────────────────────────────────────────────────

/** Technician's decision on a recommended part */
export type PartDecision = "needed" | "not_needed" | "pending";

/** Technician's per-part selection saved to job card */
export interface PartSelection {
  partId: string;
  partNameHi: string;
  decision: PartDecision;
}

export type ComplaintChannel = "APP" | "PHONE" | "ASSISTED";

export interface JobCard {
  jobId: string;
  repairRequestId: string;
  /** Hindi machine name */
  machine: string;
  machineIcon: string;
  /** Farmer's problem description */
  problem: string;
  /** AI diagnosis text */
  diagnosis: string;
  /** Calculated urgency level */
  urgency: string;
  /** Safety message if applicable */
  safetyMessage?: string;
  /** Technician details */
  technicianId: string;
  technicianNameHi: string;
  technicianPhone: string;
  technicianSkillHi: string;
  technicianDistanceKm: number;
  technicianRating: number;
  /** ISO timestamp of job card creation */
  createdAt: string;
  status: JobCardStatus;
  // ─── P2F: Spare Parts ─────────────────────────────────────────────────
  /** IDs of recommended spare parts */
  recommendedPartIds?: string[];
  /** matchedRule that generated recommendations */
  recommendationRule?: string;
  /** Technician's part decisions — saved locally */
  partSelections?: PartSelection[];
  // ─── P2F Step 2: Verification details ──────────────────────────────────
  verificationStatus?: "pending" | "passed" | "failed";
  verificationTime?: string;
  verificationNote?: string;
  verificationAttempt?: number;
  // ─── P2K Step 2 & P2L: Location, Dispatch & ID Consistency fields ─────────
  farmerId?: string;
  jobCardId?: string;
  verificationId?: string;
  farmerLocationText?: string;
  visualEvidence?: string;
  photoDataUrl?: string;
  technicianWorkflowStatus?: TechnicianWorkflowStatus;
  assignedAt?: string;
  routeUrl?: string;
  approxDistanceText?: string;
  // ─── P2O Step 2: Transparent Pricing ────────────────────────────────────
  estimatedCost?: PricingBreakdown;
  finalCost?: PricingBreakdown;
  priceAdjustment?: FinalPriceAdjustment;
  // ─── P2O Step 3: Technician Training & Certification ────────────────────
  technicianVerificationStatus?: TechnicianVerificationBadge;
  technicianExperienceYears?: number;
  // ─── P2O Step 4: Service Centre & Service Mode ──────────────────────────
  serviceMode?: ServiceMode;
  serviceCentreId?: string;
  serviceCentreNameHi?: string;
  serviceCentreType?: ServiceCentreType;
  serviceCentreAddress?: string;
  // ─── P2P Step 1: Feature Phone & Assisted Channel ───────────────────────
  channel?: ComplaintChannel;
  callerPhoneNumber?: string;
  // ─── P2Q: Human Override for Diagnosis ──────────────────────────────────
  technicianOverrideDiagnosis?: string;
}

export interface MachinePassportRecord {
  repairDate: string;
  diagnosis: string;
  technician: string;
  partsUsed: string[];
  repairResult: string;
  verificationResult: string;
  verificationId?: string;
  // ─── P2O Step 2: Transparent Pricing in Service History ─────────────────
  finalCost?: number;
  costBreakdown?: PricingBreakdown;
  // ─── P2Q: Recovery Engine & Passport Reference Fields ───────────────────
  problemDescription?: string;
  estimatedCost?: number;
  serviceCentreNameHi?: string;
  maintenanceRecommendation?: string;
  technicianOverrideDiagnosis?: string;
}

export type InputMethod = "voice" | "photo" | "video" | "text";

export type SyncStatus = "pending" | "synced";

export interface OutboxAction<T = unknown> {
  id: string;
  type: string;
  createdAt: string;
  payload: T;
  syncStatus: SyncStatus;
}

export type DiagnosisUrgency = "high" | "medium" | "low";

export type PhotoAnalysisSeverity = "low" | "medium" | "high";

export type DetectionClass =
  | "smoke"
  | "oil_leak"
  | "fuel_leak"
  | "damaged_part"
  | "loose_part"
  | "electrical_damage"
  | "overheating_sign";

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface YOLODetection {
  label: DetectionClass;
  confidence: number;
  boundingBox: BoundingBox;
}

export interface VisionResult {
  detected: boolean;
  detections: YOLODetection[];
  imageQuality: "good" | "poor";
}

export interface PhotoAnalysisResult {
  detectedIssue: string;
  confidence: number;
  evidence: string[];
  severity?: PhotoAnalysisSeverity;
  isClear: boolean;
  unclearReason?: string;
  annotatedArea?: string;
  actionHint?: string;
  rawDetails?: string;
  // P2I Step 2 YOLO Vision fields:
  detected?: boolean;
  imageQuality?: "good" | "poor";
  visionResult?: VisionResult;
  friendlyLabelHi?: string;
  confidenceLevelHi?: string;
  safetyWarning?: string | null;
}

export interface StructuredAIDiagnosisResponse {
  diagnosis: string;
  confidence: number;
  reasons: string[];
  recommendedAction: string;
  severity: "critical" | "high" | "medium" | "low";
  safetyWarning: string | null;
}

export interface AIDiagnosisResult {
  id: string;
  possibleProblem: string;
  confidence: string;
  confidenceValue: number;
  reasons: string[];
  safeAction: string;
  urgencyLevel: DiagnosisUrgency;
  urgencyText: string;
  urgencyColor: string;
  disclaimer: string;
  matchedRule: string;
  timestamp: string;
  photoAnalysis?: PhotoAnalysisResult;
  severity?: ProblemSeverity;
  // P2I Step 1: Real AI Integration & Fallback metadata
  safetyWarning?: string | null;
  isFallback?: boolean;
  fallbackNote?: string | null;
  provider?: "cloud_ai" | "local_engine";
}

export interface RepairRequest {
  id: string;
  machineId: string;
  machineNameHi: string;
  machineIcon: string;
  problemDescription: string;
  inputMethod: InputMethod;
  mediaFileName?: string;
  photoDataUrl?: string;
  urgency: UrgencyType;
  status: RepairStatus;
  statusTextHi: string;
  createdAt: string;
  verificationStatus: "pending" | "passed" | "failed" | "verified" | "unverified";
  syncStatus: SyncStatus;
  isOfflineCreated?: boolean;
  diagnosis?: AIDiagnosisResult;
  severity?: ProblemSeverity;
  calculatedUrgency?: CalculatedUrgency;
  requiredBy?: FarmerRequiredTime;
  safetyMessage?: string;
  // P2F: Spare part recommendations attached to repair request
  recommendedParts?: string[];
  selectedParts?: PartSelection[];
  partAvailability?: Record<string, boolean>;
  // P2F Step 2: Verification details & Machine Passport preparation
  verificationTime?: string;
  verificationNote?: string;
  verificationAttempt?: number;
  passportData?: MachinePassportRecord;
  // ─── P2K Step 2 & P2L: Technician Dispatch, Location & ID Consistency ────
  farmerId?: string;
  technicianId?: string;
  jobCardId?: string;
  verificationId?: string;
  assignedAt?: string;
  selectedTechnician?: any;
  technicianWorkflowStatus?: TechnicianWorkflowStatus;
  approxDistanceText?: string;
  routeUrl?: string;
  // ─── P2O Step 2: Transparent Pricing ────────────────────────────────────
  estimatedCost?: PricingBreakdown;
  finalCost?: PricingBreakdown;
  priceAdjustment?: FinalPriceAdjustment;
  // ─── P2O Step 3: Technician Training & Certification ────────────────────
  technicianVerificationStatus?: TechnicianVerificationBadge;
  technicianExperienceYears?: number;
  // ─── P2O Step 4: Service Centre & Service Mode ──────────────────────────
  serviceMode?: ServiceMode;
  serviceCentreId?: string;
  serviceCentreNameHi?: string;
  serviceCentreType?: ServiceCentreType;
  serviceCentreAddress?: string;
  // ─── P2P Step 1: Feature Phone & Assisted Channel ───────────────────────
  channel?: ComplaintChannel;
  callerPhoneNumber?: string;
  assistedOperatorId?: string;
  assistedOperatorNameHi?: string;
}

// ─── P2O Step 2: Transparent Pricing Interfaces ─────────────────────────────

export interface PricingBreakdown {
  diagnosticFee: number;
  labourFee: number;
  partsEstimate: number;
  travelFee: number;
  discount: number;
  total: number;
  currency: string;
  isDemoPricing: boolean;
  pricingTier?: string;
  discountReason?: string;
}

export type PriceChangeReason =
  | "अतिरिक्त पार्ट खराब मिला"
  | "अतिरिक्त श्रम आवश्यक"
  | "मूल पार्ट उपलब्ध नहीं"
  | "अन्य";

export interface FinalPriceAdjustment {
  estimatedTotal: number;
  revisedTotal: number;
  difference: number;
  reason: PriceChangeReason;
  customReasonNote?: string;
  adjustedAt: string;
  adjustedByTechnicianId?: string;
}

// ─── P2O Step 3: Technician Training & Certification Types ───────────────────

export type CertificationStatus = "verified" | "pending" | "expired";
export type TrainingStatus = "Completed" | "In Progress" | "Expired";
export type TechnicianVerificationBadge = "verified" | "pending" | "expired";

export interface TechnicianCertification {
  id: string;
  certificationName: string;
  category: string;
  issuingOrganization: string;
  certificationLevel: "Basic" | "Advanced" | "Master";
  issueDate: string;
  expiryDate?: string;
  verificationStatus: CertificationStatus;
  isDemoRecord: boolean;
  certificateNumber?: string;
}

export interface TechnicianTrainingRecord {
  id: string;
  trainingTitle: string;
  category: string;
  completionDate: string;
  trainingProvider: string;
  status: TrainingStatus;
  isDemoRecord: boolean;
}

// ─── P2O Step 4: Local Service Centre / FPO Network Types ───────────────────

export type ServiceCentreType =
  | "Local Workshop"
  | "FPO"
  | "Cooperative"
  | "Entrepreneur-operated Centre"
  | "Authorized/Partner Service Centre";

export type ServiceCentreVerificationStatus = "verified" | "pending" | "unverified";

export type ServiceMode = "doorstep" | "workshop";

export interface ServiceCentreStockedPart {
  partId: string;
  partNameHi: string;
  inStock: boolean;
  quantity?: number;
  availabilityStatus: "उपलब्ध (In Stock)" | "सीमित स्टॉक (Limited)" | "ऑर्डर पर (On Order)";
}

export interface ServiceCentre {
  id: string;
  name: string;
  nameHi: string;
  centreType: ServiceCentreType;
  operatingOrgName?: string;
  operatingOrgType?: "FPO" | "Cooperative" | "Entrepreneur" | "Private Workshop";
  location: {
    lat: number;
    lng: number;
    addressHi: string;
    district: string;
  };
  distanceKm?: number;
  serviceAreaKm: number;
  equipmentCategories: string[];
  technicalCapabilities: string[];
  associatedTechnicianIds: string[];
  stockedParts: ServiceCentreStockedPart[];
  operatingStatus: "Open" | "Closed" | "Busy";
  phone: string;
  managerNameHi?: string;
  verificationStatus: ServiceCentreVerificationStatus;
  isDemoRecord: boolean;
  notesHi?: string;
}

// ─── P2J Step 1: Backend & Cloud Sync Types ─────────────────────────────────

export type SyncEntityType =
  | "farmer_profile"
  | "machine"
  | "repair_request"
  | "job_card"
  | "spare_parts_selection"
  | "repair_verification"
  | "machine_passport"
  | "maintenance_record";

export type SyncOperationType = "create" | "update" | "delete";

export type SyncOperationStatus = "pending" | "syncing" | "synced" | "failed";

export interface SyncOperation {
  operationId: string;
  entityType: SyncEntityType;
  entityId: string;
  operationType: SyncOperationType;
  payload: any;
  createdAt: string;
  retryCount: number;
  syncStatus: SyncOperationStatus;
  lastAttemptAt?: string;
  errorMessage?: string;
  isConflict?: boolean;
}

export interface SyncBatchResult {
  success: boolean;
  syncedCount: number;
  failedCount: number;
  results: Array<{
    operationId: string;
    success: boolean;
    error?: string;
    serverTimestamp?: string;
  }>;
}

// ─── P2P Step 1: Feature Phone & Telephony Types ────────────────────────────

export interface SMSNotification {
  id: string;
  recipientPhone: string;
  messageTextHi: string;
  eventType: "complaint_created" | "technician_assigned" | "technician_arriving" | "repair_completed" | "repair_verified" | "status_inquiry";
  sentAt: string;
  deliveryStatus: "simulated_sent" | "delivered" | "failed";
  complaintId?: string;
  isDemoSimulation: boolean;
}

// ─── P2O Step 5: Scalable & Sustainable Business Model Types ─────────────────

export type MaintenancePackageTier = "basic" | "standard" | "comprehensive";

export interface MaintenancePackage {
  id: string;
  tier: MaintenancePackageTier;
  titleHi: string;
  subtitleHi: string;
  descriptionHi: string;
  machineTypes: string[];
  price: number;
  originalPrice: number;
  discountNoteHi?: string;
  includedServicesHi: string[];
  includedConsumablesHi: string[];
  validityDays: number;
  isDemoPackage: boolean;
}

export interface BusinessModelConfig {
  technicianLabourSharePercent: number; // e.g. 85%
  technicianTravelSharePercent: number; // 100%
  serviceCentreLabourSharePercent: number; // e.g. 80%
  serviceCentrePartsSharePercent: number; // e.g. 95%
  platformFacilitationFeePercent: number; // e.g. 10%
  isConfigurable: boolean;
}

export interface TechnicianSettlement {
  technicianId: string;
  technicianNameHi: string;
  totalJobs: number;
  grossLabour: number;
  travelReimbursement: number;
  platformFeeDeducted: number;
  netPayableToTechnician: number;
  settlementStatus: "pending" | "settled";
}

export interface ServiceCentreSettlement {
  serviceCentreId: string;
  serviceCentreNameHi: string;
  totalJobs: number;
  partsRevenue: number;
  workshopLabourRevenue: number;
  diagnosticsRevenue: number;
  maintenancePackageRevenue: number;
  platformFeeDeducted: number;
  netPayableToCentre: number;
}

export interface PlatformBusinessSummary {
  totalJobsCompleted: number;
  grossServiceVolume: number;
  technicianPayouts: number;
  serviceCentrePayouts: number;
  sparePartsVolume: number;
  maintenancePackageVolume: number;
  platformRevenue: number;
  averageFarmerSavings: number;
  isSimulatedMetrics: boolean;
}

// ─── P2Q: AgriPulse Recovery Engine Types ───────────────────────────────────

export type RecoveryStatus =
  | "machine_down"
  | "recovery_planning"
  | "arranging_technician_parts"
  | "repair_in_progress"
  | "farm_ready";

export type RecoveryOptionType = "fastest" | "nearest_centre" | "lowest_cost";

export interface RecoveryOption {
  id: string;
  type: RecoveryOptionType;
  badgeHi: string;
  serviceMode: "doorstep" | "workshop";
  providerNameHi: string;
  providerTypeHi: string;
  technicianId?: string;
  serviceCentreId?: string;
  distanceKm: number;
  distanceText: string;
  estimatedServiceTimeHours: number;
  estimatedServiceTimeTextHi: string;
  pricing: PricingBreakdown;
  reasonHi: string;
  partsAvailable: boolean;
  isAvailable: boolean;
  prosHi: string[];
}

export interface RecoveryPlan {
  machineId: string;
  machineNameHi: string;
  machineIcon: string;
  problemSummaryHi: string;
  recoveryStatus: RecoveryStatus;
  urgencyLevel: string;
  isCriticalFarmWindow: boolean;
  criticalWindowTextHi?: string;
  aiConfidence: "high" | "medium" | "low" | "uncertain";
  confidenceAdviceHi: string;
  safetyWarning?: string | null;
  partsBottleneckDetected: boolean;
  partsBottleneckAdviceHi?: string;
  previousIssueNoticeHi?: string;
  recoveryOptions: RecoveryOption[];
  selectedOptionId?: string;
  isOffline: boolean;
  generatedAt: string;
}
