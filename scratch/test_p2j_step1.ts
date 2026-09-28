import {
  MockBackendProvider,
  getBackendProvider,
  setBackendProvider,
} from "../src/services/backendProvider";
import {
  enqueueSyncOperation,
  getSyncQueue,
  getPendingSyncCount,
  getFarmerSyncStatus,
  processSyncQueue,
  resetSyncQueue,
  MAX_SYNC_RETRIES,
} from "../src/services/syncQueueService";
import { SyncEntityType } from "../src/types";

// Mock localStorage for Node environment if needed
if (typeof global.localStorage === "undefined") {
  const store = new Map<string, string>();
  global.localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, val: string) => { store.set(key, val); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
    length: 0,
    key: () => null,
  } as any;
}

// Mock navigator
if (typeof global.navigator === "undefined") {
  (global as any).navigator = { onLine: true };
}

async function runP2JTests() {
  console.log("==================================================");
  console.log("RUNNING P2J STEP 1 COMPREHENSIVE BACKEND & SYNC TESTS");
  console.log("==================================================");

  resetSyncQueue();
  const mockBackend = new MockBackendProvider(0); // 0ms delay for fast tests
  setBackendProvider(mockBackend);

  // 1. BackendProvider structure & abstraction
  console.log("\n1. Testing BackendProvider structure:");
  console.log("   Provider Name:", mockBackend.providerName);
  if (mockBackend.providerName !== "MockBackendProvider") {
    throw new Error("Provider name mismatch");
  }

  // 2. Testing 8 Entity Types support in Sync Queue
  console.log("\n2. Testing 8 Entity Types support:");
  const supportedEntities: SyncEntityType[] = [
    "farmer_profile",
    "machine",
    "repair_request",
    "job_card",
    "spare_parts_selection",
    "repair_verification",
    "machine_passport",
    "maintenance_record",
  ];

  for (const entity of supportedEntities) {
    const op = enqueueSyncOperation({
      entityType: entity,
      entityId: `id-${entity}-01`,
      operationType: "create",
      payload: { name: `Test ${entity}`, timestamp: new Date().toISOString() },
    });
    if (!op.operationId || op.syncStatus !== "pending" || op.entityType !== entity) {
      throw new Error(`Failed to enqueue entity ${entity}`);
    }
  }
  console.log(`   Successfully enqueued all ${supportedEntities.length} entities into sync queue!`);

  // 3. User-Facing Sync Status Indicator (Requirement 6)
  console.log("\n3. Testing Farmer-Friendly Sync Status Indicator:");
  const statusWithPending = getFarmerSyncStatus(true);
  console.log("   When items pending:", statusWithPending.icon, statusWithPending.labelHi);
  if (statusWithPending.labelHi !== "इंटरनेट आने पर डेटा भेजा जाएगा") {
    throw new Error("Expected 'इंटरनेट आने पर डेटा भेजा जाएगा'");
  }

  const statusOffline = getFarmerSyncStatus(false);
  console.log("   When offline:", statusOffline.icon, statusOffline.labelHi);
  if (statusOffline.labelHi !== "इंटरनेट आने पर डेटा भेजा जाएगा") {
    throw new Error("Expected 'इंटरनेट आने पर डेटा भेजा जाएगा' when offline");
  }

  // 4. Online Sync Flow (Requirement 4 & 10)
  console.log("\n4. Testing Online Sync Flow:");
  const syncResult = await processSyncQueue({ force: true });
  console.log("   Sync result:", syncResult);
  if (!syncResult.success || syncResult.syncedCount !== 8) {
    throw new Error(`Expected 8 synced items, got ${syncResult.syncedCount}`);
  }

  const pendingAfterSync = getPendingSyncCount();
  console.log("   Pending items after sync:", pendingAfterSync);
  if (pendingAfterSync !== 0) {
    throw new Error("Expected 0 pending items after successful sync");
  }

  const statusAllSynced = getFarmerSyncStatus(true);
  console.log("   Status after all synced:", statusAllSynced.icon, statusAllSynced.labelHi);
  if (statusAllSynced.labelHi !== "डेटा सुरक्षित है") {
    throw new Error("Expected 'डेटा सुरक्षित है'");
  }

  // 5. Failure Simulation & Auto-Retry (Requirement 5 & 11)
  console.log("\n5. Testing Failure Simulation & Auto Retry:");
  resetSyncQueue();

  const failOp = enqueueSyncOperation({
    entityType: "repair_request",
    entityId: "rep-fail-001",
    operationType: "create",
    payload: { problem: "oil leak in field" },
  });

  mockBackend.setSimulateFailure(true);

  // Attempt 1
  console.log("   --> Attempt 1 with backend failure:");
  await processSyncQueue({ force: true });
  let queue = getSyncQueue();
  let item = queue.find((o) => o.operationId === failOp.operationId);
  console.log("       Retry count:", item?.retryCount, "Status:", item?.syncStatus);
  if (item?.retryCount !== 1 || item?.syncStatus !== "pending") {
    throw new Error("Attempt 1 failed to increment retryCount to 1");
  }

  // Attempt 2
  console.log("   --> Attempt 2 with backend failure:");
  await processSyncQueue({ force: true });
  queue = getSyncQueue();
  item = queue.find((o) => o.operationId === failOp.operationId);
  console.log("       Retry count:", item?.retryCount, "Status:", item?.syncStatus);
  if (item?.retryCount !== 2 || item?.syncStatus !== "pending") {
    throw new Error("Attempt 2 failed to increment retryCount to 2");
  }

  // Attempt 3 -> mark as failed (MAX_RETRIES reached)
  console.log("   --> Attempt 3 with backend failure:");
  await processSyncQueue({ force: true });
  queue = getSyncQueue();
  item = queue.find((o) => o.operationId === failOp.operationId);
  console.log("       Retry count:", item?.retryCount, "Status:", item?.syncStatus);
  if (item?.retryCount !== 3 || item?.syncStatus !== "failed") {
    throw new Error("Attempt 3 failed to mark status as failed");
  }

  console.log("   Local data verified: item was NEVER deleted from queue!");

  // Attempt 4 -> should NOT retry continuously in a loop!
  console.log("   --> Attempt 4 (should be skipped because MAX_RETRIES reached):");
  const skipResult = await processSyncQueue({ force: true });
  console.log("       Skipped processing, synced:", skipResult.syncedCount, "failed:", skipResult.failedCount);
  if (skipResult.syncedCount !== 0) {
    throw new Error("Failed item was retried unexpectedly in loop");
  }

  // 6. Conflict Handling (Requirement 7)
  console.log("\n6. Testing Latest-Valid-Timestamp Conflict Handling:");
  mockBackend.setSimulateFailure(false);
  resetSyncQueue();

  // Create an initial record in cloud with newer timestamp
  const futureDate = new Date(Date.now() + 60000).toISOString();
  await mockBackend.createRecord("machine", {
    id: "tractor-conflict-test",
    name: "Mahindra 575 DI (Cloud Newer)",
    updatedAt: futureDate,
  });

  // Now enqueue an older local operation
  const olderDate = new Date(Date.now() - 60000).toISOString();
  const conflictOp = enqueueSyncOperation({
    entityType: "machine",
    entityId: "tractor-conflict-test",
    operationType: "update",
    payload: { name: "Mahindra 575 DI (Local Older)", updatedAt: olderDate },
    createdAt: olderDate,
  });

  const conflictSyncResult = await processSyncQueue({ force: true });
  console.log("   Conflict sync result:", conflictSyncResult);
  const queueAfterConflict = getSyncQueue();
  const conflictItem = queueAfterConflict.find((o) => o.operationId === conflictOp.operationId);
  console.log("   Conflict detected and marked?", conflictItem?.isConflict, "Status:", conflictItem?.syncStatus);
  if (!conflictItem?.isConflict) {
    throw new Error("Conflict was not properly detected");
  }

  console.log("\n==================================================");
  console.log("ALL P2J STEP 1 BACKEND & CLOUD SYNC TESTS PASSED!");
  console.log("==================================================");
}

runP2JTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
