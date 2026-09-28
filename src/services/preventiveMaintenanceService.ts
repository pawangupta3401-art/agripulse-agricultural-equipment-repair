/**
 * Preventive Maintenance & Service Reminder Service — P2G Step 2 AgriPulse
 *
 * Deterministic local rules for machine service intervals, maintenance checklists,
 * and service reminders. All operations are 100% offline-safe.
 */

import { Machine, MaintenanceStatus, ServiceEvent } from "@/types";

// ─── Prototype Default Intervals ─────────────────────────────────────────────
// Prototype defaults, not manufacturer-specific recommendations.

export const DEFAULT_SERVICE_INTERVALS: Record<string, number> = {
  tractor: 90,
  "ट्रैक्टर": 90,
  sprayer: 60,
  "स्प्रेयर": 60,
  "water pump": 90,
  "वाटर पंप": 90,
  "power tiller": 90,
  "पावर टिलर": 90,
};

export function getDefaultServiceInterval(machineTypeOrName: string): number {
  if (!machineTypeOrName) return 90;
  const lower = machineTypeOrName.toLowerCase().trim();
  for (const [key, interval] of Object.entries(DEFAULT_SERVICE_INTERVALS)) {
    if (lower.includes(key.toLowerCase())) {
      return interval;
    }
  }
  return 90;
}

// ─── Prototype Default Maintenance Checklists ────────────────────────────────

export const DEFAULT_MAINTENANCE_CHECKLISTS: Record<string, string[]> = {
  tractor: ["इंजन ऑयल", "एयर फ़िल्टर", "बैटरी", "बेल्ट", "टायर"],
  "ट्रैक्टर": ["इंजन ऑयल", "एयर फ़िल्टर", "बैटरी", "बेल्ट", "टायर"],
  sprayer: ["नोज़ल", "पाइप", "पंप", "लीकेज", "फ़िल्टर"],
  "स्प्रेयर": ["नोज़ल", "पाइप", "पंप", "लीकेज", "फ़िल्टर"],
  "water pump": ["पंप", "पाइप", "सील", "इंजन", "फ़िल्टर"],
  "वाटर पंप": ["पंप", "पाइप", "सील", "इंजन", "फ़िल्टर"],
  "power tiller": ["इंजन ऑयल", "ब्लेड", "बेल्ट", "एयर फ़िल्टर", "क्लच"],
  "पावर टिलर": ["इंजन ऑयल", "ब्लेड", "बेल्ट", "एयर फ़िल्टर", "क्लच"],
};

export function getDefaultMaintenanceItems(machineTypeOrName: string): string[] {
  if (!machineTypeOrName) return ["इंजन ऑयल", "फ़िल्टर", "पाइप / सील", "नट-बोल्ट"];
  const lower = machineTypeOrName.toLowerCase().trim();
  for (const [key, items] of Object.entries(DEFAULT_MAINTENANCE_CHECKLISTS)) {
    if (lower.includes(key.toLowerCase())) {
      return items;
    }
  }
  return ["इंजन ऑयल", "फ़िल्टर", "पाइप / सील", "नट-बोल्ट"];
}

// ─── Date Calculations ───────────────────────────────────────────────────────

/**
 * Calculates nextServiceDate string (YYYY-MM-DD) from base date and interval.
 */
export function calculateNextServiceDate(
  baseDateStr: string,
  intervalDays: number
): string {
  const base = new Date(baseDateStr);
  if (isNaN(base.getTime())) {
    const today = new Date();
    today.setDate(today.getDate() + intervalDays);
    return today.toISOString().split("T")[0];
  }
  const next = new Date(base);
  next.setDate(next.getDate() + intervalDays);
  return next.toISOString().split("T")[0];
}

/**
 * Calculates maintenance status based on nextServiceDate vs today:
 * - < 0 days: "overdue" (🔴 सर्विस बाकी है)
 * - 0 to 15 days: "due" (🟠 सर्विस जल्द करनी है)
 * - > 15 days: "upcoming" (🟢 सर्विस अभी दूर है)
 */
export function calculateMaintenanceStatus(
  nextServiceDateStr?: string
): MaintenanceStatus {
  if (!nextServiceDateStr) return "upcoming";

  const nextDate = new Date(nextServiceDateStr);
  if (isNaN(nextDate.getTime())) return "upcoming";

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(nextDate);
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return "overdue";
  }
  if (diffDays <= 15) {
    return "due";
  }
  return "upcoming";
}

/**
 * Formats ISO YYYY-MM-DD into simple Hindi readable format (e.g. 15 अक्टूबर 2026).
 */
export function formatServiceDateHi(dateStr?: string): string {
  if (!dateStr) return "तारीख तय नहीं";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("hi-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Status display configuration for UI components.
 */
export interface MaintenanceStatusDisplay {
  status: MaintenanceStatus;
  labelHi: string;
  dot: string;
  fullTagHi: string;
  reminderMessageHi: string | null;
  badgeClass: string;
  cardBorderClass: string;
  cardBgClass: string;
}

export function getMaintenanceStatusDisplay(
  status: MaintenanceStatus
): MaintenanceStatusDisplay {
  switch (status) {
    case "overdue":
      return {
        status: "overdue",
        labelHi: "सर्विस बाकी है",
        dot: "🔴",
        fullTagHi: "🔴 सर्विस बाकी है",
        reminderMessageHi: "⚠️ इस मशीन की सर्विस बाकी है।",
        badgeClass: "bg-red-100 text-red-900 border-red-300",
        cardBorderClass: "border-red-400",
        cardBgClass: "bg-red-50",
      };
    case "due":
      return {
        status: "due",
        labelHi: "सर्विस जल्द करनी है",
        dot: "🟠",
        fullTagHi: "🟠 सर्विस जल्द करनी है",
        reminderMessageHi: "🔔 इस मशीन की सर्विस जल्द करनी है।",
        badgeClass: "bg-amber-100 text-amber-900 border-amber-300",
        cardBorderClass: "border-amber-400",
        cardBgClass: "bg-amber-50",
      };
    case "upcoming":
    default:
      return {
        status: "upcoming",
        labelHi: "सर्विस अभी दूर है",
        dot: "🟢",
        fullTagHi: "🟢 सर्विस अभी दूर है",
        reminderMessageHi: null,
        badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300",
        cardBorderClass: "border-emerald-300",
        cardBgClass: "bg-emerald-50",
      };
  }
}

// ─── Machine Normalizer ──────────────────────────────────────────────────────

/**
 * Normalizes a machine to ensure all maintenance fields exist and are evaluated
 * against the current date.
 */
export function normalizeMachineMaintenance(machine: Machine): Machine {
  const typeKey = machine.type || machine.nameHi || machine.name || "";
  const interval = machine.serviceIntervalDays || getDefaultServiceInterval(typeKey);
  const items = machine.maintenanceItems && machine.maintenanceItems.length > 0
    ? machine.maintenanceItems
    : getDefaultMaintenanceItems(typeKey);

  // If nextServiceDate is missing, derive it from lastServiceDate or today
  let lastDate = machine.lastServiceDate;
  let nextDate = machine.nextServiceDate;

  if (!nextDate) {
    if (lastDate) {
      nextDate = calculateNextServiceDate(lastDate, interval);
    } else {
      const today = new Date().toISOString().split("T")[0];
      lastDate = today;
      nextDate = calculateNextServiceDate(today, interval);
    }
  }

  const currentStatus = calculateMaintenanceStatus(nextDate);

  return {
    ...machine,
    serviceIntervalDays: interval,
    maintenanceItems: items,
    lastServiceDate: lastDate,
    nextServiceDate: nextDate,
    maintenanceStatus: currentStatus,
    serviceEvents: machine.serviceEvents || [],
  };
}

// ─── Maintenance Actions ─────────────────────────────────────────────────────

/**
 * P2G Step 2 Action: "सर्विस पूरी हो गई"
 *
 * When pressed:
 * - update lastServiceDate to today
 * - calculate nextServiceDate (today + interval)
 * - reset maintenanceStatus to "upcoming"
 * - add service event to machine history
 * - does NOT create a separate repair request
 */
export function completeMachineService(machine: Machine): Machine {
  const today = new Date().toISOString().split("T")[0];
  const interval = machine.serviceIntervalDays || getDefaultServiceInterval(machine.type || machine.name);
  const nextDate = calculateNextServiceDate(today, interval);
  const status = calculateMaintenanceStatus(nextDate); // will be "upcoming"

  const newEvent: ServiceEvent = {
    id: `srv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: today,
    type: "service",
    titleHi: "नियमित सर्विस पूरी हुई",
    notes: `${machine.nameHi} की नियमित सर्विस सफलतापूर्वक पूरी की गई।`,
    itemsChecked: machine.maintenanceItems || getDefaultMaintenanceItems(machine.type),
  };

  const updatedEvents = [newEvent, ...(machine.serviceEvents || [])];
  const formattedToday = new Date().toLocaleDateString("hi-IN");

  return {
    ...machine,
    lastServiceDate: today,
    nextServiceDate: nextDate,
    maintenanceStatus: status,
    lastService: "आज",
    nextService: `${interval} दिन बाद`,
    serviceHistory: machine.serviceHistory
      ? `${machine.serviceHistory}; ${formattedToday}: नियमित सर्विस संपन्न`
      : `${formattedToday}: नियमित सर्विस संपन्न`,
    serviceEvents: updatedEvents,
  };
}

// ─── Machine Registration ────────────────────────────────────────────────────

export interface RegisterMachineParams {
  name: string;
  nameHi: string;
  type: string;
  icon?: string;
  operatingHours?: string;
  lastServiceDate?: string;
}

/**
 * Creates a new machine (e.g. Tractor) with calculated service interval and checklist.
 */
export function createNewMachine(params: RegisterMachineParams): Machine {
  const id = `machine-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const typeKey = params.type || params.nameHi || params.name;
  const interval = getDefaultServiceInterval(typeKey);
  const items = getDefaultMaintenanceItems(typeKey);

  const today = new Date().toISOString().split("T")[0];
  const lastDate = params.lastServiceDate || today;
  const nextDate = calculateNextServiceDate(lastDate, interval);
  const status = calculateMaintenanceStatus(nextDate);

  let icon = params.icon;
  if (!icon) {
    const lower = typeKey.toLowerCase();
    if (lower.includes("tractor") || lower.includes("ट्रैक्टर")) icon = "🚜";
    else if (lower.includes("sprayer") || lower.includes("स्प्रेयर")) icon = "🎒";
    else if (lower.includes("pump") || lower.includes("पंप")) icon = "💧";
    else if (lower.includes("tiller") || lower.includes("टिलर")) icon = "🚜";
    else icon = "⚙️";
  }

  const initialServiceEvent: ServiceEvent = {
    id: `srv-init-${Date.now()}`,
    date: lastDate,
    type: "service",
    titleHi: "मशीन पंजीकरण व प्रारंभिक सर्विस",
    itemsChecked: items,
  };

  return {
    id,
    name: params.name,
    nameHi: params.nameHi,
    type: params.type,
    icon,
    status: "active",
    statusText: "सक्रिय",
    lastService: "आज",
    nextService: `${interval} दिन बाद`,
    operatingHours: params.operatingHours || "0 घंटे",
    serviceHistory: "प्रारंभिक पंजीकरण पूर्ण",
    previousRepairs: "कोई मरम्मत नहीं",
    partsReplaced: "सभी मूल पुर्जे",
    // P2G Maintenance
    lastServiceDate: lastDate,
    nextServiceDate: nextDate,
    serviceIntervalDays: interval,
    maintenanceItems: items,
    maintenanceStatus: status,
    serviceEvents: [initialServiceEvent],
  };
}
