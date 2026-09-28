/**
 * SyncManager — P2J Step 1 AgriPulse
 *
 * Reusable, singleton sync manager that orchestrates the full offline-first
 * cloud synchronisation lifecycle.
 *
 * Flow:
 *   User action → Save locally → Enqueue in sync queue
 *   → Network becomes available → SyncManager.runSync()
 *   → processSyncQueue() → BackendProvider.syncOperations()
 *   → Success → Mark as "synced"
 *   → Failure → Keep local, keep queue item, increment retryCount
 *
 * Conflict safety:
 *   - Never overwrites newer local data with older remote data.
 *   - Uses ISO timestamps for comparison.
 *   - Unresolvable conflicts are marked as requiring attention (isConflict=true).
 *
 * No real backend is connected. MockBackendProvider is used for all testing.
 */

import {
  processSyncQueue,
  getPendingSyncCount,
  getFailedSyncCount,
  getSyncQueue,
  getFarmerSyncStatus,
} from "./syncQueueService";
import { getBackendProvider } from "./backendProvider";

export type SyncManagerStatus =
  | "idle"           // Nothing pending, all good
  | "pending"        // Operations waiting to be synced
  | "syncing"        // Sync in progress
  | "synced"         // Just finished successfully
  | "failed"         // Last sync had failures
  | "offline";       // Device is offline

export interface SyncManagerState {
  status: SyncManagerStatus;
  pendingCount: number;
  failedCount: number;
  lastSyncAt?: string;
  lastSyncedCount: number;
  lastFailedCount: number;
  /** Farmer-friendly Hindi label for the current status */
  labelHi: string;
  /** Emoji icon for the current status */
  icon: string;
}

export interface SyncRunResult {
  triggered: boolean;
  success: boolean;
  syncedCount: number;
  failedCount: number;
  pendingRemaining: number;
  /** Farmer-friendly Hindi message about the result */
  messageHi: string;
}

// ─── SyncManager Singleton ────────────────────────────────────────────────────

let _status: SyncManagerStatus = "idle";
let _lastSyncAt: string | undefined;
let _lastSyncedCount = 0;
let _lastFailedCount = 0;

/** Listeners registered via onStatusChange() */
const _listeners: Array<(state: SyncManagerState) => void> = [];

function _notify(): void {
  const state = SyncManager.getState();
  for (const fn of _listeners) {
    try {
      fn(state);
    } catch {
      // Never let a listener crash the sync process
    }
  }
}

function _isOnline(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.onLine !== "boolean") return true;
  return navigator.onLine;
}

function _buildLabelHi(status: SyncManagerStatus, _pendingCount: number): string {
  switch (status) {
    case "syncing":
      return "डेटा भेजा जा रहा है";
    case "synced":
      return "डेटा सुरक्षित है";
    case "failed":
      return "इंटरनेट धीमा है। आपका डेटा सुरक्षित है।";
    case "offline":
      return "इंटरनेट नहीं है — डेटा फोन में सुरक्षित है";
    case "pending":
      return "डेटा फोन में सुरक्षित है";
    case "idle":
    default:
      return "डेटा सुरक्षित है";
  }
}

function _buildIcon(status: SyncManagerStatus): string {
  switch (status) {
    case "syncing":  return "🔄";
    case "synced":   return "🟢";
    case "failed":   return "🔴";
    case "offline":  return "🟠";
    case "pending":  return "🟠";
    case "idle":
    default:         return "🟢";
  }
}

// ─── Public SyncManager API ───────────────────────────────────────────────────

export const SyncManager = {
  /**
   * Get the current sync manager state snapshot.
   */
  getState(): SyncManagerState {
    const pendingCount = getPendingSyncCount();
    const failedCount = getFailedSyncCount();

    let derivedStatus: SyncManagerStatus = _status;
    if (_status !== "syncing") {
      if (!_isOnline()) {
        derivedStatus = "offline";
      } else if (pendingCount > 0) {
        derivedStatus = "pending";
      } else if (failedCount > 0) {
        derivedStatus = "failed";
      } else {
        derivedStatus = "idle";
      }
    }

    return {
      status: derivedStatus,
      pendingCount,
      failedCount,
      lastSyncAt: _lastSyncAt,
      lastSyncedCount: _lastSyncedCount,
      lastFailedCount: _lastFailedCount,
      labelHi: _buildLabelHi(derivedStatus, pendingCount),
      icon: _buildIcon(derivedStatus),
    };
  },

  /**
   * Get a quick farmer-friendly status pill (icon + label + colorClass).
   * Compatible with the existing getFarmerSyncStatus helper.
   */
  getFarmerStatus(isOnline: boolean) {
    return getFarmerSyncStatus(isOnline);
  },

  /**
   * Run a full sync cycle.
   *
   * - If offline: no network call; returns immediately with a safe message.
   * - If online: processes the pending queue via the active BackendProvider.
   * - On success: marks operations as "synced".
   * - On failure: increments retryCount, keeps operations in queue.
   *
   * @param force Skip throttle / concurrency checks (use for explicit user-triggered syncs)
   */
  async runSync(force = false): Promise<SyncRunResult> {
    if (!_isOnline()) {
      return {
        triggered: false,
        success: false,
        syncedCount: 0,
        failedCount: 0,
        pendingRemaining: getPendingSyncCount(),
        messageHi: "इंटरनेट नहीं है। आपका डेटा फोन में सुरक्षित है।",
      };
    }

    if (getPendingSyncCount() === 0 && !force) {
      return {
        triggered: false,
        success: true,
        syncedCount: 0,
        failedCount: 0,
        pendingRemaining: 0,
        messageHi: "डेटा सुरक्षित है।",
      };
    }

    _status = "syncing";
    _notify();

    try {
      const result = await processSyncQueue({ force });

      _lastSyncAt = new Date().toISOString();
      _lastSyncedCount = result.syncedCount;
      _lastFailedCount = result.failedCount;

      if (result.success) {
        _status = "synced";
        _notify();
        // Reset to idle after a short display window
        setTimeout(() => {
          _status = "idle";
          _notify();
        }, 4000);
      } else {
        _status = "failed";
        _notify();
        setTimeout(() => {
          _status = "idle";
          _notify();
        }, 4000);
      }

      return {
        triggered: true,
        success: result.success,
        syncedCount: result.syncedCount,
        failedCount: result.failedCount,
        pendingRemaining: result.pendingRemaining,
        messageHi: result.success
          ? "डेटा भेजा गया। सब कुछ सुरक्षित है।"
          : result.error || "कुछ डेटा नहीं भेजा जा सका। दोबारा कोशिश होगी।",
      };
    } catch {
      _status = "failed";
      _lastFailedCount = getPendingSyncCount();
      _notify();
      setTimeout(() => {
        _status = "idle";
        _notify();
      }, 4000);

      return {
        triggered: true,
        success: false,
        syncedCount: 0,
        failedCount: _lastFailedCount,
        pendingRemaining: getPendingSyncCount(),
        messageHi: "सिंक विफल रहा। डेटा फोन में सुरक्षित है।",
      };
    }
  },

  /**
   * Register a listener that fires whenever the sync state changes.
   * Returns an unsubscribe function.
   */
  onStatusChange(fn: (state: SyncManagerState) => void): () => void {
    _listeners.push(fn);
    return () => {
      const idx = _listeners.indexOf(fn);
      if (idx >= 0) _listeners.splice(idx, 1);
    };
  },

  /**
   * Initialise event-based auto-sync.
   * Call once at app startup (e.g., in a useEffect).
   * Returns a cleanup function to remove the listeners.
   */
  initAutoSync(): () => void {
    if (typeof window === "undefined") return () => {};

    const handleOnline = () => {
      SyncManager.runSync(false).catch(() => null);
    };

    window.addEventListener("online", handleOnline);

    // Periodic auto-retry every 30 s while there are pending operations
    const retryInterval = setInterval(() => {
      if (_isOnline() && getPendingSyncCount() > 0) {
        SyncManager.runSync(false).catch(() => null);
      }
    }, 30_000);

    return () => {
      window.removeEventListener("online", handleOnline);
      clearInterval(retryInterval);
    };
  },

  /**
   * Diagnostic: full queue snapshot (for debug panels / tests).
   */
  getQueueSnapshot() {
    return getSyncQueue();
  },

  /**
   * Diagnostic: get the active backend provider name.
   */
  getProviderName(): string {
    return getBackendProvider().providerName;
  },
};

export default SyncManager;
