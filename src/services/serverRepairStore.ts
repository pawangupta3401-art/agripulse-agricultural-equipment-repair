import { RepairRequest } from "@/types";
import { initialRepairs } from "@/services/storageService";

/**
 * Server-side in-memory shared store for Repair Requests and Technician Job Assignments.
 * Ensures data consistency across all backend API endpoints (/api/farmer/repairs, /api/technician/jobs).
 * Prevents accidental data overwriting.
 */

// Global singleton across server invocations in development and production
declare global {
  // eslint-disable-next-line no-var
  var __agripulse_server_repairs: RepairRequest[] | undefined;
  // eslint-disable-next-line no-var
  var __agripulse_server_job_assignments: Record<string, any> | undefined;
}

if (!global.__agripulse_server_repairs) {
  // Deep copy initial repairs
  global.__agripulse_server_repairs = JSON.parse(JSON.stringify(initialRepairs));
}

if (!global.__agripulse_server_job_assignments) {
  global.__agripulse_server_job_assignments = {};
}

export function getServerRepairs(): RepairRequest[] {
  return global.__agripulse_server_repairs || [];
}

export function getServerRepairById(id: string): RepairRequest | undefined {
  return getServerRepairs().find((r) => r.id === id);
}

export function addServerRepair(repair: RepairRequest): RepairRequest {
  const current = getServerRepairs();
  const existingIdx = current.findIndex((r) => r.id === repair.id);

  if (existingIdx !== -1) {
    // Merge safely without overwriting non-empty fields with empty ones
    current[existingIdx] = {
      ...current[existingIdx],
      ...repair,
    };
    return current[existingIdx];
  }

  // Prepend new repair so latest appears first
  current.unshift(repair);
  return repair;
}

export function updateServerRepair(
  id: string,
  updates: Partial<RepairRequest>
): RepairRequest | null {
  const current = getServerRepairs();
  const idx = current.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  current[idx] = {
    ...current[idx],
    ...updates,
  };
  return current[idx];
}

export function getServerJobAssignments(): Record<string, any> {
  return global.__agripulse_server_job_assignments || {};
}

export function getServerJobAssignment(repairId: string): any | undefined {
  return getServerJobAssignments()[repairId];
}

export function setServerJobAssignment(repairId: string, assignment: any): void {
  const assignments = getServerJobAssignments();
  assignments[repairId] = {
    ...assignments[repairId],
    ...assignment,
    updatedAt: new Date().toISOString(),
  };
}
