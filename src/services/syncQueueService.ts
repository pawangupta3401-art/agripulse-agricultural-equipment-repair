/**
 * Persistent Sync Queue & Cloud Sync Manager — P2J Step 1 AgriPulse
 *
 * Implements an offline-first, crash-resilient sync queue.
 * - Saves local changes immediately.
 * - Enqueues atomic operations for cloud synchronization.
 * - Auto-retries with a strict max-attempts limit (Attempt 1 -> Attempt 2 -> Failed).
 * - Implements latest-valid-timestamp conflict resolution without overwriting local data.
 * - Maps sync states to farmer-friendly Hindi messages without technical jargon.
 */

import {
  SyncEntityType,
  SyncOperation,
  SyncOperationStatus,
  SyncOperationType,
} from "@/types";
import { getBackendProvider } from "./backendProvider";

export const SYNC_QUEUE_STORAGE_KEY = "agripulse_sync_queue_v1";
export const MAX_SYNC_RETRIES = 3;
/** Minimum milliseconds between automatic sync attempts (throttle guard) */
export const MIN_SYNC_INTERVAL_MS = 5_000;

// Concurrency lock to prevent multiple simultaneous sync cycles
let isSyncingInProgress = false;

// Last sync attempt timestamp for throttled auto-sync
let lastSyncAttemptTimestamp = 0;
let memoryQueue: SyncOperation[] = [];

function isStorageAvailable(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage !== null;
  } catch {
    return false;
  }
}

/**
 * Load the persistent sync queue from localStorage (with memory fallback)
 */
export function getSyncQueue(): SyncOperation[] {
  if (!isStorageAvailable()) return memoryQueue;
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_STORAGE_KEY);
    if (!raw) return memoryQueue;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : memoryQueue;
  } catch {
    return memoryQueue;
  }
}

/**
 * Persist the sync queue to localStorage (with memory fallback)
 */
export function saveSyncQueue(queue: SyncOperation[]): void {
  memoryQueue = [...queue];
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(SYNC_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Fail-safe storage handling
  }
}

/**
 * Enqueue a new operation to the persistent sync queue (Requirement 2 & 4).
 * Always adds to queue immediately and returns the operation object.
 */
export function enqueueSyncOperation(params: {
  entityType: SyncEntityType;
  entityId: string;
  operationType: SyncOperationType;
  payload: any;
  createdAt?: string;
  operationId?: string;
}): SyncOperation {
  const opId = params.operationId || `op-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newOp: SyncOperation = {
    operationId: opId,
    entityType: params.entityType,
    entityId: params.entityId,
    operationType: params.operationType,
    payload: params.payload,
    createdAt: params.createdAt || new Date().toISOString(),
    retryCount: 0,
    syncStatus: "pending",
  };

  const current = getSyncQueue();
  // 1. Deduplicate if an exact operationId already exists
  const existingOp = current.find((op) => op.operationId === newOp.operationId);
  if (existingOp) {
    return existingOp;
  }

  // 2. Deduplicate if an identical entity + operationType is already pending (idempotent protection)
  const pendingIndex = current.findIndex(
    (op) =>
      op.syncStatus === "pending" &&
      op.entityType === newOp.entityType &&
      op.entityId === newOp.entityId &&
      op.operationType === newOp.operationType
  );
  if (pendingIndex >= 0) {
    current[pendingIndex].payload = newOp.payload;
    current[pendingIndex].createdAt = newOp.createdAt;
    saveSyncQueue([...current]);
    return current[pendingIndex];
  }

  saveSyncQueue([...current, newOp]);
  return newOp;
}

/**
 * Get all operations waiting to be synced (status = "pending")
 */
export function getPendingSyncOperations(): SyncOperation[] {
  return getSyncQueue().filter((op) => op.syncStatus === "pending");
}

/**
 * Count of pending operations
 */
export function getPendingSyncCount(): number {
  return getPendingSyncOperations().length;
}

/**
 * Count of operations requiring attention or failed
 */
export function getFailedSyncCount(): number {
  return getSyncQueue().filter((op) => op.syncStatus === "failed" || op.isConflict).length;
}

/**
 * User-facing Hindi sync status indicator message (Requirement 6).
 * Absolutely no technical error codes or stack traces.
 */
export function getFarmerSyncStatus(isOnline: boolean): {
  icon: string;
  labelHi: string;
  colorClass: string;
  pendingCount: number;
} {
  const pending = getPendingSyncCount();

  if (isSyncingInProgress) {
    return {
      icon: "🔄",
      labelHi: "डेटा भेजा जा रहा है",
      colorClass: "bg-blue-100 text-blue-900 border-blue-300",
      pendingCount: pending,
    };
  }

  if (!isOnline || pending > 0) {
    return {
      icon: "🟠",
      labelHi: "इंटरनेट आने पर डेटा भेजा जाएगा",
      colorClass: "bg-amber-100 text-amber-900 border-amber-300",
      pendingCount: pending,
    };
  }

  return {
    icon: "🟢",
    labelHi: "डेटा सुरक्षित है",
    colorClass: "bg-emerald-100 text-emerald-900 border-emerald-300",
    pendingCount: 0,
  };
}

/**
 * Process the persistent sync queue (Requirements 4, 5, 7, 10, 11).
 *
 * Rules:
 * 1. Checks online status (offline: do not attempt cloud network call).
 * 2. Deduplicates concurrent sync runs via in-memory lock.
 * 3. Sends pending operations to the active BackendProvider.
 * 4. On success: marks operations as "synced".
 * 5. On failure: increments retryCount (Attempt 1 -> 2 -> 3 -> "failed").
 * 6. Never deletes local data because cloud sync failed.
 */
export async function processSyncQueue(options?: {
  force?: boolean;
}): Promise<{
  success: boolean;
  syncedCount: number;
  failedCount: number;
  pendingRemaining: number;
  error?: string;
}> {
  // Offline Guard (Requirement 1 & 10)
  const isOnline =
    typeof navigator === "undefined" || typeof navigator.onLine !== "boolean" ? true : navigator.onLine;

  if (!isOnline && !options?.force) {
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      pendingRemaining: getPendingSyncCount(),
      error: "ऑफ़लाइन: इंटरनेट उपलब्ध नहीं है",
    };
  }

  // Concurrency Guard
  if (isSyncingInProgress) {
    return {
      success: false,
      syncedCount: 0,
      failedCount: 0,
      pendingRemaining: getPendingSyncCount(),
      error: "सिंक पहले से जारी है",
    };
  }

  // Throttle Guard (unless forced)
  const now = Date.now();
  if (!options?.force && now - lastSyncAttemptTimestamp < MIN_SYNC_INTERVAL_MS) {
    return {
      success: true,
      syncedCount: 0,
      failedCount: 0,
      pendingRemaining: getPendingSyncCount(),
    };
  }

  lastSyncAttemptTimestamp = now;
  isSyncingInProgress = true;

  try {
    const queue = getSyncQueue();
    // Only pick operations with syncStatus === "pending" and retryCount < MAX_SYNC_RETRIES
    const operationsToSync = queue.filter(
      (op) => op.syncStatus === "pending" && op.retryCount < MAX_SYNC_RETRIES
    );

    if (operationsToSync.length === 0) {
      isSyncingInProgress = false;
      return {
        success: true,
        syncedCount: 0,
        failedCount: 0,
        pendingRemaining: getPendingSyncCount(),
      };
    }

    // Mark items as "syncing"
    const syncingQueue = queue.map((op) => {
      if (operationsToSync.some((o) => o.operationId === op.operationId)) {
        return { ...op, syncStatus: "syncing" as SyncOperationStatus, lastAttemptAt: new Date().toISOString() };
      }
      return op;
    });
    saveSyncQueue(syncingQueue);

    // Call BackendProvider
    const provider = getBackendProvider();
    const batchResult = await provider.syncOperations(operationsToSync);

    // Update queue according to individual operation results
    const resultMap = new Map<string, { success: boolean; error?: string }>();
    for (const r of batchResult.results) {
      resultMap.set(r.operationId, { success: r.success, error: r.error });
    }

    const updatedQueue = getSyncQueue().map((op) => {
      const res = resultMap.get(op.operationId);
      if (!res) return op;

      if (res.success) {
        return {
          ...op,
          syncStatus: "synced" as SyncOperationStatus,
          errorMessage: undefined,
          isConflict: false,
        };
      } else {
        const nextRetry = op.retryCount + 1;
        const isConflict = (res.error || "").includes("conflict");
        const nextStatus: SyncOperationStatus =
          nextRetry >= MAX_SYNC_RETRIES || isConflict ? "failed" : "pending";

        return {
          ...op,
          retryCount: nextRetry,
          syncStatus: nextStatus,
          errorMessage: res.error,
          isConflict,
        };
      }
    });

    saveSyncQueue(updatedQueue);
    isSyncingInProgress = false;

    return {
      success: batchResult.success,
      syncedCount: batchResult.syncedCount,
      failedCount: batchResult.failedCount,
      pendingRemaining: getPendingSyncCount(),
    };
  } catch (err: any) {
    // If an unexpected crash occurs, increment retry count on attempted operations and KEEP IN QUEUE
    isSyncingInProgress = false;
    const currentQueue = getSyncQueue();
    const recoveredQueue = currentQueue.map((op) => {
      if (op.syncStatus === "syncing") {
        const nextRetry = op.retryCount + 1;
        return {
          ...op,
          retryCount: nextRetry,
          syncStatus: (nextRetry >= MAX_SYNC_RETRIES ? "failed" : "pending") as SyncOperationStatus,
          errorMessage: err?.message || "Sync execution error",
        };
      }
      return op;
    });
    saveSyncQueue(recoveredQueue);

    return {
      success: false,
      syncedCount: 0,
      failedCount: 1,
      pendingRemaining: getPendingSyncCount(),
      error: "सिंक विफल रहा, डेटा स्थानीय रूप से सुरक्षित है",
    };
  }
}

/**
 * Diagnostic & Testing Helper: Clear sync queue
 */
export function resetSyncQueue(): void {
  memoryQueue = [];
  if (isStorageAvailable()) {
    localStorage.removeItem(SYNC_QUEUE_STORAGE_KEY);
  }
}
