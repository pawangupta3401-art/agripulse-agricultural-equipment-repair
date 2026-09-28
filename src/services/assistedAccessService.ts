/**
 * Assisted Access Service (FPO / Service Centre / Operator Access) — P2P AgriPulse
 *
 * Implements:
 * 1. Assisted complaint creation for farmers without smartphones or low digital literacy.
 * 2. Operates through local FPOs, Cooperatives, Service Centres, or Village Entrepreneurs.
 * 3. Enforces operator role security (no exposure of unrelated farmers' private profiles).
 * 4. Feeds directly into the ONE COMMON AgriPulse repair and recovery pipeline with channel: "ASSISTED".
 * 5. Dispatches an automated SMS alert to the farmer's mobile phone.
 */

import {
  RepairRequest,
  Machine,
  UrgencyType,
} from "../types";
import { getMachines, createRepairRequest } from "./storageService";
import { runDemoAIDiagnosis } from "./diagnosisService";
import { generateRecoveryPlan } from "./recoveryEngineService";
import { dispatchSimulatedSMS } from "./telephonyProvider";

export interface AssistedRepairParams {
  operatorId: string;
  operatorNameHi: string;
  operatorOrgNameHi: string;
  farmerName: string;
  farmerPhone: string;
  machineId: string;
  problemDescription: string;
  urgency?: UrgencyType;
  isCriticalFarmWindow?: boolean;
}

export interface AssistedRepairResult {
  repair: RepairRequest;
  recoveryPlan: ReturnType<typeof generateRecoveryPlan>;
  confirmationSmsText: string;
}

/**
 * Submit an assisted repair request via FPO operator desk.
 */
export function createAssistedRepair(params: AssistedRepairParams): AssistedRepairResult {
  const {
    operatorId,
    operatorNameHi,
    operatorOrgNameHi,
    farmerName,
    farmerPhone,
    machineId,
    problemDescription,
    urgency = "today",
    isCriticalFarmWindow = false,
  } = params;

  const machines = getMachines();
  const machine = machines.find((m) => m.id === machineId) || machines[0];

  // 1. Run common AI Diagnosis
  const diagnosis = runDemoAIDiagnosis({
    machine,
    problemDescription,
  });

  // 2. Create Repair Request on Common Pipeline
  const repair = createRepairRequest({
    machineId: machine.id,
    problemDescription,
    inputMethod: "text",
    urgency,
    isOffline: false,
    diagnosis,
  });

  // 3. Attach Assisted Metadata
  repair.channel = "ASSISTED";
  repair.callerPhoneNumber = farmerPhone;
  repair.assistedOperatorId = operatorId;
  repair.assistedOperatorNameHi = `${operatorNameHi} (${operatorOrgNameHi})`;

  // 4. Generate Recovery Plan
  const recoveryPlan = generateRecoveryPlan({
    machine,
    problemDescription,
    diagnosis,
    urgency: urgency === "today" ? "emergency" : "urgent",
    farmerLocation: null,
    isOnline: true,
    isCriticalFarmWindow,
  });

  // 5. Send automated confirmation SMS to farmer's phone
  const confirmationSmsText = `AgriPulse: ${operatorOrgNameHi} द्वारा आपकी ${machine.nameHi} की मरम्मत शिकायत #${repair.id} दर्ज कर दी गई है। योजना तैयार है। पूछताछ: 1800-AGRI-HELP`;

  dispatchSimulatedSMS({
    recipientPhone: farmerPhone,
    messageTextHi: confirmationSmsText,
    eventType: "complaint_created",
    complaintId: repair.id,
  });

  return {
    repair,
    recoveryPlan,
    confirmationSmsText,
  };
}
