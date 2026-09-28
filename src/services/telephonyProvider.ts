/**
 * Telephony & SMS Provider (IVR & Feature-Phone Access) — P2P & P2Q AgriPulse
 *
 * Implements:
 * 1. Clean TelephonyProvider abstraction for voice/IVR and SMS.
 * 2. Keypad DTMF navigation for non-smartphone farmers:
 *    - 1: New Machine Repair
 *    - 2: Check Existing Complaint Status
 *    - 3: Speak to Verified Technician
 *    - 4: Seasonal Maintenance Packages
 * 3. Registered phone number identity lookup (binds to farmer and their machines).
 * 4. Extensible SMS Notification Logger (localStorage agripulse_sms_log_v1).
 * 5. Explicit isDemoSimulation: true flag (NO fake claims of real carrier delivery).
 * 6. Feeds directly into the ONE COMMON AgriPulse Repair & Recovery Engine workflow.
 */

import {
  RepairRequest,
  Machine,
  SMSNotification,
  ComplaintChannel,
  UrgencyType,
} from "../types";
import { getMachines, getRepairRequests, createRepairRequest } from "./storageService";
import { runDemoAIDiagnosis } from "./diagnosisService";
import { generateRecoveryPlan, getFeaturePhoneRecoverySummary } from "./recoveryEngineService";

const SMS_LOG_STORAGE_KEY = "agripulse_sms_log_v1";

export interface IVRMenuOption {
  key: string;
  labelHi: string;
  actionTextHi: string;
}

export interface IVRStepState {
  step: "main_menu" | "machine_select" | "problem_select" | "status_inquiry" | "completed" | "technician_connect" | "maintenance_info";
  audioPromptHi: string;
  options: IVRMenuOption[];
  callerPhone: string;
  selectedMachineId?: string;
  selectedProblemCode?: string;
  createdRepairId?: string;
  statusMessageHi?: string;
}

/**
 * Standard SMS Templates for Feature-Phone / SMS notifications.
 * Explicitly simulated adapter with no claims of live telecom gateway.
 */
export const SMS_TEMPLATES = {
  complaint_created: (params: { id: string; machineName: string; totalEst?: number }) =>
    `AgriPulse: Aapki repair request #${params.id} (${params.machineName}) register ho gayi hai.${params.totalEst ? ` Anumanit lagat: Rs.${params.totalEst}.` : ""} Sahayata: 1800-AGRI-HELP`,
  technician_assigned: (params: { id: string; techName: string; phone: string; totalEst?: number }) =>
    `AgriPulse: Complaint #${params.id} ke liye verified mechanic ${params.techName} (${params.phone}) assign ho gaye hain.${params.totalEst ? ` Anuman: Rs.${params.totalEst}.` : ""}`,
  technician_arriving: (params: { id: string; techName: string }) =>
    `AgriPulse: Mechanic ${params.techName} aapke khet ke liye raste me hain. Machine band rakhein.`,
  repair_completed: (params: { id: string; machineName: string }) =>
    `AgriPulse: Machine #${params.id} (${params.machineName}) ki marammat poori ho gayi hai. Kripya machine chalakar janch karein.`,
  verification_passed: (params: { id: string; machineName: string }) =>
    `AgriPulse: Machine #${params.id} janch me poori tarah sahi payi gayi. Machine Passport update ho gaya hai. Dhanyawad!`,
  verification_failed: (params: { id: string }) =>
    `AgriPulse: Complaint #${params.id} me samasya abhi baki hai. Dobara mechanic sahayata bheji ja rahi hai.`,
};

/**
 * Multilingual SMS template generator supporting farmer's selected language.
 */
export function getLocalizedSMSTemplate(
  eventType: keyof typeof SMS_TEMPLATES,
  params: { id: string; machineName?: string; techName?: string; phone?: string; totalEst?: number },
  lang: string = "hi"
): string {
  if (lang === "en") {
    switch (eventType) {
      case "complaint_created":
        return `AgriPulse: Your repair request #${params.id} (${params.machineName || "Machine"}) is registered.${params.totalEst ? ` Est. cost: Rs.${params.totalEst}.` : ""} Helpline: 1800-AGRI-HELP`;
      case "technician_assigned":
        return `AgriPulse: Verified mechanic ${params.techName || "Technician"} (${params.phone || ""}) assigned for request #${params.id}.${params.totalEst ? ` Est: Rs.${params.totalEst}.` : ""}`;
      case "technician_arriving":
        return `AgriPulse: Mechanic ${params.techName || ""} is en route to your field. Please keep machine turned off.`;
      case "repair_completed":
        return `AgriPulse: Repair for #${params.id} (${params.machineName || ""}) completed. Please inspect and test machine.`;
      case "verification_passed":
        return `AgriPulse: Machine #${params.id} successfully verified. Machine Passport updated. Thank you!`;
      case "verification_failed":
        return `AgriPulse: Issue remains on #${params.id}. Re-dispatching mechanic assistance.`;
    }
  } else if (lang === "mr") {
    switch (eventType) {
      case "complaint_created":
        return `AgriPulse: तुमची दुरुस्ती विनंती #${params.id} (${params.machineName || "यंत्र"}) नोंदवली गेली आहे.${params.totalEst ? ` अंदाजे खर्च: रु.${params.totalEst}.` : ""} मदत: 1800-AGRI-HELP`;
      case "technician_assigned":
        return `AgriPulse: विनंती #${params.id} साठी प्रमाणित मेकॅनिक ${params.techName || ""} (${params.phone || ""}) नियुक्त केले आहेत.${params.totalEst ? ` अंदाज: रु.${params.totalEst}.` : ""}`;
      case "technician_arriving":
        return `AgriPulse: मेकॅनिक ${params.techName || ""} शेतात येण्यासाठी निघाले आहेत. कृपया मशीन बंद ठेवा.`;
      case "repair_completed":
        return `AgriPulse: यंत्र #${params.id} (${params.machineName || ""}) दुरुस्ती पूर्ण झाली आहे. कृपया चाचणी घ्या.`;
      case "verification_passed":
        return `AgriPulse: यंत्र #${params.id} तपासणीत योग्य आढळले. मशीन पासपोर्ट अपडेट झाला आहे. धन्यवाद!`;
      case "verification_failed":
        return `AgriPulse: तक्रार #${params.id} मध्ये समस्या अद्याप आहे. पुन्हा मदत पाठवत आहोत.`;
    }
  } else if (lang === "te") {
    switch (eventType) {
      case "complaint_created":
        return `AgriPulse: మీ మరమ్మతు అభ్యర్థన #${params.id} (${params.machineName || ""}) నమోదు చేయబడింది.${params.totalEst ? ` అంచనా ఖర్చు: రూ.${params.totalEst}.` : ""} సహాయం: 1800-AGRI-HELP`;
      case "technician_assigned":
        return `AgriPulse: అభ్యర్థన #${params.id} కోసం మెకానిక్ ${params.techName || ""} (${params.phone || ""}) కేటాయించబడ్డారు.`;
      case "technician_arriving":
        return `AgriPulse: మెకానిక్ ${params.techName || ""} మీ పొలానికి వస్తున్నారు.`;
      case "repair_completed":
        return `AgriPulse: మెషిన్ #${params.id} మరమ్మతు పూర్తయింది. దయచేసి పరిశీలించండి.`;
      case "verification_passed":
        return `AgriPulse: మెషిన్ #${params.id} విజయవంతంగా ధృవీకరించబడింది. ధన్యవాదాలు!`;
      case "verification_failed":
        return `AgriPulse: సమస్య ఇంకా ఉంది. మెకానిక్ మళ్లీ పంపబడుతున్నారు.`;
    }
  } else if (lang === "pa") {
    switch (eventType) {
      case "complaint_created":
        return `AgriPulse: ਤੁਹਾਡੀ ਮੁਰੰਮਤ ਬੇਨਤੀ #${params.id} (${params.machineName || ""}) ਦਰਜ ਹੋ ਗਈ ਹੈ.${params.totalEst ? ` ਅਨੁਮਾਨਿਤ ਲਾਗਤ: ਰੁ.${params.totalEst}.` : ""} ਮਦਦ: 1800-AGRI-HELP`;
      case "technician_assigned":
        return `AgriPulse: ਬੇਨਤੀ #${params.id} ਲਈ ਮਕੈਨਿਕ ${params.techName || ""} (${params.phone || ""}) ਨਿਯੁਕਤ ਕੀਤੇ ਗਏ ਹਨ.`;
      case "technician_arriving":
        return `AgriPulse: ਮਕੈਨਿਕ ${params.techName || ""} ਤੁਹਾਡੇ ਖੇਤ ਲਈ ਰਸਤੇ ਵਿੱਚ ਹਨ. ਕਿਰਪਾ ਕਰਕੇ ਮਸ਼ੀਨ ਬੰਦ ਰੱਖੋ.`;
      case "repair_completed":
        return `AgriPulse: ਮਸ਼ੀਨ #${params.id} ਦੀ ਮੁਰੰਮਤ ਪੂਰੀ ਹੋ ਗਈ ਹੈ. ਕਿਰਪਾ ਕਰਕੇ ਜਾਂਚ ਕਰੋ.`;
      case "verification_passed":
        return `AgriPulse: ਮਸ਼ੀਨ #${params.id} ਜਾਂਚ ਵਿੱਚ ਬਿਲਕੁਲ ਠੀਕ ਪਾਈ ਗਈ. ਧੰਨਵਾਦ!`;
      case "verification_failed":
        return `AgriPulse: ਸ਼ਿਕਾਇਤ #${params.id} ਵਿੱਚ ਸਮੱਸਿਆ ਅਜੇ ਬਾਕੀ ਹੈ. ਦੁਬਾਰਾ ਮਕੈਨਿਕ ਭੇਜਿਆ ਜਾ ਰਿਹਾ ਹੈ.`;
    }
  }

  // Default to Hindi SMS template
  return (SMS_TEMPLATES[eventType] as any)(params);
}

/**
 * Clear simulated SMS history.
 */
export function clearSMSNotificationHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SMS_LOG_STORAGE_KEY);
  } catch {}
}

/**
 * Retrieve simulated SMS notification history.
 */
export function getSMSNotificationHistory(): SMSNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SMS_LOG_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Safe fallback
  }
  return [];
}

/**
 * Dispatch an SMS notification (simulated prototype adapter).
 * Explicitly marked isDemoSimulation: true.
 */
export function dispatchSimulatedSMS(params: {
  recipientPhone: string;
  messageTextHi: string;
  eventType: SMSNotification["eventType"];
  complaintId?: string;
}): SMSNotification {
  const newSms: SMSNotification = {
    id: `sms-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    recipientPhone: params.recipientPhone,
    messageTextHi: params.messageTextHi,
    eventType: params.eventType,
    sentAt: new Date().toISOString(),
    deliveryStatus: "simulated_sent",
    complaintId: params.complaintId,
    isDemoSimulation: true,
  };

  if (typeof window !== "undefined") {
    try {
      const existing = getSMSNotificationHistory();
      localStorage.setItem(SMS_LOG_STORAGE_KEY, JSON.stringify([newSms, ...existing.slice(0, 19)]));
    } catch {
      // Storage fallback
    }
  }

  return newSms;
}

/**
 * Identify caller and registered machines by caller phone number.
 */
export function lookupCallerIdentity(phoneNumber: string): {
  isRegistered: boolean;
  farmerNameHi: string;
  machines: Machine[];
} {
  const allMachines = getMachines();

  // Known demo phone number
  if (phoneNumber.includes("9876543210") || phoneNumber.includes("98765") || allMachines.length > 0) {
    return {
      isRegistered: true,
      farmerNameHi: "रामेश्वर जी (नागपुर ग्रामीण)",
      machines: allMachines,
    };
  }

  return {
    isRegistered: false,
    farmerNameHi: "किसान भाई",
    machines: allMachines.slice(0, 1),
  };
}

/**
 * Process IVR Keypad DTMF Input.
 *
 * Menu hierarchy per Nagpur RISE challenge:
 * Call AgriPulse:
 * 1 → Machine Repair
 * 2 → Complaint Status
 * 3 → Technician
 * 4 → Maintenance
 *
 * Machine selection:
 * 1 → Tractor, 2 → Sprayer, 3 → Pump, 4 → Tiller, 5 → Harvester, 6 → Other
 *
 * Problem selection:
 * 1 → Not starting, 2 → Overheating, 3 → Oil leakage, 4 → Electrical, 5 → Hydraulic, 6 → Other
 */
export function processIVRInput(
  currentState: IVRStepState,
  key: string
): {
  nextState: IVRStepState;
  createdRepair?: RepairRequest;
  smsDispatched?: SMSNotification;
} {
  const { step, callerPhone } = currentState;
  const callerInfo = lookupCallerIdentity(callerPhone);

  // 1. MAIN MENU
  if (step === "main_menu") {
    if (key === "1") {
      // Option 1: Machine Repair (Tractor, Sprayer, Pump, Tiller, Harvester, Other)
      const standardMachines: IVRMenuOption[] = [
        { key: "1", labelHi: "ट्रैक्टर (Tractor)", actionTextHi: "1 दबाएं: ट्रैक्टर" },
        { key: "2", labelHi: "स्प्रेयर (Sprayer)", actionTextHi: "2 दबाएं: स्प्रेयर" },
        { key: "3", labelHi: "वाटर पंप (Pump)", actionTextHi: "3 दबाएं: वाटर पंप" },
        { key: "4", labelHi: "पावर टिलर (Tiller)", actionTextHi: "4 दबाएं: पावर टिलर" },
        { key: "5", labelHi: "हार्वेस्टर (Harvester)", actionTextHi: "5 दबाएं: हार्वेस्टर" },
        { key: "6", labelHi: "अन्य मशीन (Other)", actionTextHi: "6 दबाएं: अन्य मशीन" },
      ];

      return {
        nextState: {
          step: "machine_select",
          callerPhone,
          audioPromptHi: `नमस्ते ${callerInfo.farmerNameHi}। मशीन चुनें: 1 ट्रैक्टर, 2 स्प्रेयर, 3 पंप, 4 टिलर, 5 हार्वेस्टर, 6 अन्य मशीन।`,
          options: standardMachines,
        },
      };
    }

    if (key === "2") {
      // Option 2: Check Existing Complaint Status
      const repairs = getRepairRequests();
      const active = repairs.find((r: RepairRequest) => r.status !== "completed") || repairs[0];

      if (!active) {
        return {
          nextState: {
            step: "completed",
            callerPhone,
            audioPromptHi: "आपके नंबर पर वर्तमान में कोई खुली मरम्मत शिकायत नहीं है। नई शिकायत दर्ज करने के लिए 1 दबाएं।",
            options: [{ key: "1", labelHi: "मुख्य मेनू", actionTextHi: "1 दबाएं: मुख्य मेनू" }],
          },
        };
      }

      // Feature-phone status summary (Section 8)
      let featurePhoneStatusHi = "शिकायत प्राप्त हो गई है (Complaint received)";
      if (active.status === "technician_assigned" || active.technicianWorkflowStatus === "assigned") {
        featurePhoneStatusHi = "मैकेनिक नियुक्त हो गया है (Technician assigned)";
      } else if (active.status === "repairing" || active.technicianWorkflowStatus === "repairing") {
        featurePhoneStatusHi = "मरम्मत प्रगति पर है (Repair in progress)";
      } else if (active.status === "verification_pending") {
        featurePhoneStatusHi = "मशीन की जाँच बाकी है (Verification required)";
      } else if (active.status === "completed") {
        featurePhoneStatusHi = "मरम्मत सफलतापूर्वक पूरी हुई (Repair completed)";
      }

      const statusText = `आपकी शिकायत #${active.id} की स्थिति: "${featurePhoneStatusHi}"। ${active.diagnosis ? `संभावित समस्या: ${active.diagnosis.possibleProblem}।` : ""}`;

      return {
        nextState: {
          step: "status_inquiry",
          callerPhone,
          audioPromptHi: statusText,
          statusMessageHi: statusText,
          options: [
            { key: "1", labelHi: "मुख्य मेनू", actionTextHi: "1: मुख्य मेनू" },
            { key: "3", labelHi: "मैकेनिक से बात करें", actionTextHi: "3: मैकेनिक संपर्क" },
          ],
        },
      };
    }

    if (key === "3") {
      // Option 3: Speak to Technician
      return {
        nextState: {
          step: "technician_connect",
          callerPhone,
          audioPromptHi: "आपके नजदीकी प्रमाणित मैकेनिक मोहन सिंह (9812345678) को कॉल कनेक्ट किया जा रहा है...",
          options: [{ key: "1", labelHi: "मुख्य मेनू", actionTextHi: "1: वापस जाएं" }],
        },
      };
    }

    if (key === "4") {
      // Option 4: Maintenance Packages
      return {
        nextState: {
          step: "maintenance_info",
          callerPhone,
          audioPromptHi: "AgriPulse मौसमी मेंटेनेंस पैकेज: बेसिक चेकअप ₹399, बुवाई पूर्व सर्विस ₹899, संपूर्ण सुरक्षा ₹1999। बुक करने के लिए नजदीकी FPO केंद्र संपर्क करें।",
          options: [{ key: "1", labelHi: "मुख्य मेनू", actionTextHi: "1: मुख्य मेनू" }],
        },
      };
    }
  }

  // 2. MACHINE SELECT
  if (step === "machine_select") {
    const machineCodeMap: Record<string, { id: string; nameHi: string }> = {
      "1": { id: "tractor", nameHi: "ट्रैक्टर (Tractor)" },
      "2": { id: "sprayer", nameHi: "स्प्रेयर (Sprayer)" },
      "3": { id: "pump", nameHi: "वाटर पंप (Pump)" },
      "4": { id: "tiller", nameHi: "पावर टिलर (Tiller)" },
      "5": { id: "harvester", nameHi: "हार्वेस्टर (Harvester)" },
      "6": { id: "other", nameHi: "अन्य कृषि उपकरण" },
    };

    const chosen = machineCodeMap[key] || machineCodeMap["1"];

    const problemOptions: IVRMenuOption[] = [
      { key: "1", labelHi: "मशीन स्टार्ट नहीं हो रही", actionTextHi: "1: मशीन स्टार्ट नहीं हो रही" },
      { key: "2", labelHi: "इंजन ओवरहीटिंग व धुआं", actionTextHi: "2: ओवरहीटिंग" },
      { key: "3", labelHi: "ऑयल / फ्लुइड लीकेज", actionTextHi: "3: ऑयल लीकेज" },
      { key: "4", labelHi: "इलेक्ट्रिकल वायरिंग फॉल्ट", actionTextHi: "4: इलेक्ट्रिकल समस्या" },
      { key: "5", labelHi: "हाइड्रोलिक लिफ्ट समस्या", actionTextHi: "5: हाइड्रोलिक समस्या" },
      { key: "6", labelHi: "अन्य खराबी / असामान्य आवाज", actionTextHi: "6: अन्य समस्या" },
    ];

    return {
      nextState: {
        step: "problem_select",
        callerPhone,
        selectedMachineId: chosen.id,
        audioPromptHi: `${chosen.nameHi} चुनी गई। समस्या बताएं: 1 मशीन स्टार्ट नहीं हो रही, 2 ओवरहीटिंग, 3 ऑयल लीकेज, 4 इलेक्ट्रिकल, 5 हाइड्रोलिक, 6 अन्य समस्या। बोलकर बताने के लिए 6 दबाएं।`,
        options: problemOptions,
      },
    };
  }

  // 3. PROBLEM SELECT -> CREATE COMPLAINT IN COMMON PIPELINE
  if (step === "problem_select") {
    const problemMap: Record<string, string> = {
      "1": "मशीन स्टार्ट नहीं हो रही (स्टार्टर/फ्यूल समस्या)",
      "2": "मशीन से ऑयल और हाइड्रोलिक फ्लुइड लीकेज हो रहा है",
      "3": "इंजन बहुत गर्म हो रहा है और धुआं निकल रहा है",
      "4": "इलेक्ट्रिकल वायरिंग फॉल्ट और बैटरी चार्जिंग समस्या",
      "5": "हाइड्रोलिक प्रेशर ड्राप और लिफ्ट काम नहीं कर रही",
      "6": "सामान्य मशीन खराबी एवं असामान्य आवाज",
    };

    const problemDesc = problemMap[key] || "सामान्य मशीन खराबी (फोन आईवीआर द्वारा दर्ज)";
    const machine =
      callerInfo.machines.find((m) => m.id === currentState.selectedMachineId) ||
      callerInfo.machines[0];

    // AI Diagnosis on common pipeline
    const diagnosis = runDemoAIDiagnosis({
      machine,
      problemDescription: problemDesc,
    });

    // Create complaint with channel: "PHONE"
    const newRepair = createRepairRequest({
      machineId: machine.id,
      problemDescription: problemDesc,
      inputMethod: "voice",
      urgency: "today",
      isOffline: false,
      diagnosis,
    });

    // Attach phone metadata
    newRepair.channel = "PHONE";
    newRepair.callerPhoneNumber = callerPhone;

    // Run Recovery Engine to create SMS summary
    const recoveryPlan = generateRecoveryPlan({
      machine,
      problemDescription: problemDesc,
      diagnosis,
      urgency: "urgent",
      farmerLocation: null,
      isOnline: true,
      isCriticalFarmWindow: true,
    });

    const smsText = getFeaturePhoneRecoverySummary(recoveryPlan);
    const sms = dispatchSimulatedSMS({
      recipientPhone: callerPhone,
      messageTextHi: smsText,
      eventType: "complaint_created",
      complaintId: newRepair.id,
    });

    return {
      nextState: {
        step: "completed",
        callerPhone,
        createdRepairId: newRepair.id,
        audioPromptHi: `धन्यवाद ${callerInfo.farmerNameHi}। आपकी शिकायत #${newRepair.id} सफलता पूर्वक दर्ज हो गई है। रिकवरी योजना और मैकेनिक विवरण आपके नंबर पर SMS द्वारा भेज दिया गया है।`,
        options: [
          { key: "1", labelHi: "स्थिति जांचें", actionTextHi: "1: स्थिति देखें" },
          { key: "0", labelHi: "कॉल समाप्त करें", actionTextHi: "0: समाप्त" },
        ],
      },
      createdRepair: newRepair,
      smsDispatched: sms,
    };
  }

  // Fallback to Main Menu
  return {
    nextState: {
      step: "main_menu",
      callerPhone,
      audioPromptHi: `AgriPulse किसान हेल्पलाइन में आपका स्वागत है। मशीन मरम्मत के लिए 1 दबाएं, शिकायत की स्थिति जानने के लिए 2 दबाएं, मैकेनिक से सीधे बात करने के लिए 3 दबाएं।`,
      options: [
        { key: "1", labelHi: "मशीन मरम्मत", actionTextHi: "1: मशीन मरम्मत" },
        { key: "2", labelHi: "शिकायत स्थिति", actionTextHi: "2: स्थिति जांचें" },
        { key: "3", labelHi: "मैकेनिक संपर्क", actionTextHi: "3: मैकेनिक संपर्क" },
      ],
    },
  };
}
