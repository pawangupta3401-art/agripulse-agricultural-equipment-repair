/**
 * jobReadinessService.ts
 * ─────────────────────
 * JOB-READY VERIFICATION FEATURE (Spraying Operation)
 *
 * Provides:
 *  • getInitialSprayingChecks()   – seed the 5 safety checks
 *  • computeJobReadyResult()      – deterministic rule engine (checklist + visual)
 *  • buildJobReadinessRecord()    – assemble a full record
 *  • saveJobReadinessRecord()     – persist to localStorage + enqueue offline sync
 *  • getJobReadinessRecords()     – retrieve all records
 *  • getJobReadinessForRepair()   – lookup by repairRequestId
 *  • buildEvidenceMetadata()      – lightweight metadata for sync outbox
 *
 * Rule Engine Priority (STEP 4 of MVP spec):
 *  1. evidence_quality = insufficient              → NEED_RECHECK
 *  2. visible_leak = true                          → NOT_JOB_READY
 *  3. nozzle_activity = false/null (required)      → NOT_JOB_READY
 *  4. visible_damage = true                        → NOT_JOB_READY
 *  5. safety_check checklist FAIL                  → STOP_AND_TECHNICIAN
 *  6. no_leak checklist FAIL                       → NOT_JOB_READY
 *  7. all_nozzles_active checklist FAIL            → NOT_JOB_READY
 *  8. no evidence captured                         → NEED_RECHECK
 *  9. any required checklist item pending           → NEED_RECHECK
 * 10. all required checks PASS                     → JOB_READY
 */

import {
  JobReadinessRecord,
  JobReadyCheck,
  JobReadyCheckId,
  JobReadyCheckStatus,
  JobReadyOverallStatus,
  VisualAnalysisResult,
  EvidenceCaptureMetadata,
} from "@/types";
import { enqueueSyncOperation } from "./syncQueueService";

const STORAGE_KEY = "agripulse_job_readiness_v1";

// ─── Seed Checks ────────────────────────────────────────────────────────────

export const SPRAYING_CHECKS: Array<{
  id: JobReadyCheckId;
  labelHi: string;
  isRequired: boolean;
  isTechnicianVerified?: boolean;
}> = [
  {
    id: "no_leak",
    labelHi: "पानी का रिसाव नहीं है",
    isRequired: true,
  },
  {
    id: "all_nozzles_active",
    labelHi: "सभी nozzles से spray निकल रहा है",
    isRequired: true,
  },
  {
    id: "spray_pattern_normal",
    labelHi: "spray pattern सामान्य है",
    isRequired: true,
  },
  {
    id: "safety_check",
    labelHi: "Safety check passed (Technician-Verified)",
    isRequired: true,
    isTechnicianVerified: true,
  },
];

export function getInitialSprayingChecks(): JobReadyCheck[] {
  return SPRAYING_CHECKS.map((c) => ({
    ...c,
    status: "pending" as JobReadyCheckStatus,
  }));
}

// ─── Evidence Metadata Helpers ────────────────────────────────────────────────

/**
 * Build lightweight metadata for a captured evidence item.
 * The raw base64/objectURL stays local; only metadata enters the sync queue.
 */
export function buildEvidenceMetadata(params: {
  evidenceUrl: string;
  index: number;
  capturedAt?: string;
}): EvidenceCaptureMetadata {
  const isPhoto = params.evidenceUrl.startsWith("data:image");
  const sizeBytes = isPhoto
    ? Math.round((params.evidenceUrl.length * 3) / 4) // rough base64 estimate
    : undefined;

  return {
    captureId: `cap-${Date.now()}-${params.index}`,
    capturedAt: params.capturedAt || new Date().toISOString(),
    mediaType: isPhoto ? "photo" : "video",
    sizeBytes,
    localKey: `jrv_evidence_${params.index}_${Date.now()}`,
  };
}

// ─── Rule Engine ────────────────────────────────────────────────────────────

export interface JobReadyResult {
  status: JobReadyOverallStatus;
  score: number;
  reason: string;
  failedCheck?: string;
}

/**
 * Deterministic rule engine for spraying operation.
 *
 * Integrates both checklist answers AND visual analysis output.
 * Visual analysis results are advisory inputs — the rule engine
 * makes ALL safety-critical decisions deterministically.
 *
 * Rules (evaluated in priority order):
 *
 * VISUAL ANALYSIS RULES (evaluated first when visual result is available):
 *  VA-1. evidence_quality = insufficient → NEED_RECHECK
 *  VA-2. visible_leak = true             → NOT_JOB_READY
 *  VA-3. nozzle_activity = false         → NOT_JOB_READY
 *  VA-4. visible_damage = true           → NOT_JOB_READY
 *
 * CHECKLIST RULES (always evaluated):
 *  CL-1. safety_check FAIL              → STOP_AND_TECHNICIAN
 *  CL-2. no_leak FAIL                   → NOT_JOB_READY
 *  CL-3. all_nozzles_active FAIL        → NOT_JOB_READY
 *
 * COMPLETENESS RULES:
 *  CO-1. No evidence captured           → NEED_RECHECK
 *  CO-2. Any required check pending     → NEED_RECHECK
 *
 * SUCCESS:
 *  ALL required checks PASS             → JOB_READY
 */
export function computeJobReadyResult(
  checks: JobReadyCheck[],
  evidence: string[],
  visualAnalysis?: VisualAnalysisResult
): JobReadyResult {
  const get = (id: JobReadyCheckId) => checks.find((c) => c.id === id);

  // ── Visual Analysis Rules ────────────────────────────────────────────────
  if (visualAnalysis) {
    // VA-1: Insufficient evidence quality
    if (visualAnalysis.evidence_quality === "insufficient") {
      return {
        status: "NEED_RECHECK",
        score: 40,
        reason: "Video/Photo की quality ठीक नहीं है। बेहतर रोशनी में दोबारा capture करें।",
        failedCheck: "Evidence Quality",
      };
    }

    // VA-2: Leak detected
    if (visualAnalysis.visible_leak === true) {
      return {
        status: "NOT_JOB_READY",
        score: 15,
        reason: "Video में पानी का रिसाव दिखा — मशीन Job-Ready नहीं है।",
        failedCheck: "Leakage Check",
      };
    }

    // VA-3: No nozzle activity detected
    if (visualAnalysis.nozzle_activity === false) {
      return {
        status: "NOT_JOB_READY",
        score: 25,
        reason: "Video में nozzle से spray नहीं दिखी — मशीन Job-Ready नहीं है।",
        failedCheck: "Nozzle Activity",
      };
    }

    // VA-4: Visible damage
    if (visualAnalysis.visible_damage === true) {
      return {
        status: "NOT_JOB_READY",
        score: 20,
        reason: "Video में मशीन को नुकसान दिखा — Technician को बुलाएं।",
        failedCheck: "Visible Damage",
      };
    }
  }

  // ── Checklist Rules ──────────────────────────────────────────────────────
  const safety = get("safety_check");
  const leak = get("no_leak");
  const nozzles = get("all_nozzles_active");

  // CL-1: Safety failure → immediate stop
  if (safety?.status === "fail") {
    return {
      status: "STOP_AND_TECHNICIAN",
      score: 0,
      reason: "Safety check failed. Technician must inspect before use.",
      failedCheck: "Safety / Technician Verification",
    };
  }

  // CL-2: Leak present → not job ready
  if (leak?.status === "fail") {
    return {
      status: "NOT_JOB_READY",
      score: 20,
      reason: "पानी का रिसाव मिला — मशीन Job-Ready नहीं है।",
      failedCheck: "Leakage Check",
    };
  }

  // CL-3: Inactive nozzles → not job ready
  if (nozzles?.status === "fail") {
    return {
      status: "NOT_JOB_READY",
      score: 30,
      reason: "कुछ nozzles से spray नहीं निकल रही — मशीन Job-Ready नहीं है।",
      failedCheck: "Nozzle Activity",
    };
  }

  // ── Completeness Rules ────────────────────────────────────────────────────
  // CO-1: No evidence captured
  if (evidence.length === 0) {
    return {
      status: "NEED_RECHECK",
      score: 50,
      reason: "Clean Water Test का कोई प्रमाण नहीं मिला। कृपया photo/video लें।",
      failedCheck: "Evidence Capture",
    };
  }

  // CO-2: Any required check still pending
  const pendingRequired = checks.filter(
    (c) => c.isRequired && c.status === "pending"
  );
  if (pendingRequired.length > 0) {
    return {
      status: "NEED_RECHECK",
      score: 40,
      reason: "कुछ जाँच अभी बाकी हैं। सभी checklist पूरी करें।",
      failedCheck: pendingRequired[0]?.labelHi,
    };
  }

  // ── Success ───────────────────────────────────────────────────────────────
  const passedCount = checks.filter(
    (c) => c.isRequired && c.status === "pass"
  ).length;
  const requiredCount = checks.filter((c) => c.isRequired).length;

  // Boost score slightly when visual analysis confirms pass
  const baseScore = Math.round((passedCount / requiredCount) * 100);
  const visualBonus =
    visualAnalysis?.source !== "mock_fallback" &&
    visualAnalysis?.nozzle_activity === true &&
    visualAnalysis?.visible_leak === false
      ? 0 // real model: no artificial bonus needed — score is the score
      : 0;
  const score = Math.min(100, baseScore + visualBonus);

  return {
    status: "JOB_READY",
    score,
    reason: "सभी जाँचें पास हुईं। मशीन आज की spraying के लिए तैयार है — मशीन Job-Ready है।",
  };
}

// ─── Storage Helpers ─────────────────────────────────────────────────────────

function isAvailable(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

export function getJobReadinessRecords(): JobReadinessRecord[] {
  if (!isAvailable()) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as JobReadinessRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveJobReadinessRecord(
  record: JobReadinessRecord
): JobReadinessRecord {
  if (!isAvailable()) return record;
  try {
    const records = getJobReadinessRecords();
    const idx = records.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      records[idx] = record;
    } else {
      records.push(record);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Offline-first: fail silently
  }

  // ── Enqueue for offline sync ──────────────────────────────────────────────
  // Strip large evidence data URLs from the sync payload (Step 8 requirement:
  // "Do NOT upload large media repeatedly").
  try {
    // Build payload without raw evidence data — only lightweight metadata
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { evidence: _rawEvidence, ...recordWithoutEvidence } = record;
    const syncPayload = {
      ...recordWithoutEvidence,
      evidenceCount: _rawEvidence.length,
    };

    enqueueSyncOperation({
      entityType: "job_readiness_record",
      entityId: record.id,
      operationType: record.farmerVerified ? "update" : "create",
      payload: syncPayload,
    });
  } catch {
    // Sync queue failure should never block the local save
  }

  return record;
}

export function getJobReadinessForRepair(
  repairRequestId: string
): JobReadinessRecord | null {
  const all = getJobReadinessRecords();
  return all.find((r) => r.repairRequestId === repairRequestId) ?? null;
}

/**
 * Build a new JobReadinessRecord from completed check state.
 */
export function buildJobReadinessRecord(params: {
  machineId: string;
  repairRequestId: string;
  checks: JobReadyCheck[];
  evidence: string[];
  evidenceMetadata?: EvidenceCaptureMetadata[];
  visualAnalysis?: VisualAnalysisResult;
  technicianId?: string;
  technicianNameHi?: string;
  farmerVerified: boolean;
}): JobReadinessRecord {
  const result = computeJobReadyResult(
    params.checks,
    params.evidence,
    params.visualAnalysis
  );
  return {
    id: `jrv-${params.repairRequestId}-${Date.now()}`,
    machineId: params.machineId,
    repairRequestId: params.repairRequestId,
    operation: "spraying",
    status: result.status,
    score: result.score,
    checks: params.checks,
    evidence: params.evidence,
    evidenceMetadata: params.evidenceMetadata,
    visualAnalysis: params.visualAnalysis,
    technicianId: params.technicianId,
    technicianNameHi: params.technicianNameHi,
    farmerVerified: params.farmerVerified,
    createdAt: new Date().toISOString(),
  };
}
