"use client";

import React, { useState, useEffect } from "react";
import {
  Wrench,
  ClipboardList,
  CheckCircle2,
  Navigation,
  MapPin,
  Camera,
  ShieldAlert,
  Award,
  DollarSign,
  Phone,
  Clock,
  ChevronRight,
  AlertCircle,
  Plus,
  Star,
  Check,
  X,
  Sparkles,
  ArrowLeft,
  UserCheck,
  Send,
  Info,
  Home,
  User,
} from "lucide-react";
import TechnicianProfileScreen from "./TechnicianProfileScreen";
import {
  JobCard,
  RepairRequest,
  PartSelection,
  TechnicianWorkflowStatus,
  PriceChangeReason,
  TECHNICIAN_STATUS_LABELS_HI,
} from "@/types";
import { AuthSession } from "@/services/authService";
import {
  getJobCardByRepairId,
  getLatestJobCard,
  createJobCard,
  updateTechnicianWorkflowStatus,
  updatePartSelection,
  updateJobCardPricing,
} from "@/services/jobCardService";
import {
  calculateEstimatedPricing,
  calculatePartsCost,
  formatCurrencyHi,
  PRICE_CHANGE_REASONS,
} from "@/services/pricingService";
import { calculateTechnicianSettlement } from "@/services/businessModelService";
import { updateRepairStatus, ensureSimulatedDemoRequest, createSimulatedDemoRepair } from "@/services/storageService";
import { getSparePartById, SparePart } from "@/services/sparePartData";
import { haversineDistanceKm } from "@/services/locationService";
import { LanguageCode } from "@/i18n";

interface TechnicianDashboardProps {
  session: AuthSession;
  repairs: RepairRequest[];
  currentLanguage: LanguageCode;
  onRefreshData: () => void;
  onLogout: () => void;
}

export default function TechnicianDashboard({
  session,
  repairs,
  currentLanguage,
  onRefreshData,
  onLogout,
}: TechnicianDashboardProps) {
  // Navigation tabs within Technician Interface
  const [activeTab, setActiveTab] = useState<"jobs" | "earnings" | "profile">("jobs");

  // Selected active job card for deep inspection
  const [selectedJobCardId, setSelectedJobCardId] = useState<string | null>(null);

  // Availability toggle
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  // Price adjustment state
  const [isEditingPrice, setIsEditingPrice] = useState<boolean>(false);
  const [techLabourFeeOverride, setTechLabourFeeOverride] = useState<number | null>(null);
  const [priceAdjustmentReason, setPriceAdjustmentReason] = useState<PriceChangeReason>("अतिरिक्त पार्ट खराब मिला");
  const [customPriceNote, setCustomPriceNote] = useState<string>("");

  // Skills list state
  const [skills, setSkills] = useState<string[]>(
    session.user.skills && session.user.skills.length > 0
      ? session.user.skills
      : ["Tractor", "Mechanical", "Engine", "Hydraulic"]
  );
  const [newSkillInput, setNewSkillInput] = useState<string>("");
  const [showAddSkill, setShowAddSkill] = useState<boolean>(false);

  // Helper to compute live distance text from stored technician coordinates
  const getTechnicianDistanceText = (req: RepairRequest) => {
    if (req.farmerLocation?.latitude && req.farmerLocation?.longitude) {
      const techLat = session.user.location?.latitude || (session.user as any).latitude;
      const techLng = session.user.location?.longitude || (session.user as any).longitude;
      if (techLat && techLng) {
        const dist = haversineDistanceKm(techLat, techLng, req.farmerLocation.latitude, req.farmerLocation.longitude);
        return `${dist.toFixed(1)} किमी दूर`;
      }
    }
    return req.approxDistanceText || "3.2 किमी दूर";
  };

  // Filter incoming repair requests relevant to this technician:
  // 1. Matches technician's skills / equipment categories OR was assigned to/recommended for this technician
  // 2. Not rejected by this technician
  // 3. Status is waiting for mechanic
  const incomingRepairs = repairs.filter((r) => {
    if (r.status === "completed") return false;
    if (r.technicianId && r.technicianId !== session.user.id) return false;
    if (r.rejectionReason === `rejected_by_${session.user.id}`) return false;

    const isPendingAssignment =
      r.status === "finding_mechanic" || r.status === "reported" || !r.technicianId;
    if (!isPendingAssignment) return false;

    // Direct assignment / targeted match
    if (r.technicianId === session.user.id || (r as any).targetTechnicianId === session.user.id) {
      return true;
    }

    // Equipment & skill match against technician's profile
    const techSkills = (session.user.skills && session.user.skills.length > 0)
      ? session.user.skills
      : skills;

    const machineStr = (r.machineNameHi || r.machineId || "").toLowerCase();
    const problemDesc = (r.problemDescription || "").toLowerCase();
    const diagDesc = (r.diagnosis?.possibleProblem || "").toLowerCase();

    return techSkills.some((s) => {
      const sLower = s.toLowerCase();
      if (sLower === "tractor" || sLower === "ट्रैक्टर") {
        return machineStr.includes("tractor") || machineStr.includes("ट्रैक्टर");
      }
      if (sLower === "sprayer" || sLower === "स्प्रेयर") {
        return machineStr.includes("sprayer") || machineStr.includes("स्प्रेयर");
      }
      if (sLower === "power tiller" || sLower === "पावर टिलर" || sLower === "tiller") {
        return machineStr.includes("tiller") || machineStr.includes("टिलर");
      }
      if (sLower === "water pump" || sLower === "वाटर पंप" || sLower === "pump") {
        return machineStr.includes("pump") || machineStr.includes("पंप");
      }
      if (sLower === "engine" || sLower === "इंजन") {
        return (
          problemDesc.includes("engine") ||
          problemDesc.includes("इंजन") ||
          problemDesc.includes("start") ||
          problemDesc.includes("स्टार्ट") ||
          diagDesc.includes("engine") ||
          diagDesc.includes("start")
        );
      }
      if (sLower === "electrical" || sLower === "इलेक्ट्रिकल") {
        return (
          problemDesc.includes("motor") ||
          problemDesc.includes("मोटर") ||
          problemDesc.includes("wiring") ||
          problemDesc.includes("बैटरी") ||
          diagDesc.includes("electrical")
        );
      }
      if (sLower === "hydraulic" || sLower === "हाइड्रोलिक") {
        return (
          problemDesc.includes("hydraulic") ||
          problemDesc.includes("हाइड्रोलिक") ||
          diagDesc.includes("hydraulic")
        );
      }
      return false;
    });
  });

  // Filter active ongoing repairs assigned to this technician
  const activeRepairs = repairs.filter(
    (r) =>
      r.status !== "completed" &&
      (r.technicianId === session.user.id || (r.status !== "finding_mechanic" && r.status !== "reported" && r.technicianId))
  );

  const completedRepairs = repairs.filter((r) => r.status === "completed");
  const assignedRepairs = activeRepairs;

  // Realistic technician workflow modal states
  const [viewingRequest, setViewingRequest] = useState<RepairRequest | null>(null);
  const [isConfirmingAccept, setIsConfirmingAccept] = useState<boolean>(false);
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [selectedRejectReason, setSelectedRejectReason] = useState<string>("काम उपलब्ध नहीं");
  const [customRejectReason, setCustomRejectReason] = useState<string>("");

  // Parts & Tools Requirement Wizard
  const [isPartsToolsWizardOpen, setIsPartsToolsWizardOpen] = useState<boolean>(false);
  const [acceptedRepair, setAcceptedRepair] = useState<RepairRequest | null>(null);
  const [includeSpareParts, setIncludeSpareParts] = useState<boolean>(true);
  const [includeTools, setIncludeTools] = useState<boolean>(true);
  const [needFarmerInfo, setNeedFarmerInfo] = useState<boolean>(false);
  const [selectedPartsList, setSelectedPartsList] = useState<string[]>(["Starter", "Battery"]);
  const [customPartInput, setCustomPartInput] = useState<string>("");
  const [selectedToolsList, setSelectedToolsList] = useState<string[]>(["मल्टीमीटर", "रिंच सेट"]);
  const [technicianMessageToFarmer, setTechnicianMessageToFarmer] = useState<string>("");

  // Trip confirmation state
  const [isTripConfirmationOpen, setIsTripConfirmationOpen] = useState<boolean>(false);

  // Complete repair modal state
  const [isCompletingModalOpen, setIsCompletingModalOpen] = useState<boolean>(false);
  const [completionNotes, setCompletionNotes] = useState<string>("स्टार्टर रिले व बैटरी कनेक्शन दुरुस्त किए गए। मशीन सुचारू रूप से स्टार्ट हो रही है।");
  const [completionLabourFee, setCompletionLabourFee] = useState<number>(450);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 3500);
  };

  // Seed simulated demo request on mount
  useEffect(() => {
    ensureSimulatedDemoRequest();
    onRefreshData();
  }, []);

  // Active JobCard if one is selected
  const activeJobCard: JobCard | null = selectedJobCardId
    ? getJobCardByRepairId(selectedJobCardId) ||
    (getLatestJobCard()?.jobId === selectedJobCardId ? getLatestJobCard() : null)
    : null;

  // Handle Accept Confirmation
  const handleConfirmAccept = async () => {
    if (!viewingRequest) return;

    try {
      // Concurrency check via backend API
      const res = await fetch("/api/technician/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          action: "accept",
          repairId: viewingRequest.id,
          technicianId: session.user.id,
          technicianName: session.user.nameHi || session.user.name,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.error === "already_assigned") {
          alert(`सूचना: यह मरम्मत अनुरोध पहले ही ${data.assignedTo || "अन्य मैकेनिक"} द्वारा स्वीकार कर लिया गया है।`);
          setViewingRequest(null);
          setIsConfirmingAccept(false);
          onRefreshData();
          return;
        }
      }
    } catch {
      // Safe offline fallback
    }

    const updated = updateRepairStatus(viewingRequest.id, {
      technicianId: session.user.id,
      selectedTechnician: session.user,
      technicianWorkflowStatus: "assigned",
      status: "technician_assigned",
      statusTextHi: "मैकेनिक नियुक्त हो गया है",
      assignedAt: new Date().toISOString(),
    });

    createJobCard({
      repairRequestId: viewingRequest.id,
      machine: viewingRequest.machineNameHi || "Tractor",
      machineIcon: viewingRequest.machineIcon || "🚜",
      problem: viewingRequest.problemDescription,
      diagnosis: viewingRequest.diagnosis?.possibleProblem || "Starting system में समस्या हो सकती है.",
      urgency: viewingRequest.urgency === "today" ? "आज ही" : "सामान्य",
      safetyMessage: viewingRequest.diagnosis?.safeAction,
      technicianId: session.user.id,
      technicianNameHi: session.user.nameHi || session.user.name || "प्रमाणित मिस्त्री",
      technicianPhone: session.user.phone || "9834567890",
      technicianSkillHi: skills[0] || "Tractor",
      technicianDistanceKm: 3.2,
      technicianRating: 4.8,
      farmerId: viewingRequest.farmerId || "farmer-pawan-01",
      farmerLocationText: `${viewingRequest.farmerLocation?.village || "शाहपुर"}, ${viewingRequest.farmerLocation?.district || "लखनऊ"}`,
      technicianWorkflowStatus: "assigned",
      routeUrl: viewingRequest.routeUrl || "https://www.google.com/maps/dir/?api=1&destination=26.8467,80.9462",
      approxDistanceText: viewingRequest.approxDistanceText || "3.2 किमी दूर",
    });

    setAcceptedRepair(updated || viewingRequest);
    setIsConfirmingAccept(false);
    setViewingRequest(null);
    setIsPartsToolsWizardOpen(true);
    onRefreshData();
    showToast("✓ अनुरोध स्वीकार किया गया! आवश्यक सामान व तैयारी दर्ज करें।");
  };

  // Handle Reject Confirmation
  const handleConfirmReject = async () => {
    if (!viewingRequest) return;
    const finalReason = selectedRejectReason === "अन्य कारण" && customRejectReason.trim()
      ? customRejectReason.trim()
      : selectedRejectReason;

    try {
      await fetch("/api/technician/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          action: "reject",
          repairId: viewingRequest.id,
          technicianId: session.user.id,
          reason: finalReason,
        }),
      });
    } catch {
      // safe fallback
    }

    updateRepairStatus(viewingRequest.id, {
      rejectionReason: `rejected_by_${session.user.id}`,
    });

    setIsRejecting(false);
    setViewingRequest(null);
    onRefreshData();
    showToast("अनुरोध अस्वीकार दर्ज किया गया।");
  };

  // Handle Parts & Tools Proceed
  const handleSavePartsAndProceed = async () => {
    if (!acceptedRepair) return;
    const finalParts = includeSpareParts ? selectedPartsList : [];
    const finalTools = includeTools ? selectedToolsList : [];
    const msg = needFarmerInfo ? technicianMessageToFarmer.trim() : undefined;

    try {
      await fetch("/api/technician/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          action: "update_parts",
          repairId: acceptedRepair.id,
          parts: finalParts,
          tools: finalTools,
          messageToFarmer: msg,
        }),
      });
    } catch {}

    updateRepairStatus(acceptedRepair.id, {
      recommendedParts: finalParts,
      requiredTools: finalTools,
      technicianMessageToFarmer: msg,
    });

    setIsPartsToolsWizardOpen(false);
    setIsTripConfirmationOpen(true);
    onRefreshData();
  };

  // Handle Start Trip
  const handleStartTrip = async () => {
    if (!acceptedRepair) return;

    try {
      await fetch("/api/technician/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          action: "start_travel",
          repairId: acceptedRepair.id,
        }),
      });
    } catch {}

    const card = getJobCardByRepairId(acceptedRepair.id) || getLatestJobCard();
    if (card) {
      updateTechnicianWorkflowStatus(card.jobId, "on_the_way");
    }

    updateRepairStatus(acceptedRepair.id, {
      status: "on_the_way",
      statusTextHi: "मैकेनिक रास्ते में है",
      technicianWorkflowStatus: "on_the_way",
    });

    setIsTripConfirmationOpen(false);
    setSelectedJobCardId(card ? card.jobId : acceptedRepair.id);
    onRefreshData();
    showToast("🚜 यात्रा शुरू हुई! किसान को सूचना भेज दी गई है।");
  };

  // Handle Complete Repair Submission
  const handleConfirmCompletion = async () => {
    const targetRepairId = activeJobCard ? activeJobCard.repairRequestId : selectedJobCardId;
    if (!targetRepairId) return;

    try {
      await fetch("/api/technician/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          action: "complete",
          repairId: targetRepairId,
          notes: completionNotes,
          finalCost: completionLabourFee,
        }),
      });
    } catch {}

    if (activeJobCard) {
      updateTechnicianWorkflowStatus(activeJobCard.jobId, "completed");
    }

    updateRepairStatus(targetRepairId, {
      status: "verification_pending",
      statusTextHi: "मशीन की जाँच बाकी है",
      technicianWorkflowStatus: "completed",
    });

    setIsCompletingModalOpen(false);
    setSelectedJobCardId(null);
    onRefreshData();
    showToast("✓ मरम्मत पूर्ण चिह्नित की गई! किसान सत्यापन हेतु सूचना प्रेषित।");
  };

  // Handle stage transition in job card
  const handleAdvanceStatus = (nextStatus: TechnicianWorkflowStatus) => {
    if (!activeJobCard) return;

    const statusMap: Record<
      TechnicianWorkflowStatus,
      { statusTextHi: string; repairStatus: RepairRequest["status"] }
    > = {
      available: { statusTextHi: "उपलब्ध", repairStatus: "technician_assigned" },
      assigned: { statusTextHi: "मैकेनिक नियुक्त हो गया है", repairStatus: "technician_assigned" },
      on_the_way: { statusTextHi: "मैकेनिक रास्ते में है", repairStatus: "on_the_way" },
      arrived: { statusTextHi: "मैकेनिक पहुँच गया है", repairStatus: "arrived" },
      repairing: { statusTextHi: "मरम्मत चल रही है", repairStatus: "repairing" },
      completed: { statusTextHi: "मरम्मत पूरी हुई", repairStatus: "verification_pending" },
    };

    const target = statusMap[nextStatus];
    const updated = updateTechnicianWorkflowStatus(activeJobCard.jobId, nextStatus);
    if (updated) {
      updateRepairStatus(updated.repairRequestId, {
        status: target.repairStatus,
        statusTextHi: target.statusTextHi,
        technicianWorkflowStatus: nextStatus,
      });
      onRefreshData();
    }
  };

  // Handle spare parts requirement decision
  const handlePartDecision = (
    partId: string,
    partNameHi: string,
    decision: "needed" | "not_needed"
  ) => {
    if (!activeJobCard) return;
    const selection: PartSelection = { partId, partNameHi, decision };
    const updated = updatePartSelection(activeJobCard.jobId, selection);
    if (updated) {
      updateRepairStatus(updated.repairRequestId, {
        selectedParts: updated.partSelections,
      });
      onRefreshData();
    }
  };

  // Save cost adjustment
  const handleSavePriceAdjustment = () => {
    if (!activeJobCard || techLabourFeeOverride === null) return;
    const est = activeJobCard.estimatedCost || calculateEstimatedPricing({
      machineType: activeJobCard.machine,
      distanceKm: activeJobCard.technicianDistanceKm,
      partSelections: activeJobCard.partSelections,
    });

    const partsCost = calculatePartsCost({
      partSelections: activeJobCard.partSelections,
    });

    const finalTotal = est.diagnosticFee + techLabourFeeOverride + partsCost + est.travelFee - est.discount;

    const finalCost = {
      diagnosticFee: est.diagnosticFee,
      labourFee: techLabourFeeOverride,
      partsEstimate: partsCost,
      travelFee: est.travelFee,
      discount: est.discount,
      total: finalTotal,
      currency: "INR",
      isDemoPricing: true,
    };

    const priceAdjustment = {
      estimatedTotal: est.total,
      revisedTotal: finalTotal,
      difference: finalTotal - est.total,
      reason: priceAdjustmentReason,
      customReasonNote: customPriceNote || undefined,
      adjustedAt: new Date().toISOString(),
      adjustedByTechnicianId: session.user.id,
    };

    const updated = updateJobCardPricing(activeJobCard.jobId, {
      finalCost,
      priceAdjustment,
    });
    if (updated) {
      updateRepairStatus(updated.repairRequestId, {
        priceAdjustment,
      });
      setIsEditingPrice(false);
      onRefreshData();
    }
  };

  // Add skill
  const handleAddSkill = () => {
    if (!newSkillInput.trim()) return;
    if (!skills.includes(newSkillInput.trim())) {
      setSkills([...skills, newSkillInput.trim()]);
    }
    setNewSkillInput("");
    setShowAddSkill(false);
  };

  // Compute mock settlement totals
  const totalSettlement = repairs.reduce((acc) => {
    return acc + 850;
  }, 4250);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 pb-28">
      {/* ================= TECHNICIAN HEADER ================= */}
      {activeTab !== "profile" && (
        <header className="bg-slate-900 text-white px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-800 shadow-sm sticky top-0 z-40">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
            {/* Left: Real Technician Name in one clear line & small secondary location/phone */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="p-2 bg-slate-800 rounded-lg border border-slate-700/80 text-emerald-400 shrink-0">
                <Wrench className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base md:text-lg font-bold text-white truncate leading-tight tracking-tight">
                  नमस्ते, {session.user.nameHi || session.user.name || "टेक्नीशियन साथी"}
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate mt-0.5">
                  {session.user.villageOrArea || "नागपुर ग्रामीण"} • +91 {session.user.phone}
                </p>
              </div>
            </div>

            {/* Right: Only the Availability Toggle (Connected to backend state) */}
            <button
              type="button"
              id="tech-header-availability-btn"
              onClick={() => setIsAvailable((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 shrink-0 select-none ${isAvailable
                  ? "bg-emerald-950/90 border-emerald-600 text-emerald-300 hover:bg-emerald-900 active:scale-95"
                  : "bg-rose-950/90 border-rose-700 text-rose-300 hover:bg-rose-900 active:scale-95"
                }`}
              title="उपलब्धता बदलें"
            >
              <span>{isAvailable ? "🟢" : "🔴"}</span>
              <span>{isAvailable ? "उपलब्ध" : "व्यस्त"}</span>
            </button>
          </div>
        </header>
      )}

      {/* ================= PROFILE VIEW OR DASHBOARD MAIN ================= */}
      {activeTab === "profile" ? (
        <TechnicianProfileScreen
          session={session}
          repairs={repairs}
          skills={skills}
          isAvailable={isAvailable}
          onToggleAvailability={() => setIsAvailable((prev) => !prev)}
          onNavigateTab={(tab, target) => {
            setActiveTab(tab);
            if (target) {
              setTimeout(() => {
                const el = document.getElementById(target);
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }
          }}
          onAddSkill={(skill) => {
            if (!skills.includes(skill)) {
              setSkills([...skills, skill]);
            }
          }}
          currentLanguage={currentLanguage}
          onLogout={onLogout}
        />
      ) : (
        <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* KPI Summary Cards — Real Backend Values (Part 9 Requirement) */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-xs font-bold text-amber-800 block">नए अनुरोध</span>
            <span className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 block">
              {incomingRepairs.length}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-xs font-bold text-emerald-800 block">चल रहे काम</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5 block">
              {activeRepairs.length}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <span className="text-xs font-bold text-slate-600 block">पूरे किए गए काम</span>
            <span className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5 block">
              {completedRepairs.length}
            </span>
          </div>
        </div>

        {/* ================= TAB 1: WORK ORDERS & ACTIVE JOB CARDS ================= */}
        {activeTab === "jobs" && (
          <div className="space-y-4">
            {/* If deep inside a Job Card */}
            {activeJobCard ? (
              <div className="space-y-4">
                {/* Back button */}
                <button
                  type="button"
                  onClick={() => setSelectedJobCardId(null)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white px-3 py-1.5 rounded-md border border-slate-300 cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>सभी कार्यों की सूची पर वापस जाएं</span>
                </button>

                {/* Stepper Status Banner */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      कार्य प्रगति स्थिति (Workflow Status):
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                      {activeJobCard.jobId}
                    </span>
                  </div>

                  <div className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                    <span>
                      {activeJobCard.technicianWorkflowStatus === "assigned"
                        ? "मैकेनिक नियुक्त हो गया है"
                        : activeJobCard.technicianWorkflowStatus === "on_the_way"
                          ? "मैकेनिक रास्ते में है"
                          : activeJobCard.technicianWorkflowStatus === "arrived"
                            ? "मैकेनिक मौके पर पहुँच गया है"
                            : activeJobCard.technicianWorkflowStatus === "repairing"
                              ? "मरम्मत प्रगति पर है"
                              : "मरम्मत पूर्ण हो चुकी है"}
                    </span>
                  </div>

                  {/* 5 Stages visual dots */}
                  {(() => {
                    const stages: Array<{
                      key: TechnicianWorkflowStatus;
                      label: string;
                    }> = [
                        { key: "assigned", label: "नियुक्त" },
                        { key: "on_the_way", label: "रास्ते में" },
                        { key: "arrived", label: "पहुँच गए" },
                        { key: "repairing", label: "मरम्मत" },
                        { key: "completed", label: "पूर्ण" },
                      ];

                    const currentIdx = stages.findIndex(
                      (s) => s.key === (activeJobCard.technicianWorkflowStatus || "assigned")
                    );

                    return (
                      <div className="grid grid-cols-5 gap-1.5 pt-2 border-t border-slate-100">
                        {stages.map((stage, idx) => (
                          <div key={stage.key} className="text-center space-y-1">
                            <div
                              className={`w-full h-1.5 rounded-full ${idx <= currentIdx
                                  ? "bg-emerald-600"
                                  : "bg-slate-200"
                                }`}
                            />
                            <span
                              className={`text-[11px] block truncate ${idx === currentIdx
                                  ? "font-bold text-emerald-800"
                                  : idx < currentIdx
                                    ? "font-medium text-slate-700"
                                    : "font-medium text-slate-400"
                                }`}
                            >
                              {stage.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Workflow Transition Action Buttons */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    स्थिति अपडेट करें (Update Status)
                  </h3>

                  {(!activeJobCard.technicianWorkflowStatus ||
                    activeJobCard.technicianWorkflowStatus === "assigned") && (
                      <button
                        type="button"
                        onClick={() => handleAdvanceStatus("on_the_way")}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-md text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                      >
                        <Navigation className="w-4 h-4" />
                        <span>रास्ते में निकला (On The Way) ➔</span>
                      </button>
                    )}

                  {activeJobCard.technicianWorkflowStatus === "on_the_way" && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus("arrived")}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-md text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                    >
                      <MapPin className="w-4 h-4" />
                      <span>खेत/स्थान पर पहुँचा (Arrived) ➔</span>
                    </button>
                  )}

                  {activeJobCard.technicianWorkflowStatus === "arrived" && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus("repairing")}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-md text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                    >
                      <Wrench className="w-4 h-4" />
                      <span>मरम्मत कार्य शुरू करें (Start Repair) ➔</span>
                    </button>
                  )}

                  {activeJobCard.technicianWorkflowStatus === "repairing" && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus("completed")}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-md text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>मरम्मत पूर्ण चिह्नित करें (Mark Completed) ➔</span>
                    </button>
                  )}

                  {activeJobCard.technicianWorkflowStatus === "completed" && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-center text-emerald-900 font-medium text-xs">
                      ✓ मरम्मत पूरी हो चुकी है। किसान को सत्यापन सूचना भेज दी गई है।
                    </div>
                  )}
                </div>

                {/* Job Card Details */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3.5 shadow-xs">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
                    <span>उपकरण व किसान विवरण</span>
                    <a
                      href="tel:9876543210"
                      className="text-xs bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>किसान को कॉल करें</span>
                    </a>
                  </h3>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
                    <span className="text-2xl p-1.5 bg-white rounded-md border border-slate-200 shadow-xs">
                      {activeJobCard.machineIcon || "🚜"}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-slate-900">
                        {activeJobCard.machine}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        समस्या: {activeJobCard.problem}
                      </div>
                    </div>
                  </div>

                  {/* Visual Evidence / Photo */}
                  {(activeJobCard.visualEvidence || activeJobCard.photoDataUrl) && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-md space-y-2">
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-slate-500" />
                        <span>किसान द्वारा भेजी गई फोटो (Visual Evidence):</span>
                      </div>
                      {activeJobCard.visualEvidence && (
                        <p className="text-xs text-slate-600 font-medium">
                          {activeJobCard.visualEvidence}
                        </p>
                      )}
                      {activeJobCard.photoDataUrl && (
                        <img
                          src={activeJobCard.photoDataUrl}
                          alt="Evidence"
                          className="w-full max-h-48 object-cover rounded-md border border-slate-200"
                        />
                      )}
                    </div>
                  )}

                  {/* Safety Warning */}
                  {activeJobCard.safetyMessage && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-md flex items-start gap-2 text-rose-900 text-xs font-medium">
                      <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                      <div>{activeJobCard.safetyMessage}</div>
                    </div>
                  )}
                </div>

                {/* Spare Parts Selection */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-slate-600" />
                      <span>स्पेयर पार्ट्स चयन (Parts Selection)</span>
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">आवश्यकता बताएं</span>
                  </div>

                  <div className="space-y-2">
                    {[
                      { id: "part-01", nameHi: "हाइड्रोलिक होस पाइप", partCode: "HYD-575-01", price: 650 },
                      { id: "part-02", nameHi: "ऑयल सील रिंग सेट", partCode: "SEAL-RING-02", price: 280 },
                      { id: "part-03", nameHi: "डीजल फिल्टर कार्ट्रिज", partCode: "DSL-FILT-03", price: 320 },
                    ].map((part) => {
                      const cur = activeJobCard.partSelections?.find((p) => p.partId === part.id);
                      return (
                        <div
                          key={part.id}
                          className={`p-2.5 rounded-md border flex items-center justify-between flex-wrap gap-2 ${cur?.decision === "needed"
                              ? "bg-emerald-50 border-emerald-300"
                              : cur?.decision === "not_needed"
                                ? "bg-slate-50 border-slate-200 opacity-60"
                                : "bg-white border-slate-200"
                            }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-900">{part.nameHi}</div>
                            <div className="text-[11px] text-slate-500 font-medium">
                              {part.partCode} • ₹{part.price}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handlePartDecision(part.id, part.nameHi, "needed")}
                              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${cur?.decision === "needed"
                                  ? "bg-emerald-700 text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                            >
                              ✓ चाहिए
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePartDecision(part.id, part.nameHi, "not_needed")}
                              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${cur?.decision === "not_needed"
                                  ? "bg-slate-600 text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                            >
                              ✕ नहीं चाहिए
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Transparent Billing & Cost Revision */}
                <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <span>पारदर्शी बिलिंग व लागत संशोधन</span>
                    </h3>
                    <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                      प्रमाणित दर
                    </span>
                  </div>

                  {!isEditingPrice ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingPrice(true)}
                      className="w-full bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold py-2 px-3 rounded-md border border-slate-200 text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <span>लागत / मजदूरी संशोधित करें (कारण के साथ)</span>
                    </button>
                  ) : (
                    <div className="bg-slate-50 p-3.5 rounded-md border border-slate-200 space-y-3 shadow-xs">
                      <div className="text-xs font-bold text-slate-900 border-b border-slate-200 pb-1.5">
                        लागत संशोधन प्रपत्र:
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">
                          संशोधित मजदूरी शुल्क (₹):
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={techLabourFeeOverride ?? 400}
                          onChange={(e) => setTechLabourFeeOverride(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-600 bg-white"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-slate-600 block mb-1">
                          संशोधन का अनिवार्य कारण:
                        </label>
                        <select
                          value={priceAdjustmentReason}
                          onChange={(e) => setPriceAdjustmentReason(e.target.value as PriceChangeReason)}
                          className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs font-medium text-slate-900 bg-white"
                        >
                          {PRICE_CHANGE_REASONS.map((reason) => (
                            <option key={reason} value={reason}>
                              {reason}
                            </option>
                          ))}
                        </select>
                      </div>

                      {priceAdjustmentReason === "अन्य" && (
                        <div>
                          <label className="text-xs font-medium text-slate-600 block mb-1">
                            विवरण:
                          </label>
                          <input
                            type="text"
                            value={customPriceNote}
                            onChange={(e) => setCustomPriceNote(e.target.value)}
                            placeholder="जैसे: अतिरिक्त वायरिंग बदली गई"
                            className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-xs font-medium text-slate-900 bg-white"
                          />
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSavePriceAdjustment}
                          className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2 rounded-md text-xs cursor-pointer transition-colors"
                        >
                          ✓ संशोधन सुरक्षित करें
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingPrice(false)}
                          className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-md text-xs cursor-pointer transition-colors"
                        >
                          रद्द करें
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Work Orders and Incoming Requests */
              <div className="space-y-5">
                {/* Real-time In-App Notification Banner for Incoming Request */}
                {incomingRepairs.length > 0 && (
                  <div className="bg-amber-50 text-amber-950 p-3 rounded-lg border border-amber-300 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                      <div className="truncate">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                          नया मरम्मत अनुरोध उपलब्ध
                        </div>
                        <div className="text-xs sm:text-sm font-bold truncate text-slate-900">
                          {incomingRepairs[0].farmerName || "Pawan Gupta"} • {incomingRepairs[0].machineNameHi || "Tractor"}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingRequest(incomingRepairs[0])}
                      className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold shrink-0 cursor-pointer transition-colors"
                    >
                      देखें ➔
                    </button>
                  </div>
                )}

                {/* ================= SECTION 1: INCOMING REQUESTS (नए मरम्मत अनुरोध) ================= */}
                <div id="incomingRequestsSection" className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-slate-600" />
                      <span>नए मरम्मत अनुरोध</span>
                    </h2>
                    <span className="text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-md">
                      {incomingRepairs.length} नया अनुरोध
                    </span>
                  </div>

                  {incomingRepairs.length === 0 ? (
                    <div className="bg-white rounded-lg p-6 text-center border border-dashed border-slate-200 space-y-1">
                      <h3 className="text-sm font-semibold text-slate-700">
                        फिलहाल कोई नया मरम्मत अनुरोध लंबित नहीं है।
                      </h3>
                      <p className="text-xs text-slate-500">
                        नए अनुरोध आने पर आपको तुरंत यहाँ सूचना मिलेगी।
                      </p>
                    </div>
                  ) : (
                    incomingRepairs.map((req) => (
                      <div
                        key={req.id}
                        className="bg-white rounded-xl p-4 border border-slate-200/90 hover:border-emerald-300 transition-all shadow-2xs space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-2xl p-2.5 bg-emerald-50 rounded-xl border border-emerald-100 flex-shrink-0">
                              {req.machineIcon || "🚜"}
                            </span>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                                  {req.farmerName || "Pawan Gupta"}
                                </h3>
                              </div>
                              <div className="text-xs font-bold text-emerald-800">
                                🚜 {req.machineNameHi || "Tractor"}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 flex-wrap mt-0.5">
                                <span>📍 {getTechnicianDistanceText(req)}</span>
                                <span>•</span>
                                <span>{req.farmerLocation?.village || "शाहपुर, लखनऊ"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                              req.urgency === "today"
                                ? "bg-amber-50 text-amber-900 border-amber-300"
                                : "bg-slate-50 text-slate-700 border-slate-200"
                            }`}>
                              {req.urgency === "today" ? "⚠️ आज ही" : "सामान्य"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{req.createdAt ? new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "अभी"}</span>
                            </span>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50/80 rounded-lg border border-slate-200/80 text-xs text-slate-700 space-y-1.5">
                          <div>
                            <span className="text-slate-500 font-medium block text-[11px]">समस्या (Problem):</span>
                            <span className="text-slate-900 font-bold text-xs sm:text-sm">
                              {req.problemDescription}
                            </span>
                          </div>
                          {req.diagnosis?.possibleProblem && (
                            <div className="pt-1.5 border-t border-slate-200/70 text-[11px]">
                              <span className="font-bold text-emerald-800">AI की संभावित जांच: </span>
                              <span className="text-slate-700 font-medium">{req.diagnosis.possibleProblem}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="text-xs text-slate-600 font-medium">
                            स्थिति: <span className="font-bold text-amber-800">{req.statusTextHi || "नया अनुरोध"}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setViewingRequest(req)}
                            className="bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white font-bold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
                          >
                            <span>अनुरोध देखें</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* ================= SECTION 2: ACTIVE REPAIRS (मेरे चल रहे काम) ================= */}
                <div id="activeWorkSection" className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-slate-600" />
                      <span>मेरे चल रहे काम</span>
                    </h2>
                    <span className="text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                      {activeRepairs.length} सक्रिय कार्य
                    </span>
                  </div>

                  {activeRepairs.length === 0 ? (
                    <div className="bg-white rounded-lg p-6 text-center border border-slate-200 space-y-1">
                      <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                      <h3 className="text-sm font-semibold text-slate-800">
                        कोई सक्रिय मरम्मत कार्य नहीं चल रहा है।
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        ऊपर दिए गए नए अनुरोध को स्वीकार कर काम शुरू करें।
                      </p>
                    </div>
                  ) : (
                    activeRepairs.map((repair) => {
                      const card = getJobCardByRepairId(repair.id) || getLatestJobCard();
                      return (
                        <div
                          key={repair.id}
                          className="bg-white rounded-lg p-4 border border-slate-200 hover:border-slate-300 transition-all shadow-xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl p-2 bg-slate-50 rounded-md border border-slate-200">
                                {repair.machineIcon || "🚜"}
                              </span>
                              <div>
                                <span className="text-xs font-medium text-slate-400 block">
                                  {repair.id}
                                </span>
                                <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                                  {repair.farmerName || "Pawan Gupta"} • {repair.machineNameHi}
                                </h3>
                                <span className="text-xs text-slate-500 font-medium">
                                  {repair.farmerLocation?.village || "शाहपुर"}, {repair.farmerLocation?.district || "लखनऊ"}
                                </span>
                              </div>
                            </div>

                            <span className="text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                              {repair.urgency === "today" ? "आज ही" : "2-3 दिन में"}
                            </span>
                          </div>

                          <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 text-xs text-slate-700">
                            <span className="text-slate-500 font-medium block mb-0.5">समस्या:</span>
                            <span className="text-slate-900 font-semibold">
                              {repair.problemDescription}
                            </span>
                          </div>

                          {/* Quick Lifecycle Stage Stepper */}
                          <div className="p-2 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between text-xs font-medium">
                            <span className="text-slate-700">
                              वर्तमान चरण: <strong className="text-emerald-800 font-semibold">{repair.statusTextHi}</strong>
                            </span>
                            {repair.routeUrl && (
                              <a
                                href={repair.routeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                                <span>रास्ता देखें</span>
                              </a>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedJobCardId(card ? card.jobId : repair.id);
                              }}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs px-3.5 py-1.5 rounded-md flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                            >
                              <span>कार्य विवरण / स्थिति अपडेट करें</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: EARNINGS & SETTLEMENT ================= */}
        {activeTab === "earnings" && (
          <div className="space-y-4">
            <div className="bg-slate-900 text-white rounded-lg p-4 space-y-3 shadow-xs border border-slate-800">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                डिजिटल भुगतान व खाता विवरण
              </span>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-slate-400">कुल संचित आय (Total Earnings)</div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">
                    ₹{totalSettlement.toLocaleString("en-IN")}
                  </div>
                </div>
                <span className="bg-slate-800 text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded border border-slate-700">
                  शून्य कमीशन मॉडल
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                प्रत्येक पूर्ण मरम्मत का भुगतान सीधा आपके बैंक खाते में 24 घंटे में स्थानांतरित किया जाता है।
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                हाल के मरम्मत बिल व भुगतान इतिहास
              </h3>

              <div className="space-y-2 text-xs">
                {[
                  { id: "PAY-901", machine: "महिंद्रा 575 DI", farmer: "रामलाल यादव", amount: 850, date: "आज", status: "प्रक्रियाधीन" },
                  { id: "PAY-882", machine: "कृषि स्प्रेयर 16L", farmer: "सुरेश वर्मा", amount: 450, date: "कल", status: "सफल" },
                  { id: "PAY-871", machine: "वाटर पंप 5HP", farmer: "हरिपाल सिंह", amount: 600, date: "28 सितंबर", status: "सफल" },
                ].map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-slate-50 rounded-md border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">{item.machine}</div>
                      <div className="text-slate-500 font-medium text-[11px]">
                        {item.farmer} • {item.date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900 text-sm">₹{item.amount}</div>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.status === "सफल"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                          }`}
                      >
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>
      )}

      {/* ================= BOTTOM NAVIGATION FOR TECHNICIAN ================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 py-1.5 shadow-sm flex justify-center">
        <div className="w-full max-w-md grid grid-cols-4 px-2">
          {/* 🏠 Home */}
          <button
            type="button"
            id="technician-nav-home-btn"
            onClick={() => {
              setActiveTab("jobs");
              setSelectedJobCardId(null);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className={`py-1.5 px-1 flex flex-col items-center justify-center rounded-md transition-colors cursor-pointer ${
              activeTab === "jobs" && !selectedJobCardId
                ? "text-emerald-700 font-bold bg-emerald-50"
                : "text-slate-600 font-medium hover:text-slate-900"
            }`}
          >
            <Home className="w-5 h-5 mb-0.5" />
            <span className="text-[11px]">{currentLanguage === "en" ? "Home" : "होम"}</span>
          </button>

          {/* 🔔 Requests */}
          <button
            type="button"
            id="technician-nav-requests-btn"
            onClick={() => {
              setActiveTab("jobs");
              setSelectedJobCardId(null);
              setTimeout(() => {
                const el = document.getElementById("incomingRequestsSection");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }, 50);
            }}
            className="py-1.5 px-1 flex flex-col items-center justify-center rounded-md transition-colors cursor-pointer text-slate-600 font-medium hover:text-slate-900"
          >
            <AlertCircle className="w-5 h-5 mb-0.5 text-amber-600" />
            <span className="text-[11px]">{currentLanguage === "en" ? "Requests" : "अनुरोध"}</span>
          </button>

          {/* 🔧 Repairs */}
          <button
            type="button"
            id="technician-nav-repairs-btn"
            onClick={() => {
              setActiveTab("jobs");
              setTimeout(() => {
                const el = document.getElementById("activeWorkSection");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }, 50);
            }}
            className="py-1.5 px-1 flex flex-col items-center justify-center rounded-md transition-colors cursor-pointer text-slate-600 font-medium hover:text-slate-900"
          >
            <ClipboardList className="w-5 h-5 mb-0.5 text-emerald-700" />
            <span className="text-[11px]">{currentLanguage === "en" ? "Repairs" : "मरम्मत"}</span>
          </button>

          {/* 👤 Profile */}
          <button
            type="button"
            id="technician-nav-profile-btn"
            onClick={() => setActiveTab("profile")}
            className={`py-1.5 px-1 flex flex-col items-center justify-center rounded-md transition-colors cursor-pointer ${
              activeTab === "profile"
                ? "text-emerald-700 font-bold bg-emerald-50"
                : "text-slate-600 font-medium hover:text-slate-900"
            }`}
          >
            <User className="w-5 h-5 mb-0.5" />
            <span className="text-[11px]">{currentLanguage === "en" ? "Profile" : "प्रोफाइल"}</span>
          </button>
        </div>
      </nav>
      {/* ================= MODAL 1: REQUEST DETAILS MODAL ================= */}
      {viewingRequest && !isConfirmingAccept && !isRejecting && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-lg w-full overflow-hidden border border-slate-200 shadow-xl">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">मरम्मत अनुरोध विवरण</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingRequest(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto text-xs sm:text-sm divide-y divide-slate-100">
              {/* 1. Problem Information */}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  समस्या विवरण (Problem)
                </span>
                <div className="text-base font-bold text-slate-900">
                  &quot;{viewingRequest.problemDescription}&quot;
                </div>
              </div>

              {/* 2. Machine & Urgency */}
              <div className="pt-3.5 space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  उपकरण एवं प्राथमिकता (Machine & Urgency)
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl p-1.5 bg-slate-100 rounded-md border border-slate-200">
                      {viewingRequest.machineIcon || "🚜"}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900 text-sm">
                        {viewingRequest.machineNameHi || "Tractor"}
                      </div>
                      <div className="text-xs text-slate-500 font-medium">
                        {viewingRequest.machineId || "Mach-01"}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                    {viewingRequest.urgency === "today" ? "⚠️ अति आवश्यक (आज ही)" : "सामान्य समय"}
                  </span>
                </div>
              </div>

              {/* 3. AI Potential Assessment */}
              <div className="pt-3.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
                    <span>AI की संभावित जांच</span>
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    विश्वसनीयता: {viewingRequest.diagnosis?.confidence || "89%"}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-900">
                  {viewingRequest.diagnosis?.possibleProblem || "Starting system में समस्या हो सकती है."}
                </div>

                <p className="text-[11px] text-slate-500 font-medium">
                  (यह AI की संभावित जांच है। अंतिम पुष्टि मौके पर जांच करके करें।)
                </p>

                {viewingRequest.diagnosis?.reasons && viewingRequest.diagnosis.reasons.length > 0 && (
                  <ul className="list-disc pl-4 space-y-0.5 text-xs text-slate-600">
                    {viewingRequest.diagnosis.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}

                {viewingRequest.diagnosis?.safeAction && (
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-md text-xs text-amber-900 font-medium flex items-start gap-1.5 mt-1.5">
                    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>{viewingRequest.diagnosis.safeAction}</span>
                  </div>
                )}
              </div>

              {/* 4. Location & Farmer */}
              <div className="pt-3.5 space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  स्थान एवं किसान (Location & Distance)
                </span>
                <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">
                      {viewingRequest.farmerName || "Pawan Gupta"}
                    </div>
                    <div className="text-slate-500 mt-0.5">
                      📍 {viewingRequest.farmerLocation?.village || "शाहपुर, लखनऊ"} ({viewingRequest.approxDistanceText || "3.2 किमी दूर"})
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-500">संपर्क</div>
                    <div className="font-semibold text-slate-800">
                      +91 {viewingRequest.farmerPhone || "9876543210"}
                    </div>
                  </div>
                </div>
              </div>

              {/* 5. Required Skill & Parts */}
              <div className="pt-3.5 space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  आवश्यक कौशल व पार्ट्स (Skill & Parts)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    🔧 Tractor Mechanical
                  </span>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    ⚙️ Fuel Filter / Starter Motor
                  </span>
                </div>
              </div>

              {/* 6. Estimated Billing */}
              <div className="pt-3.5 space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  अनुमानित शुल्क (Estimated Labor & Visit)
                </span>
                <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <span>विजिट व मानक जांच शुल्क:</span>
                  <span className="font-bold text-slate-900 text-sm">₹400</span>
                </div>
              </div>

              {/* 7. Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRejecting(true)}
                  className="w-full py-2.5 px-4 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  अस्वीकार करें
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfirmingAccept(true)}
                  className="w-full py-2.5 px-4 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  अनुरोध स्वीकार करें ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: REJECT REASON MODAL ================= */}
      {viewingRequest && isRejecting && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden border border-slate-200 shadow-xl">
            <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">अस्वीकार करने का कारण चुनें</h3>
              <button
                type="button"
                onClick={() => setIsRejecting(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs sm:text-sm">
              <p className="text-xs text-slate-600 font-medium">
                कृपया कारण बताएं ताकि किसान को दूसरा नजदीकी मैकेनिक भेजा जा सके:
              </p>

              {[
                "काम उपलब्ध नहीं",
                "यह मशीन/समस्या मेरी skill से बाहर है",
                "बहुत दूर है",
                "अन्य कारण",
              ].map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer font-medium text-xs ${
                    selectedRejectReason === reason
                      ? "bg-amber-50 border-amber-400 text-slate-900"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    value={reason}
                    checked={selectedRejectReason === reason}
                    onChange={(e) => setSelectedRejectReason(e.target.value)}
                    className="accent-emerald-700 w-4 h-4"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              {selectedRejectReason === "अन्य कारण" && (
                <input
                  type="text"
                  placeholder="कारण लिखें..."
                  value={customRejectReason}
                  onChange={(e) => setCustomRejectReason(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-300 text-xs font-medium"
                />
              )}

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="w-full py-2.5 px-4 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  वापस जाएं
                </button>

                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="w-full py-2.5 px-4 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  अस्वीकार दर्ज करें
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: ACCEPT CONFIRMATION STEP ================= */}
      {viewingRequest && isConfirmingAccept && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden border border-slate-200 shadow-xl">
            <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">मरम्मत अनुरोध स्वीकार करें</h3>
              <button
                type="button"
                onClick={() => setIsConfirmingAccept(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">किसान:</span>
                  <span className="font-bold text-slate-900">{viewingRequest.farmerName || "Pawan Gupta"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">मशीन:</span>
                  <span className="font-bold text-slate-900">{viewingRequest.machineNameHi || "Tractor"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">समस्या:</span>
                  <span className="font-bold text-slate-900 truncate max-w-[200px]">{viewingRequest.problemDescription}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setIsConfirmingAccept(false)}
                  className="w-full py-2.5 px-4 rounded-md border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  वापस जाएं
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAccept}
                  className="w-full py-2.5 px-4 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  पुष्टि करें व स्वीकार करें
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: PARTS / TOOLS PREPARATION WIZARD ================= */}
      {isPartsToolsWizardOpen && acceptedRepair && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-lg w-full overflow-hidden border border-slate-200 shadow-xl">
            <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">आवश्यक सामान व तैयारी (Parts & Tools)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPartsToolsWizardOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs sm:text-sm">
              {/* Category options */}
              <div className="space-y-2">
                <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-md border border-slate-200 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={includeSpareParts}
                    onChange={(e) => setIncludeSpareParts(e.target.checked)}
                    className="w-4 h-4 accent-emerald-700"
                  />
                  <span>स्पेयर पार्ट्स (Spare Parts)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-md border border-slate-200 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={includeTools}
                    onChange={(e) => setIncludeTools(e.target.checked)}
                    className="w-4 h-4 accent-emerald-700"
                  />
                  <span>औजार किट (Tools Kit)</span>
                </label>

                <label className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-md border border-slate-200 cursor-pointer font-semibold text-slate-800">
                  <input
                    type="checkbox"
                    checked={needFarmerInfo}
                    onChange={(e) => setNeedFarmerInfo(e.target.checked)}
                    className="w-4 h-4 accent-emerald-700"
                  />
                  <span>किसान से पहले जानकारी लेनी है</span>
                </label>
              </div>

              {/* Spare parts sub-section */}
              {includeSpareParts && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-md space-y-2">
                  <div className="font-semibold text-slate-900 text-xs">कौन-से parts चाहिए?</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {["Starter", "Battery", "Belt", "Filter", "Other"].map((part) => {
                      const isSel = selectedPartsList.includes(part);
                      return (
                        <button
                          key={part}
                          type="button"
                          onClick={() => {
                            if (isSel) {
                              setSelectedPartsList(selectedPartsList.filter((p) => p !== part));
                            } else {
                              setSelectedPartsList([...selectedPartsList, part]);
                            }
                          }}
                          className={`p-2 rounded-md border text-left font-medium flex items-center justify-between cursor-pointer transition-colors ${
                            isSel
                              ? "bg-emerald-700 text-white border-emerald-800"
                              : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <span>{part}</span>
                          {isSel && <span>✓</span>}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom part adder */}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="दूसरा part लिखें..."
                      value={customPartInput}
                      onChange={(e) => setCustomPartInput(e.target.value)}
                      className="flex-1 bg-white p-2 rounded-md border border-slate-300 text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customPartInput.trim() && !selectedPartsList.includes(customPartInput.trim())) {
                          setSelectedPartsList([...selectedPartsList, customPartInput.trim()]);
                          setCustomPartInput("");
                        }
                      }}
                      className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors"
                    >
                      + जोड़ें
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    * आवश्यकतानुसार बदलाव कर सकते हैं।
                  </p>
                </div>
              )}

              {/* Farmer Question sub-section */}
              {needFarmerInfo && (
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-md space-y-2">
                  <div className="font-semibold text-slate-900 text-xs">किसान से कुछ और पूछना है?</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTechnicianMessageToFarmer("क्या tractor में battery की light आ रही है?")}
                      className="text-[11px] bg-white border border-slate-300 text-slate-700 px-2 py-0.5 rounded-md font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      + &quot;क्या battery light आ रही है?&quot;
                    </button>
                    <button
                      type="button"
                      onClick={() => setTechnicianMessageToFarmer("क्या सेल्फ दबाने पर क्लिक-क्लिक आवाज आ रही है?")}
                      className="text-[11px] bg-white border border-slate-300 text-slate-700 px-2 py-0.5 rounded-md font-medium cursor-pointer hover:bg-slate-100 transition-colors"
                    >
                      + &quot;क्या क्लिक-क्लिक आवाज है?&quot;
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="संदेश लिखें..."
                    value={technicianMessageToFarmer}
                    onChange={(e) => setTechnicianMessageToFarmer(e.target.value)}
                    className="w-full bg-white p-2 rounded-md border border-slate-300 text-xs font-medium"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleSavePartsAndProceed}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-md text-xs shadow-xs cursor-pointer transition-colors"
              >
                आगे बढ़ें (तैयारी पूरी) ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: FINAL TRIP CONFIRMATION ================= */}
      {isTripConfirmationOpen && acceptedRepair && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden border border-slate-200 shadow-xl">
            <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">मरम्मत हेतु प्रस्थान</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTripConfirmationOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-md space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">किसान:</span>
                  <span className="font-bold text-slate-900">{acceptedRepair.farmerName || "Pawan Gupta"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">मशीन:</span>
                  <span className="font-bold text-slate-900">{acceptedRepair.machineNameHi || "Tractor"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">समस्या:</span>
                  <span className="font-bold text-slate-900">{acceptedRepair.problemDescription}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">आवश्यक सामग्री:</span>
                  <span className="font-bold text-emerald-800">{selectedPartsList.join(", ") || "कोई पार्ट नहीं"}</span>
                </div>
                {technicianMessageToFarmer && (
                  <div className="pt-1 text-[11px] text-slate-700 font-medium">
                    संदेश: &quot;{technicianMessageToFarmer}&quot;
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-amber-50 rounded-md border border-amber-200 text-xs font-medium text-amber-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-700 shrink-0" />
                <div>
                  किसान का स्थान: <strong>{acceptedRepair.farmerLocation?.village || "शाहपुर"}, {acceptedRepair.farmerLocation?.district || "लखनऊ"}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartTrip}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 rounded-md text-xs shadow-xs cursor-pointer transition-colors"
              >
                मरम्मत के लिए निकलें ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 6: COMPLETE REPAIR MODAL ================= */}
      {isCompletingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-fadeIn">
          <div className="bg-white rounded-lg max-w-md w-full overflow-hidden border border-slate-200 shadow-xl">
            <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                <h3 className="text-base font-bold text-slate-900">मरम्मत पूर्ण चिह्नित करें</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCompletingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  कार्य का विवरण (Work Performed):
                </label>
                <textarea
                  rows={2}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-300 font-medium text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  उपयोग किए गए स्पेयर पार्ट्स:
                </label>
                <div className="p-2.5 bg-slate-50 rounded-md border border-slate-200 font-medium text-xs text-slate-800">
                  {selectedPartsList.join(", ") || "कोई नया पार्ट नहीं लगा"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  अंतिम मरम्मत शुल्क (Final Labour Fee):
                </label>
                <input
                  type="number"
                  value={completionLabourFee}
                  onChange={(e) => setCompletionLabourFee(Number(e.target.value))}
                  className="w-full p-2 rounded-md border border-slate-300 font-bold text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCompletingModalOpen(false)}
                  className="bg-white border border-slate-300 hover:bg-slate-50 py-2.5 rounded-md text-xs font-medium text-slate-700 cursor-pointer transition-colors"
                >
                  रद्द करें
                </button>

                <button
                  type="button"
                  onClick={handleConfirmCompletion}
                  className="bg-emerald-700 hover:bg-emerald-800 py-2.5 rounded-md text-xs font-semibold text-white shadow-xs cursor-pointer transition-colors"
                >
                  मरम्मत पूरी हुई ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating feedback toast */}
      {feedbackToast && (
        <div className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto bg-slate-900 text-white px-4 py-2.5 rounded-md font-medium text-center text-xs shadow-lg border border-slate-800 animate-fadeIn">
          {feedbackToast}
        </div>
      )}
    </div>
  );
}
