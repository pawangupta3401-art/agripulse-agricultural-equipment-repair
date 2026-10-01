import {
  Machine,
  RepairRequest,
  UrgencyType,
  InputMethod,
  OutboxAction,
  SyncStatus,
  AIDiagnosisResult,
  MachinePassportRecord,
  PricingBreakdown,
  FinalPriceAdjustment,
} from "@/types";
import {
  normalizeMachineMaintenance,
  completeMachineService,
  createNewMachine,
  RegisterMachineParams,
} from "@/services/preventiveMaintenanceService";
import { enqueueSyncOperation, processSyncQueue } from "@/services/syncQueueService";

const MACHINES_STORAGE_KEY = "agripulse_machines_v1";
const REPAIRS_STORAGE_KEY = "agripulse_repairs_v1";
const OUTBOX_STORAGE_KEY = "agripulse_outbox_v1";

// In-memory concurrency lock to prevent duplicate simultaneous sync operations
let isSyncInProgress = false;

const getDaysOffset = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
};

export const initialMachines: Machine[] = [
  {
    id: "tractor",
    name: "Mahindra 575 DI Tractor",
    nameHi: "महिंद्रा 575 DI ट्रैक्टर",
    type: "ट्रैक्टर",
    icon: "🚜",
    status: "active",
    statusText: "चालू स्थिति में",
    lastService: "45 दिन पहले",
    nextService: "45 दिन बाद",
    operatingHours: "580 घंटे",
    serviceHistory: "4 बार नियमित सर्विस (इंजन ऑयल, फिल्टर, ब्रेक)",
    previousRepairs: "हाइड्रोलिक नोजल व पाइप बदला गया",
    partsReplaced: "हाइड्रोलिक होस पाइप, ऑयल सील",
    lastServiceDate: getDaysOffset(-45),
    nextServiceDate: getDaysOffset(45),
    serviceIntervalDays: 90,
    maintenanceItems: ["इंजन ऑयल", "हाइड्रोलिक ऑयल", "एयर फ़िल्टर", "डीजल फ़िल्टर", "ब्रेक जांच"],
    maintenanceStatus: "upcoming",
  },
  {
    id: "sprayer",
    name: "Sprayer",
    nameHi: "स्प्रेयर",
    type: "स्प्रेयर",
    icon: "🎒",
    status: "issue",
    statusText: "मरम्मत की जरूरत",
    lastService: "75 दिन पहले",
    nextService: "सर्विस बाकी है",
    operatingHours: "120 घंटे",
    serviceHistory: "2 बार नियमित सर्विस की गई",
    previousRepairs: "नोजल की सफाई और प्रेशर चेक",
    partsReplaced: "स्प्रे नोजल, रबर वाशर",
    // P2G Maintenance: Overdue (Test B)
    lastServiceDate: getDaysOffset(-75),
    nextServiceDate: getDaysOffset(-15),
    serviceIntervalDays: 60,
    maintenanceItems: ["नोज़ल", "पाइप", "पंप", "लीकेज", "फ़िल्टर"],
    maintenanceStatus: "overdue",
  },
  {
    id: "water_pump",
    name: "Water Pump",
    nameHi: "वाटर पंप",
    type: "वाटर पंप",
    icon: "💧",
    status: "active",
    statusText: "चालू स्थिति में",
    lastService: "20 दिन पहले",
    nextService: "70 दिन बाद",
    operatingHours: "340 घंटे",
    serviceHistory: "3 बार ऑयल व सील चेक",
    previousRepairs: "इंपेलर की सफाई",
    partsReplaced: "वॉटर सील, बेयरिंग",
    // P2G Maintenance: Upcoming
    lastServiceDate: getDaysOffset(-20),
    nextServiceDate: getDaysOffset(70),
    serviceIntervalDays: 90,
    maintenanceItems: ["पंप", "पाइप", "सील", "इंजन", "फ़िल्टर"],
    maintenanceStatus: "upcoming",
  },
  {
    id: "power_tiller",
    name: "Power Tiller",
    nameHi: "पावर टिलर",
    type: "पावर टिलर",
    icon: "🚜",
    status: "service_soon",
    statusText: "अगली सर्विस जल्द",
    lastService: "82 दिन पहले",
    nextService: "8 दिन में",
    operatingHours: "210 घंटे",
    serviceHistory: "इंजन सर्विस व ब्लेड जांच",
    previousRepairs: "क्लच वायर बदला गया",
    partsReplaced: "एयर फ़िल्टर, इंजन ऑयल",
    // P2G Maintenance: Due soon (Test C)
    lastServiceDate: getDaysOffset(-82),
    nextServiceDate: getDaysOffset(8),
    serviceIntervalDays: 90,
    maintenanceItems: ["इंजन ऑयल", "ब्लेड", "बेल्ट", "एयर फ़िल्टर", "क्लच"],
    maintenanceStatus: "due",
  },
];

export const initialRepairs: RepairRequest[] = [];

// Helper to safely access localStorage (client-side only)
function isStorageAvailable(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

/**
 * Load all machines from local storage or fallback to defaults.
 * Automatically normalizes maintenance dates and statuses.
 */
export function getMachines(): Machine[] {
  if (!isStorageAvailable()) return initialMachines.map((m) => normalizeMachineMaintenance(m));
  try {
    const raw = localStorage.getItem(MACHINES_STORAGE_KEY);
    if (!raw) {
      const normalizedInit = initialMachines.map((m) => normalizeMachineMaintenance(m));
      localStorage.setItem(MACHINES_STORAGE_KEY, JSON.stringify(normalizedInit));
      return normalizedInit;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((m: Machine) => normalizeMachineMaintenance(m));
    }
    return initialMachines.map((m) => normalizeMachineMaintenance(m));
  } catch {
    return initialMachines.map((m) => normalizeMachineMaintenance(m));
  }
}

/**
 * Save machines array to local storage
 */
export function saveMachines(machines: Machine[]): void {
  if (!isStorageAvailable()) return;
  try {
    localStorage.setItem(MACHINES_STORAGE_KEY, JSON.stringify(machines));
  } catch {
    // Fail silently in browser
  }
}

/**
 * P2G Step 2: Register a new machine with automatic maintenance schedule.
 */
export function registerNewMachine(params: RegisterMachineParams): Machine {
  const newMachine = createNewMachine(params);
  if (isStorageAvailable()) {
    try {
      const current = getMachines();
      const updated = [newMachine, ...current];
      saveMachines(updated);

      // P2J Step 1: Enqueue machine creation to persistent sync queue
      enqueueSyncOperation({
        entityType: "machine",
        entityId: newMachine.id,
        operationType: "create",
        payload: newMachine,
      });
    } catch {
      // Fail silently
    }
  }
  return newMachine;
}

/**
 * P2G Step 2: Mark a machine's preventive service as completed.
 * Recalculates nextServiceDate, resets status to 'upcoming',
 * records service event in machine history.
 */
export function markMachineServiceCompleted(machineId: string): Machine | null {
  if (!isStorageAvailable()) return null;
  try {
    const machines = getMachines();
    const idx = machines.findIndex((m) => m.id === machineId);
    if (idx === -1) return null;
    const updated = completeMachineService(machines[idx]);
    machines[idx] = updated;
    saveMachines(machines);

    // P2J Step 1: Enqueue maintenance record update
    enqueueSyncOperation({
      entityType: "maintenance_record",
      entityId: `${machineId}-svc-${Date.now()}`,
      operationType: "create",
      payload: {
        machineId,
        lastServiceDate: updated.lastServiceDate,
        nextServiceDate: updated.nextServiceDate,
        maintenanceStatus: updated.maintenanceStatus,
        completedAt: new Date().toISOString(),
      },
    });

    return updated;
  } catch {
    return null;
  }
}

/**
 * Get machine by ID
 */
export function getMachineById(id: string): Machine | undefined {
  const machines = getMachines();
  return machines.find((m) => m.id === id);
}

/**
 * Load all repair requests, ensuring unique IDs (deduplication)
 */
export function getRepairRequests(): RepairRequest[] {
  if (!isStorageAvailable()) return initialRepairs;
  try {
    const raw = localStorage.getItem(REPAIRS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(initialRepairs));
      return initialRepairs;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Deduplicate by id to guarantee integrity
      const seen = new Set<string>();
      return parsed.filter((r: RepairRequest) => {
        if (!r.id || seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
      });
    }
    return initialRepairs;
  } catch {
    return initialRepairs;
  }
}

/**
 * Get count of complaints still waiting to be synced
 */
export function getPendingComplaintsCount(): number {
  const repairs = getRepairRequests();
  return repairs.filter((r) => r.syncStatus === "pending").length;
}

/**
 * Get latest active repair request
 */
export function getActiveRepair(): RepairRequest | null {
  const repairs = getRepairRequests();
  const active = repairs.find((r) => r.status !== "completed");
  return active || (repairs.length > 0 ? repairs[0] : null);
}

/**
 * Load local outbox actions
 */
export function getOutbox(): OutboxAction[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Add an action to the local outbox, preventing duplicate entries with the same ID
 */
export function addToOutbox(
  action: Omit<OutboxAction, "id" | "createdAt"> & { id?: string }
): OutboxAction {
  const newAction: OutboxAction = {
    id: action.id || `outbox-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    type: action.type,
    createdAt: new Date().toISOString(),
    payload: action.payload,
    syncStatus: action.syncStatus,
  };

  if (isStorageAvailable()) {
    try {
      const current = getOutbox();
      // Deduplication: do not add if an action with this id already exists
      if (!current.some((item) => item.id === newAction.id)) {
        const updated = [newAction, ...current];
        localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {
      // Fail silently
    }
  }

  return newAction;
}

/**
 * Process automatic synchronization of pending complaints from the local queue.
 *
 * Rules:
 * 1. Simulates realistic network delay (800ms).
 * 2. Deduplicates complaints using a processed ID set and in-flight sync lock.
 * 3. Never deletes complaints on failure; keeps them as pending.
 * 4. Only marks as "synced" upon successful processing.
 */
export async function syncPendingOutbox(): Promise<{
  success: boolean;
  syncedCount: number;
  error?: string;
}> {
  if (!isStorageAvailable()) {
    return { success: true, syncedCount: 0 };
  }

  // Prevent duplicate concurrent sync runs
  if (isSyncInProgress) {
    return { success: false, syncedCount: 0, error: "Sync already in progress" };
  }

  isSyncInProgress = true;

  try {
    const outbox = getOutbox();
    const pendingActions = outbox.filter((item) => item.syncStatus === "pending");

    if (pendingActions.length === 0) {
      isSyncInProgress = false;
      return { success: true, syncedCount: 0 };
    }

    // Simulate reliable upload processing delay
    await new Promise((resolve) => setTimeout(resolve, 900));

    // Deduplication tracking: process each unique complaint ID exactly once
    const processedComplaintIds = new Set<string>();

    const updatedOutbox = outbox.map((item) => {
      if (item.syncStatus === "pending") {
        const complaint = item.payload as RepairRequest;
        if (complaint && complaint.id) {
          processedComplaintIds.add(complaint.id);
        }
        return { ...item, syncStatus: "synced" as SyncStatus };
      }
      return item;
    });

    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(updatedOutbox));

    // Update corresponding local repair requests
    const repairs = getRepairRequests();
    const updatedRepairs = repairs.map((repair) => {
      if (repair.syncStatus === "pending" || processedComplaintIds.has(repair.id)) {
        return {
          ...repair,
          syncStatus: "synced" as SyncStatus,
          statusTextHi: "मैकेनिक खोज रहे हैं",
        };
      }
      return repair;
    });

    // Ensure deduplication in repairs list
    const seen = new Set<string>();
    const deduplicatedRepairs = updatedRepairs.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(deduplicatedRepairs));

    // P2J Step 1: Process persistent sync queue to backend provider
    await processSyncQueue({ force: true }).catch(() => null);

    isSyncInProgress = false;
    return { success: true, syncedCount: processedComplaintIds.size };
  } catch {
    // If sync fails, do NOT delete local complaints. Leave them pending for retry.
    isSyncInProgress = false;
    return { success: false, syncedCount: 0, error: "Sync failed, kept in local queue" };
  }
}

/**
 * Create and persist a new repair request with unique ID and offline queueing
 */
export function createRepairRequest(params: {
  machineId: string;
  problemDescription: string;
  inputMethod: InputMethod;
  mediaFileName?: string;
  photoDataUrl?: string;
  urgency: UrgencyType;
  isOffline?: boolean;
  diagnosis?: AIDiagnosisResult;
  farmerId?: string;
  estimatedCost?: PricingBreakdown;
  farmerLocation?: RepairRequest["farmerLocation"];
}): RepairRequest {
  const machines = getMachines();
  const machine = machines.find((m) => m.id === params.machineId) || machines[0];
  const isOffline = !!params.isOffline;
  const syncStatus: SyncStatus = isOffline ? "pending" : "synced";

  // Generate robust, unique complaint ID
  const uniqueId = `rep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const newRepair: RepairRequest = {
    id: uniqueId,
    farmerId: params.farmerId || "farmer-001",
    machineId: machine.id,
    machineNameHi: machine.nameHi,
    machineIcon: machine.icon,
    problemDescription: params.problemDescription || "मशीन में समस्या आ रही है",
    inputMethod: params.inputMethod,
    mediaFileName: params.mediaFileName,
    photoDataUrl: params.photoDataUrl,
    urgency: params.urgency,
    status: "finding_mechanic",
    statusTextHi: isOffline
      ? "फोन में सुरक्षित (इंटरनेट की प्रतीक्षा)"
      : "मैकेनिक खोज रहे हैं",
    createdAt: new Date().toISOString(),
    verificationStatus: "pending",
    syncStatus,
    isOfflineCreated: isOffline,
    diagnosis: params.diagnosis,
    estimatedCost: params.estimatedCost,
    farmerLocation: params.farmerLocation,
  };

  if (isStorageAvailable()) {
    try {
      // 1. Save to repair requests list (with duplicate check)
      const repairs = getRepairRequests();
      if (!repairs.some((r) => r.id === newRepair.id)) {
        const updatedRepairs = [newRepair, ...repairs];
        localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(updatedRepairs));
      }

      // 2. Add to outbox queue
      addToOutbox({
        id: `action-${newRepair.id}`,
        type: "CREATE_REPAIR",
        payload: newRepair,
        syncStatus,
      });

      // P2J Step 1: Enqueue to persistent sync queue
      enqueueSyncOperation({
        entityType: "repair_request",
        entityId: newRepair.id,
        operationType: "create",
        payload: newRepair,
      });

      // 3. Update machine status to 'issue'
      const updatedMachines = machines.map((m) => {
        if (m.id === machine.id) {
          return {
            ...m,
            status: "issue" as const,
            statusText: "मरम्मत की जरूरत",
          };
        }
        return m;
      });
      saveMachines(updatedMachines);
    } catch {
      // Fail safely
    }
  }

  return newRepair;
}

/**
 * Update an existing repair request's status, parts, or other fields.
 * Used for technician updates (P2E) and spare part attachments (P2F).
 */
export function updateRepairStatus(
  repairId: string,
  updates: Partial<RepairRequest>
): RepairRequest | null {
  if (!isStorageAvailable()) return null;
  try {
    const repairs = getRepairRequests();
    const idx = repairs.findIndex((r) => r.id === repairId);
    if (idx === -1) return null;
    const updated = { ...repairs[idx], ...updates };
    repairs[idx] = updated;
    localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(repairs));

    // P2J Step 1: Enqueue update to sync queue
    enqueueSyncOperation({
      entityType: "repair_request",
      entityId: repairId,
      operationType: "update",
      payload: { ...updates, updatedAt: new Date().toISOString() },
    });

    return updated;
  } catch {
    return null;
  }
}

/**
 * P2F: Attach recommended parts, selections, and availability to repair request.
 */
export function updateRepairParts(
  repairId: string,
  data: {
    recommendedParts?: string[];
    selectedParts?: RepairRequest["selectedParts"];
    partAvailability?: Record<string, boolean>;
  }
): RepairRequest | null {
  return updateRepairStatus(repairId, data);
}

/**
 * P2F Step 2: Record machine verification result on RepairRequest.
 * If passed, sets status to 'completed' and marks machine as active in local inventory.
 * If failed, sets status to 're_repair_required'.
 */
export function recordRepairVerification(
  repairId: string,
  passed: boolean,
  passportData?: MachinePassportRecord,
  note?: string,
  verificationIdParam?: string
): RepairRequest | null {
  if (!isStorageAvailable()) return null;
  try {
    const repairs = getRepairRequests();
    const idx = repairs.findIndex((r) => r.id === repairId);
    if (idx === -1) return null;

    const repair = repairs[idx];
    const verificationId =
      verificationIdParam ||
      passportData?.verificationId ||
      repair.verificationId ||
      `verif-${repairId}-${Date.now()}`;
    const finalizedPassportData: MachinePassportRecord | undefined = passportData
      ? { ...passportData, verificationId }
      : repair.passportData
      ? { ...repair.passportData, verificationId }
      : undefined;

    const updated: RepairRequest = {
      ...repair,
      verificationId,
      status: passed ? "completed" : "re_repair_required",
      statusTextHi: passed ? "मशीन सही चल रही है" : "दोबारा जाँच की जरूरत है",
      verificationStatus: passed ? "passed" : "failed",
      verificationTime: new Date().toISOString(),
      verificationNote: note,
      passportData: finalizedPassportData,
    };
    repairs[idx] = updated;
    localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(repairs));

    // P2J Step 1: Enqueue repair verification operation
    enqueueSyncOperation({
      entityType: "repair_verification",
      entityId: verificationId,
      operationType: "create",
      payload: {
        verificationId,
        repairId,
        passed,
        verificationStatus: passed ? "passed" : "failed",
        note,
        passportData: finalizedPassportData,
        verificationTime: updated.verificationTime,
      },
    });

    // If passed, update machine status back to 'active'
    if (passed) {
      const machines = getMachines();
      const updatedMachines = machines.map((m) => {
        if (m.id === repair.machineId) {
          const costStr = finalizedPassportData?.finalCost
            ? ` [लागत: ₹${finalizedPassportData.finalCost.toLocaleString("hi-IN")}]`
            : "";
          return {
            ...m,
            status: "active" as const,
            statusText: "सक्रिय",
            lastService: new Date().toLocaleDateString("hi-IN"),
            serviceHistory: `${m.serviceHistory || ""}; ${new Date().toLocaleDateString("hi-IN")}: ${repair.problemDescription} (सफलतापूर्वक ठीक किया गया${costStr})`,
          };
        }
        return m;
      });
      saveMachines(updatedMachines);
    }

    return updated;
  } catch {
    return null;
  }
}

/**
 * P2F Step 2: Reopen repair request for a re-repair attempt.
 * Increments verificationAttempt and resets status to 'repair_in_progress'.
 */
export function reopenRepairForReRepair(repairId: string): RepairRequest | null {
  if (!isStorageAvailable()) return null;
  try {
    const repairs = getRepairRequests();
    const idx = repairs.findIndex((r) => r.id === repairId);
    if (idx === -1) return null;

    const repair = repairs[idx];
    const nextAttempt = (repair.verificationAttempt || 1) + 1;
    const updated: RepairRequest = {
      ...repair,
      status: "repair_in_progress",
      statusTextHi: "दोबारा मरम्मत शुरू हो गई",
      verificationStatus: "pending",
      verificationAttempt: nextAttempt,
      verificationTime: undefined,
    };
    repairs[idx] = updated;
    localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(repairs));
    return updated;
  } catch {
    return null;
  }
}

/**
 * Reset all application storage to the clean initial demo state.
 * Clears repair requests, outbox, sync queues, and resets machines to initial state.
 */
export function resetDemoData(): void {
  if (!isStorageAvailable()) return;
  try {
    const normalizedInit = initialMachines.map((m) => normalizeMachineMaintenance(m));
    localStorage.setItem(MACHINES_STORAGE_KEY, JSON.stringify(normalizedInit));
    localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify([]));
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify([]));
    localStorage.removeItem("agripulse_sync_queue_v1");
    localStorage.removeItem("agripulse_job_cards_v1");
  } catch {
    // Fail silently
  }
}

/**
 * Create a realistic simulated demo repair request for Technician workflow demo.
 * Farmer: Pawan Gupta | Machine: Tractor | Problem: Tractor start नहीं हो रहा
 */
export function createSimulatedDemoRepair(): RepairRequest {
  return {
    id: "rep-demo-pawan-tractor",
    farmerId: "farmer-pawan-01",
    farmerName: "Pawan Gupta",
    farmerPhone: "9876543210",
    machineId: "tractor",
    machineNameHi: "Tractor (ट्रैक्टर)",
    machineIcon: "🚜",
    problemDescription: "Tractor start नहीं हो रहा",
    inputMethod: "voice",
    urgency: "today",
    status: "finding_mechanic",
    statusTextHi: "मैकेनिक खोज रहे हैं",
    createdAt: new Date().toISOString(),
    verificationStatus: "pending",
    syncStatus: "synced",
    isSimulatedDemo: true,
    approxDistanceText: "3.2 किमी दूर",
    routeUrl: "https://www.google.com/maps/dir/?api=1&destination=26.8467,80.9462",
    farmerLocation: {
      latitude: 26.8467,
      longitude: 80.9462,
      village: "शाहपुर",
      district: "लखनऊ, उत्तर प्रदेश",
    },
    diagnosis: {
      id: "diag-demo-starting-system",
      possibleProblem: "Starting system में समस्या हो सकती है.",
      confidence: "89% (उच्च)",
      confidenceValue: 89,
      reasons: [
        "सेल्फ स्टार्टर मोटर या सोलनॉइड स्विच में खराबी हो सकती है।",
        "बैटरी वोल्टेज पर्याप्त न होने पर स्टार्टर क्रैंक नहीं करता।",
        "इग्निशन स्विच या रिले में वायरिंग ढीली हो सकती है।"
      ],
      safeAction: "मशीन तुरंत बंद रखें। बैटरी टर्मिनल चेक करें और मैकेनिक का इंतजार करें।",
      urgencyLevel: "high",
      urgencyText: "जरूरी",
      urgencyColor: "bg-amber-100 text-amber-800 border-amber-300",
      disclaimer: "AI की संभावित जांच • भौतिक निरीक्षण आवश्यक है",
      matchedRule: "starter_system_diagnosis",
      timestamp: new Date().toISOString(),
      whenToCallMechanic: "यदि बैटरी टर्मिनल साफ होने पर भी क्रैंक न हो, तो तुरंत प्रमाणित मैकेनिक को बुलाएं।",
    },
    recommendedParts: ["Starter", "Battery"],
  };
}

/**
 * Ensure the simulated demo repair request is available for technician testing.
 */
export function ensureSimulatedDemoRequest(): RepairRequest {
  const repairs = getRepairRequests();
  const existing = repairs.find((r) => r.id === "rep-demo-pawan-tractor");
  if (existing) return existing;

  const newDemo = createSimulatedDemoRepair();
  if (isStorageAvailable()) {
    try {
      const updated = [newDemo, ...repairs];
      localStorage.setItem(REPAIRS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // safe fallback
    }
  }
  return newDemo;
}



