/**
 * Job Card Service — P2E/P2F AgriPulse
 *
 * Creates, persists, retrieves, and updates Job Cards in localStorage.
 * P2F addition: stores recommendedPartIds and partSelections.
 */

import { JobCard, JobCardStatus, PartSelection, PartDecision, PricingBreakdown, FinalPriceAdjustment } from "@/types";
import { enqueueSyncOperation } from "./syncQueueService";

const JOB_CARDS_STORAGE_KEY = "agripulse_job_cards_v1";

// ─── Storage Helpers ─────────────────────────────────────────────────────────

function isStorageAvailable(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function getJobCards(): JobCard[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = localStorage.getItem(JOB_CARDS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getJobCardByRepairId(repairRequestId: string): JobCard | null {
  const cards = getJobCards();
  return cards.find((c) => c.repairRequestId === repairRequestId) || null;
}

export function getLatestJobCard(): JobCard | null {
  const cards = getJobCards();
  if (cards.length === 0) return null;
  return cards.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
}

function saveJobCards(cards: JobCard[]): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(JOB_CARDS_STORAGE_KEY, JSON.stringify(cards));
  } catch {
    // Fail silently
  }
}

// ─── Job Card Operations ─────────────────────────────────────────────────────

export interface CreateJobCardParams {
  repairRequestId: string;
  machine: string;
  machineIcon: string;
  problem: string;
  diagnosis: string;
  urgency: string;
  safetyMessage?: string;
  technicianId: string;
  technicianNameHi: string;
  technicianPhone: string;
  technicianSkillHi: string;
  technicianDistanceKm: number;
  technicianRating: number;
  // P2F additions
  recommendedPartIds?: string[];
  recommendationRule?: string;
  // P2K Step 2 additions
  farmerId?: string;
  farmerLocationText?: string;
  visualEvidence?: string;
  photoDataUrl?: string;
  technicianWorkflowStatus?: import("@/types").TechnicianWorkflowStatus;
  assignedAt?: string;
  routeUrl?: string;
  approxDistanceText?: string;
  // P2O Step 2: Transparent Pricing
  estimatedCost?: PricingBreakdown;
  finalCost?: PricingBreakdown;
  priceAdjustment?: FinalPriceAdjustment;
  // P2O Step 3: Technician Certification & Trust
  technicianVerificationStatus?: import("@/types").TechnicianVerificationBadge;
  technicianExperienceYears?: number;
  // P2O Step 4: Service Centre & Service Mode
  serviceMode?: import("@/types").ServiceMode;
  serviceCentreId?: string;
  serviceCentreNameHi?: string;
  serviceCentreType?: import("@/types").ServiceCentreType;
  serviceCentreAddress?: string;
}

/**
 * P2K Step 2: Create or update a Job Card when farmer confirms a technician.
 * Idempotent: If a job card for this repairRequestId already exists, updates it
 * rather than generating a duplicate job card.
 * Initial status: "मैकेनिक नियुक्त हो गया है" (assigned)
 */
export function createJobCard(params: CreateJobCardParams): JobCard {
  const existingCards = getJobCards();
  const existing = existingCards.find((c) => c.repairRequestId === params.repairRequestId);

  const jobId = existing ? existing.jobId : `job-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const createdAt = existing ? existing.createdAt : (params.assignedAt || new Date().toISOString());

  const newCard: JobCard = {
    jobId,
    jobCardId: jobId,
    repairRequestId: params.repairRequestId,
    machine: params.machine,
    machineIcon: params.machineIcon,
    problem: params.problem,
    diagnosis: params.diagnosis,
    urgency: params.urgency,
    safetyMessage: params.safetyMessage,
    technicianId: params.technicianId,
    technicianNameHi: params.technicianNameHi,
    technicianPhone: params.technicianPhone,
    technicianSkillHi: params.technicianSkillHi,
    technicianDistanceKm: params.technicianDistanceKm,
    technicianRating: params.technicianRating,
    createdAt,
    status: "मैकेनिक नियुक्त हो गया है",
    // P2F
    recommendedPartIds: params.recommendedPartIds || existing?.recommendedPartIds || [],
    recommendationRule: params.recommendationRule || existing?.recommendationRule,
    partSelections: existing?.partSelections || [],
    // P2F Step 2: Verification details
    verificationStatus: existing?.verificationStatus || "pending",
    verificationAttempt: existing?.verificationAttempt || 1,
    verificationId: existing?.verificationId,
    // P2K Step 2
    farmerId: params.farmerId || "farmer-001",
    farmerLocationText: params.farmerLocationText,
    visualEvidence: params.visualEvidence,
    photoDataUrl: params.photoDataUrl,
    technicianWorkflowStatus: params.technicianWorkflowStatus || "assigned",
    assignedAt: params.assignedAt || new Date().toISOString(),
    routeUrl: params.routeUrl,
    approxDistanceText: params.approxDistanceText,
    // P2O Step 2: Transparent Pricing
    estimatedCost: params.estimatedCost || existing?.estimatedCost,
    finalCost: params.finalCost || existing?.finalCost,
    priceAdjustment: params.priceAdjustment || existing?.priceAdjustment,
    // P2O Step 3: Technician Certification & Trust
    technicianVerificationStatus: params.technicianVerificationStatus || existing?.technicianVerificationStatus,
    technicianExperienceYears: params.technicianExperienceYears || existing?.technicianExperienceYears,
    // P2O Step 4: Service Centre & Service Mode
    serviceMode: params.serviceMode || existing?.serviceMode || "doorstep",
    serviceCentreId: params.serviceCentreId || existing?.serviceCentreId,
    serviceCentreNameHi: params.serviceCentreNameHi || existing?.serviceCentreNameHi,
    serviceCentreType: params.serviceCentreType || existing?.serviceCentreType,
    serviceCentreAddress: params.serviceCentreAddress || existing?.serviceCentreAddress,
  };

  const withoutDuplicate = existingCards.filter(
    (c) => c.repairRequestId !== params.repairRequestId && c.jobId !== jobId
  );
  saveJobCards([newCard, ...withoutDuplicate]);

  // P2J Step 1: Enqueue job card creation/update to persistent sync queue
  enqueueSyncOperation({
    entityType: "job_card",
    entityId: newCard.jobId,
    operationType: existing ? "update" : "create",
    payload: newCard,
  });

  return newCard;
}

/**
 * P2K Step 2: Update technician workflow status with exact Hindi strings:
 * - assigned   -> "मैकेनिक नियुक्त हो गया है"
 * - on_the_way -> "मैकेनिक रास्ते में है"
 * - arrived    -> "मैकेनिक पहुँच गया है"
 * - repairing  -> "मरम्मत चल रही है"
 * - completed  -> "मरम्मत पूरी हुई"
 */
export function updateTechnicianWorkflowStatus(
  jobId: string,
  workflowStatus: import("@/types").TechnicianWorkflowStatus
): JobCard | null {
  const cards = getJobCards();
  const idx = cards.findIndex((c) => c.jobId === jobId);
  if (idx === -1) return null;

  const statusMap: Record<import("@/types").TechnicianWorkflowStatus, JobCardStatus> = {
    available: "मैकेनिक नियुक्त हो गया है",
    assigned: "मैकेनिक नियुक्त हो गया है",
    on_the_way: "मैकेनिक रास्ते में है",
    arrived: "मैकेनिक पहुँच गया है",
    repairing: "मरम्मत चल रही है",
    completed: "मरम्मत पूरी हुई",
  };

  const newStatus = statusMap[workflowStatus] || "मैकेनिक नियुक्त हो गया है";
  const updated: JobCard = {
    ...cards[idx],
    status: newStatus,
    technicianWorkflowStatus: workflowStatus,
  };

  cards[idx] = updated;
  saveJobCards(cards);

  // Enqueue sync operation
  enqueueSyncOperation({
    entityType: "job_card",
    entityId: jobId,
    operationType: "update",
    payload: {
      status: newStatus,
      technicianWorkflowStatus: workflowStatus,
      updatedAt: new Date().toISOString(),
    },
  });

  return updated;
}

/**
 * Update job card status by jobId.
 */
export function updateJobCardStatus(
  jobId: string,
  newStatus: JobCardStatus
): JobCard | null {
  const cards = getJobCards();
  const idx = cards.findIndex((c) => c.jobId === jobId);
  if (idx === -1) return null;

  const updated: JobCard = { ...cards[idx], status: newStatus };
  cards[idx] = updated;
  saveJobCards(cards);

  // P2J Step 1: Enqueue status update
  enqueueSyncOperation({
    entityType: "job_card",
    entityId: jobId,
    operationType: "update",
    payload: { status: newStatus, updatedAt: new Date().toISOString() },
  });

  return updated;
}

/**
 * P2F Step 2: Technician completes repair — moves to verification_pending.
 * Does NOT mark the job as finally completed yet.
 */
export function completeJobCardRepair(jobId: string): JobCard | null {
  const cards = getJobCards();
  const idx = cards.findIndex((c) => c.jobId === jobId);
  if (idx === -1) return null;

  const updated: JobCard = {
    ...cards[idx],
    status: "verification_pending",
    verificationStatus: "pending",
    verificationAttempt: cards[idx].verificationAttempt || 1,
  };
  cards[idx] = updated;
  saveJobCards(cards);

  // P2J Step 1: Enqueue status update
  enqueueSyncOperation({
    entityType: "job_card",
    entityId: jobId,
    operationType: "update",
    payload: {
      status: "verification_pending",
      verificationStatus: "pending",
      verificationAttempt: updated.verificationAttempt,
      updatedAt: new Date().toISOString(),
    },
  });

  return updated;
}

/**
 * P2F Step 2: Record machine verification result (passed or failed).
 */
export function recordJobCardVerification(
  jobId: string,
  passed: boolean,
  note?: string,
  verificationIdParam?: string
): JobCard | null {
  const cards = getJobCards();
  const idx = cards.findIndex((c) => c.jobId === jobId);
  if (idx === -1) return null;

  const card = cards[idx];
  const verificationId = verificationIdParam || card.verificationId || `verif-${card.repairRequestId}-${Date.now()}`;
  const updated: JobCard = {
    ...card,
    verificationId,
    status: passed ? "मरम्मत पूरी हुई" : "दोबारा मरम्मत की जरूरत",
    verificationStatus: passed ? "passed" : "failed",
    verificationTime: new Date().toISOString(),
    verificationNote: note,
  };
  cards[idx] = updated;
  saveJobCards(cards);

  // P2J Step 1: Enqueue repair verification
  enqueueSyncOperation({
    entityType: "repair_verification",
    entityId: verificationId,
    operationType: "create",
    payload: {
      verificationId,
      jobId,
      repairRequestId: card.repairRequestId,
      verified: passed,
      status: passed ? "passed" : "failed",
      verificationTime: updated.verificationTime,
      note,
    },
  });

  return updated;
}

/**
 * P2F Step 2: Reopen job card for a re-repair attempt when verification fails.
 * Increments verificationAttempt and resets status to 'मरम्मत शुरू हो गई'.
 */
export function reopenJobCardForReRepair(jobId: string): JobCard | null {
  const cards = getJobCards();
  const idx = cards.findIndex((c) => c.jobId === jobId);
  if (idx === -1) return null;

  const card = cards[idx];
  const nextAttempt = (card.verificationAttempt || 1) + 1;
  const updated: JobCard = {
    ...card,
    status: "मरम्मत शुरू हो गई",
    verificationStatus: "pending",
    verificationAttempt: nextAttempt,
    verificationTime: undefined,
  };
  cards[idx] = updated;
  saveJobCards(cards);

  // P2J Step 1: Enqueue re-repair update
  enqueueSyncOperation({
    entityType: "job_card",
    entityId: jobId,
    operationType: "update",
    payload: {
      status: "मरम्मत शुरू हो गई",
      verificationStatus: "pending",
      verificationAttempt: nextAttempt,
      updatedAt: new Date().toISOString(),
    },
  });

  return updated;
}

/**
 * Update a technician's decision for a specific part on a job card.
 * If a selection for that partId already exists, update it.
 * Otherwise add a new selection.
 */
export function updatePartSelection(
  jobId: string,
  selection: PartSelection
): JobCard | null {
  const cards = getJobCards();
  const idx = cards.findIndex((c) => c.jobId === jobId);
  if (idx === -1) return null;

  const card = cards[idx];
  const existing = card.partSelections || [];
  const selIdx = existing.findIndex((s) => s.partId === selection.partId);

  let updated: PartSelection[];
  if (selIdx >= 0) {
    updated = existing.map((s, i) => (i === selIdx ? selection : s));
  } else {
    updated = [...existing, selection];
  }

  const updatedCard: JobCard = { ...card, partSelections: updated };
  cards[idx] = updatedCard;
  saveJobCards(cards);

  // P2J Step 1: Enqueue spare parts selection update
  enqueueSyncOperation({
    entityType: "spare_parts_selection",
    entityId: jobId,
    operationType: "update",
    payload: {
      jobId,
      selection,
      partSelections: updated,
      updatedAt: new Date().toISOString(),
    },
  });

  return updatedCard;
}

/**
 * Maps JobCardStatus to RepairRequest statusTextHi for the farmer timeline.
 */
export function jobCardStatusToRepairStatusTextHi(status: JobCardStatus): string {
  switch (status) {
    case "मैकेनिक को भेजा गया":
      return "मैकेनिक को भेजा गया";
    case "मैकेनिक ने काम स्वीकार किया":
      return "मैकेनिक ने काम स्वीकार किया";
    case "मरम्मत शुरू हो गई":
      return "मरम्मत शुरू हो गई";
    case "verification_pending":
      return "मशीन की जाँच बाकी है";
    case "मरम्मत पूरी हुई":
      return "मशीन सही चल रही है";
    case "दोबारा मरम्मत की जरूरत":
      return "दोबारा जाँच की जरूरत है";
    default:
      return "मैकेनिक खोज रहे हैं";
  }
}

/**
 * P2O Step 2: Record transparent pricing update or price adjustment on JobCard.
 */
export function updateJobCardPricing(
  jobId: string,
  pricing: {
    finalCost: PricingBreakdown;
    priceAdjustment?: FinalPriceAdjustment;
  }
): JobCard | null {
  const cards = getJobCards();
  const idx = cards.findIndex((c) => c.jobId === jobId);
  if (idx === -1) return null;

  const card = cards[idx];
  const updatedCard: JobCard = {
    ...card,
    finalCost: pricing.finalCost,
    priceAdjustment: pricing.priceAdjustment || card.priceAdjustment,
  };
  cards[idx] = updatedCard;
  saveJobCards(cards);

  enqueueSyncOperation({
    entityType: "job_card",
    entityId: jobId,
    operationType: "update",
    payload: {
      jobId,
      finalCost: pricing.finalCost,
      priceAdjustment: pricing.priceAdjustment,
      updatedAt: new Date().toISOString(),
    },
  });

  return updatedCard;
}

