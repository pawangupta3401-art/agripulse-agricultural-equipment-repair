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
} from "lucide-react";
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

  // Filter incoming repair requests (waiting for technician)
  const incomingRepairs = repairs.filter(
    (r) =>
      r.status !== "completed" &&
      (r.status === "finding_mechanic" || r.status === "reported" || !r.technicianId) &&
      r.rejectionReason !== `rejected_by_${session.user.id}`
  );

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
      <header className="bg-slate-900 text-white px-4 py-3 sm:py-4 border-b-4 border-emerald-500 shadow-md sticky top-0 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-2xl sm:text-3xl p-1.5 bg-slate-800 rounded-xl border border-slate-700">
              🔧
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white">
                  नमस्ते, {session.user.nameHi || session.user.name || "टेक्नीशियन साथी"} 👋
                </h1>
                <span className="bg-emerald-600 text-white text-[11px] font-black px-2 py-0.5 rounded-full border border-emerald-400">
                  प्रमाणित मिस्त्री
                </span>
              </div>
              <p className="text-xs text-slate-400 font-bold">
                {session.user.villageOrArea || "नागपुर ग्रामीण"} • +91 {session.user.phone}
              </p>
            </div>
          </div>

          {/* Quick status & logout */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAvailable((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-black border transition-all cursor-pointer ${isAvailable
                  ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                  : "bg-red-500/20 border-red-400 text-red-300"
                }`}
            >
              {isAvailable ? "🟢 ऑन-ड्यूटी" : "🔴 ऑफ-ड्यूटी"}
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 cursor-pointer transition-colors"
            >
              लॉगआउट
            </button>
          </div>
        </div>
      </header>

      {/* ================= MAIN CONTAINER ================= */}
      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
          <div className="bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 block">सक्रिय कार्य</span>
            <span className="text-xl sm:text-2xl font-black text-emerald-700">
              {assignedRepairs.length}
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 block">पूर्ण मरम्मत</span>
            <span className="text-xl sm:text-2xl font-black text-indigo-700">
              {completedRepairs.length + 18}
            </span>
          </div>

          <div className="bg-white p-3 rounded-2xl border-2 border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 block">कुल कमाई</span>
            <span className="text-xl sm:text-2xl font-black text-amber-700">
              ₹{totalSettlement.toLocaleString("en-IN")}
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
                  className="flex items-center gap-1.5 text-sm font-black text-slate-700 hover:text-black bg-white px-3 py-1.5 rounded-xl border border-slate-300 cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>सभी कार्यों की सूची पर वापस जाएं</span>
                </button>

                {/* Stepper Status Banner */}
                <div className="bg-white border-3 border-emerald-500 rounded-3xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-500 uppercase tracking-wide">
                      कार्य प्रगति स्थिति (Workflow Status):
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      {activeJobCard.jobId}
                    </span>
                  </div>

                  <div className="text-xl sm:text-2xl font-black text-emerald-900 flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse"></span>
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
                      <div className="grid grid-cols-5 gap-1 pt-2 border-t border-slate-100">
                        {stages.map((stage, idx) => (
                          <div key={stage.key} className="text-center space-y-1">
                            <div
                              className={`w-full h-2 rounded-full ${idx < currentIdx
                                  ? "bg-emerald-600"
                                  : idx === currentIdx
                                    ? "bg-emerald-500 animate-pulse"
                                    : "bg-slate-200"
                                }`}
                            />
                            <span
                              className={`text-[11px] font-black block truncate ${idx === currentIdx
                                  ? "text-emerald-900"
                                  : idx < currentIdx
                                    ? "text-slate-700"
                                    : "text-slate-400"
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
                <div className="bg-white border-2 border-slate-300 rounded-3xl p-5 space-y-3 shadow-xs">
                  <h3 className="text-sm font-black text-slate-700 uppercase tracking-wide">
                    स्थिति अपडेट करें (Update Status)
                  </h3>

                  {(!activeJobCard.technicianWorkflowStatus ||
                    activeJobCard.technicianWorkflowStatus === "assigned") && (
                      <button
                        type="button"
                        onClick={() => handleAdvanceStatus("on_the_way")}
                        className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-black py-4 px-4 rounded-2xl text-lg shadow-md border-2 border-emerald-950 flex items-center justify-center gap-2 active:translate-y-0.5 cursor-pointer"
                      >
                        <Navigation className="w-5 h-5 text-amber-300" />
                        <span>रास्ते में निकला (On The Way) ➔</span>
                      </button>
                    )}

                  {activeJobCard.technicianWorkflowStatus === "on_the_way" && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus("arrived")}
                      className="w-full bg-indigo-700 hover:bg-indigo-800 text-white font-black py-4 px-4 rounded-2xl text-lg shadow-md border-2 border-indigo-950 flex items-center justify-center gap-2 active:translate-y-0.5 cursor-pointer"
                    >
                      <MapPin className="w-5 h-5 text-amber-300" />
                      <span>खेत/स्थान पर पहुँचा (Arrived) ➔</span>
                    </button>
                  )}

                  {activeJobCard.technicianWorkflowStatus === "arrived" && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus("repairing")}
                      className="w-full bg-blue-700 hover:bg-blue-800 text-white font-black py-4 px-4 rounded-2xl text-lg shadow-md border-2 border-blue-950 flex items-center justify-center gap-2 active:translate-y-0.5 cursor-pointer"
                    >
                      <Wrench className="w-5 h-5 text-amber-300" />
                      <span>मरम्मत कार्य शुरू करें (Start Repair) ➔</span>
                    </button>
                  )}

                  {activeJobCard.technicianWorkflowStatus === "repairing" && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus("completed")}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-4 rounded-2xl text-lg shadow-md border-2 border-emerald-950 flex items-center justify-center gap-2 active:translate-y-0.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5 text-amber-300" />
                      <span>मरम्मत पूर्ण चिह्नित करें (Mark Completed) ➔</span>
                    </button>
                  )}

                  {activeJobCard.technicianWorkflowStatus === "completed" && (
                    <div className="p-3 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-center text-emerald-950 font-bold">
                      ✓ मरम्मत पूरी हो चुकी है। किसान को सत्यापन सूचना भेज दी गई है।
                    </div>
                  )}
                </div>

                {/* Job Card Details */}
                <div className="bg-white border-2 border-slate-300 rounded-3xl p-5 space-y-4 shadow-xs">
                  <h3 className="text-base font-black text-slate-800 border-b pb-2 flex items-center justify-between">
                    <span>उपकरण व किसान विवरण</span>
                    <a
                      href="tel:9876543210"
                      className="text-xs bg-emerald-50 border border-emerald-400 text-emerald-800 px-2.5 py-1 rounded-lg font-black flex items-center gap-1"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>किसान को कॉल करें</span>
                    </a>
                  </h3>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <span className="text-4xl p-2 bg-white rounded-xl shadow-xs">
                      {activeJobCard.machineIcon || "🚜"}
                    </span>
                    <div>
                      <div className="text-lg font-black text-slate-900">
                        {activeJobCard.machine}
                      </div>
                      <div className="text-xs font-bold text-slate-500">
                        समस्या: {activeJobCard.problem}
                      </div>
                    </div>
                  </div>

                  {/* Visual Evidence / Photo */}
                  {(activeJobCard.visualEvidence || activeJobCard.photoDataUrl) && (
                    <div className="p-3 bg-indigo-50 border-2 border-indigo-200 rounded-2xl space-y-2">
                      <div className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-indigo-700" />
                        <span>किसान द्वारा भेजी गई फोटो (Visual Evidence):</span>
                      </div>
                      {activeJobCard.visualEvidence && (
                        <p className="text-xs font-bold text-indigo-950">
                          {activeJobCard.visualEvidence}
                        </p>
                      )}
                      {activeJobCard.photoDataUrl && (
                        <img
                          src={activeJobCard.photoDataUrl}
                          alt="Evidence"
                          className="w-full max-h-48 object-cover rounded-xl border border-indigo-300"
                        />
                      )}
                    </div>
                  )}

                  {/* Safety Warning */}
                  {activeJobCard.safetyMessage && (
                    <div className="p-3 bg-red-50 border-2 border-red-400 rounded-2xl flex items-start gap-2 text-red-950 text-xs font-bold">
                      <ShieldAlert className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div>{activeJobCard.safetyMessage}</div>
                    </div>
                  )}
                </div>

                {/* Spare Parts Selection */}
                <div className="bg-white border-2 border-slate-300 rounded-3xl p-5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-slate-700" />
                      <span>स्पेयर पार्ट्स चयन (Parts Selection)</span>
                    </h3>
                    <span className="text-xs font-bold text-slate-500">आवश्यकता बताएं</span>
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
                          className={`p-3 rounded-2xl border-2 flex items-center justify-between flex-wrap gap-2 ${cur?.decision === "needed"
                              ? "bg-emerald-50 border-emerald-400"
                              : cur?.decision === "not_needed"
                                ? "bg-slate-100 border-slate-300"
                                : "bg-white border-slate-200"
                            }`}
                        >
                          <div>
                            <div className="text-sm font-black text-slate-900">{part.nameHi}</div>
                            <div className="text-xs font-bold text-slate-500">
                              {part.partCode} • ₹{part.price}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handlePartDecision(part.id, part.nameHi, "needed")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer ${cur?.decision === "needed"
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                }`}
                            >
                              ✓ चाहिए
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePartDecision(part.id, part.nameHi, "not_needed")}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black cursor-pointer ${cur?.decision === "not_needed"
                                  ? "bg-slate-600 text-white"
                                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
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
                <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-3 border-amber-400 rounded-3xl p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                    <h3 className="text-base font-black text-amber-950 flex items-center gap-1.5">
                      <span>💰</span>
                      <span>पारदर्शी बिलिंग व लागत संशोधन</span>
                    </h3>
                    <span className="text-xs font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md">
                      प्रमाणित दर
                    </span>
                  </div>

                  {!isEditingPrice ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingPrice(true)}
                      className="w-full bg-white hover:bg-amber-100 text-amber-950 font-black py-2.5 px-3 rounded-xl border-2 border-amber-400 text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <span>✏️</span>
                      <span>लागत / मजदूरी संशोधित करें (कारण के साथ)</span>
                    </button>
                  ) : (
                    <div className="bg-white p-4 rounded-2xl border-2 border-amber-400 space-y-3 shadow-xs">
                      <div className="text-sm font-black text-slate-900 border-b pb-1.5">
                        लागत संशोधन प्रपत्र:
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          संशोधित मजदूरी शुल्क (₹):
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={techLabourFeeOverride ?? 400}
                          onChange={(e) => setTechLabourFeeOverride(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full border-2 border-slate-300 rounded-xl px-3 py-2 text-base font-black text-slate-900 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">
                          संशोधन का अनिवार्य कारण:
                        </label>
                        <select
                          value={priceAdjustmentReason}
                          onChange={(e) => setPriceAdjustmentReason(e.target.value as PriceChangeReason)}
                          className="w-full border-2 border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 bg-white"
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
                          <label className="text-xs font-bold text-slate-600 block mb-1">
                            विवरण:
                          </label>
                          <input
                            type="text"
                            value={customPriceNote}
                            onChange={(e) => setCustomPriceNote(e.target.value)}
                            placeholder="जैसे: अतिरिक्त वायरिंग बदली गई"
                            className="w-full border-2 border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900"
                          />
                        </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSavePriceAdjustment}
                          className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black py-2 rounded-xl text-sm border-2 border-amber-600 cursor-pointer"
                        >
                          ✓ संशोधन सुरक्षित करें
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditingPrice(false)}
                          className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded-xl text-sm cursor-pointer"
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
                {/* 🔔 Real-time In-App Notification Banner for Incoming Request */}
                {incomingRepairs.length > 0 && (
                  <div className="bg-amber-400 text-slate-950 p-3.5 sm:p-4 rounded-2xl border-2 border-amber-600 shadow-md flex items-center justify-between gap-3 animate-pulse">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0">🔔</span>
                      <div className="truncate">
                        <div className="text-[11px] font-black uppercase tracking-wider text-amber-950">
                          नया मरम्मत अनुरोध उपलब्ध
                        </div>
                        <div className="text-sm font-black truncate text-slate-950">
                          {incomingRepairs[0].farmerName || "Pawan Gupta"} के {incomingRepairs[0].machineNameHi || "Tractor"} में समस्या है.
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setViewingRequest(incomingRepairs[0])}
                      className="bg-slate-900 hover:bg-black text-amber-300 px-3.5 py-1.5 rounded-xl text-xs font-black shrink-0 transition-transform active:scale-95 cursor-pointer shadow-xs"
                    >
                      देखें ➔
                    </button>
                  </div>
                )}

                {/* ================= SECTION 1: INCOMING REQUESTS (नया मरम्मत अनुरोध) ================= */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600" />
                      <span>नया मरम्मत अनुरोध</span>
                    </h2>
                    <span className="text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full">
                      {incomingRepairs.length} नया अनुरोध
                    </span>
                  </div>

                  {incomingRepairs.length === 0 ? (
                    <div className="bg-white rounded-3xl p-5 text-center border-2 border-dashed border-slate-300 space-y-2">
                      <span className="text-3xl block">🌾</span>
                      <h3 className="text-sm font-black text-slate-700">
                        फिलहाल कोई नया मरम्मत अनुरोध लंबित नहीं है।
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          const demo = createSimulatedDemoRepair();
                          ensureSimulatedDemoRequest();
                          onRefreshData();
                          showToast("✓ सिमुलेटेड डेमो अनुरोध (Pawan Gupta - Tractor) तैयार!");
                        }}
                        className="mt-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-400 px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer"
                      >
                        + सिमुलेटेड डेमो अनुरोध बनाएं (Pawan Gupta - Tractor)
                      </button>
                    </div>
                  ) : (
                    incomingRepairs.map((req) => (
                      <div
                        key={req.id}
                        className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-amber-400 hover:border-amber-600 transition-all shadow-sm space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl p-2 bg-amber-50 rounded-2xl border border-amber-200">
                              {req.machineIcon || "🚜"}
                            </span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-slate-600">👨‍🌾</span>
                                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                                  {req.farmerName || "Pawan Gupta"}
                                </h3>
                              </div>
                              <div className="text-xs font-bold text-emerald-800">
                                {req.machineNameHi || "Tractor"}
                              </div>
                              <span className="text-[11px] font-bold text-slate-500">
                                📍 {req.approxDistanceText || "3.2 किमी दूर"} • {req.farmerLocation?.village || "शाहपुर, लखनऊ"}
                              </span>
                            </div>
                          </div>

                          <span className="text-xs font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                            ⚠️ {req.urgency === "today" ? "जरूरी" : "सामान्य"}
                          </span>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                          <span className="text-slate-500 block mb-0.5">समस्या:</span>
                          <span className="text-slate-900 font-black">
                            {req.problemDescription}
                          </span>
                          {req.diagnosis?.possibleProblem && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-200 text-[11px] text-indigo-900">
                              <span className="font-black">AI की संभावित जांच: </span>
                              <span>{req.diagnosis.possibleProblem}</span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <div className="text-xs font-bold text-slate-600">
                            स्थिति: <span className="font-black text-amber-700">{req.statusTextHi}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setViewingRequest(req)}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer active:translate-y-0.5 border border-amber-600"
                          >
                            <span>अनुरोध देखें</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* ================= SECTION 2: ACTIVE REPAIRS (चल रहा मरम्मत काम) ================= */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-emerald-700" />
                      <span>चल रहा मरम्मत काम</span>
                    </h2>
                    <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                      {activeRepairs.length} सक्रिय कार्य
                    </span>
                  </div>

                  {activeRepairs.length === 0 ? (
                    <div className="bg-white rounded-3xl p-6 text-center border-2 border-slate-200 space-y-1">
                      <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                      <h3 className="text-sm font-black text-slate-800">
                        कोई सक्रिय मरम्मत कार्य नहीं चल रहा है।
                      </h3>
                      <p className="text-xs font-bold text-slate-500">
                        ऊपर दिए गए नए अनुरोध को स्वीकार कर काम शुरू करें।
                      </p>
                    </div>
                  ) : (
                    activeRepairs.map((repair) => {
                      const card = getJobCardByRepairId(repair.id) || getLatestJobCard();
                      return (
                        <div
                          key={repair.id}
                          className="bg-white rounded-3xl p-4 sm:p-5 border-2 border-emerald-500 hover:border-emerald-600 transition-all shadow-xs space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <span className="text-3xl p-2 bg-slate-50 rounded-2xl border border-slate-200">
                                {repair.machineIcon || "🚜"}
                              </span>
                              <div>
                                <span className="text-xs font-black text-slate-500 block">
                                  {repair.id}
                                </span>
                                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                                  {repair.farmerName || "Pawan Gupta"} • {repair.machineNameHi}
                                </h3>
                                <span className="text-xs font-bold text-slate-500">
                                  {repair.farmerLocation?.village || "शाहपुर"}, {repair.farmerLocation?.district || "लखनऊ"}
                                </span>
                              </div>
                            </div>

                            <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {repair.urgency === "today" ? "आज ही" : "2-3 दिन में"}
                            </span>
                          </div>

                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
                            <span className="text-slate-500 block mb-0.5">समस्या:</span>
                            <span className="text-slate-900 font-black">
                              {repair.problemDescription}
                            </span>
                          </div>

                          {/* Quick Lifecycle Stage Stepper */}
                          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-[11px] font-bold">
                            <span className="text-emerald-950">
                              वर्तमान चरण: <strong className="text-emerald-800">{repair.statusTextHi}</strong>
                            </span>
                            {repair.routeUrl && (
                              <a
                                href={repair.routeUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-700 hover:underline flex items-center gap-1 font-black"
                              >
                                <Navigation className="w-3.5 h-3.5" />
                                <span>📍 रास्ता देखें</span>
                              </a>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedJobCardId(card ? card.jobId : repair.id);
                              }}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs sm:text-sm px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer active:translate-y-0.5"
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
            <div className="bg-gradient-to-br from-emerald-800 to-slate-900 text-white rounded-3xl p-5 space-y-3 shadow-md">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                डिजिटल भुगतान व खाता विवरण
              </span>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-slate-300">कुल संचित आय (Total Earnings)</div>
                  <div className="text-3xl font-black text-white">
                    ₹{totalSettlement.toLocaleString("en-IN")}
                  </div>
                </div>
                <span className="bg-emerald-500/20 text-emerald-300 text-xs font-black px-2.5 py-1 rounded-lg border border-emerald-400">
                  शून्य कमीशन मॉडल
                </span>
              </div>
              <p className="text-xs text-slate-300">
                प्रत्येक पूर्ण मरम्मत का भुगतान सीधा आपके बैंक खाते में 24 घंटे में स्थानांतरित किया जाता है।
              </p>
            </div>

            <div className="bg-white border-2 border-slate-300 rounded-3xl p-5 space-y-3 shadow-xs">
              <h3 className="text-sm font-black text-slate-800 border-b pb-2">
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
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-black text-slate-900 text-sm">{item.machine}</div>
                      <div className="text-slate-500 font-bold">
                        {item.farmer} • {item.date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-slate-900 text-base">₹{item.amount}</div>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${item.status === "सफल"
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

        {/* ================= TAB 3: PROFILE & CERTIFICATIONS ================= */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <div className="bg-white border-2 border-slate-300 rounded-3xl p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-3 border-b pb-3">
                <span className="text-4xl p-2 bg-slate-100 rounded-2xl border border-slate-300">
                  👨‍🔧
                </span>
                <div>
                  <h3 className="text-xl font-black text-slate-900">
                    {session.user.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <span className="flex items-center text-amber-500">
                      <Star className="w-3.5 h-3.5 fill-current" />
                      <span className="ml-1 text-slate-700 font-black">4.8 / 5.0</span>
                    </span>
                    <span>• 83 मरम्मत कार्य पूर्ण</span>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-700 uppercase">
                    प्रमाणित हुनर (Certified Skills):
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddSkill(true)}
                    className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>हुनर जोड़ें</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>{s}</span>
                    </span>
                  ))}
                </div>

                {showAddSkill && (
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="नया हुनर लिखें..."
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      जोड़ें
                    </button>
                  </div>
                )}
              </div>

              {/* Certifications Badge */}
              <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-2xl flex items-start gap-2.5">
                <Award className="w-6 h-6 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs font-bold text-amber-950">
                  <div className="font-black text-sm">
                    राष्ट्रीय कृषि यंत्र संस्थान (NAMI) प्रमाणित
                  </div>
                  <div>प्रमाणपत्र क्रमांक: NAMI-SP-2025-882</div>
                  <div className="text-amber-800 text-[11px]">मान्य अवधि: 2025 – 2027</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ================= BOTTOM NAVIGATION FOR TECHNICIAN ================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t-3 border-slate-200 py-2 shadow-2xl flex justify-center">
        <div className="w-full max-w-md grid grid-cols-3 px-2">
          {/* 📋 Work Orders */}
          <button
            type="button"
            onClick={() => {
              setActiveTab("jobs");
              setSelectedJobCardId(null);
            }}
            className={`py-2 px-1 flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer ${activeTab === "jobs"
                ? "text-emerald-800 font-black bg-emerald-50 scale-105"
                : "text-slate-600 font-bold hover:text-slate-900"
              }`}
          >
            <ClipboardList className="w-5 h-5 mb-0.5" />
            <span className="text-xs">कार्य आदेश</span>
          </button>

          {/* 💰 Earnings */}
          <button
            type="button"
            onClick={() => setActiveTab("earnings")}
            className={`py-2 px-1 flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer ${activeTab === "earnings"
                ? "text-amber-800 font-black bg-amber-50 scale-105"
                : "text-slate-600 font-bold hover:text-slate-900"
              }`}
          >
            <DollarSign className="w-5 h-5 mb-0.5" />
            <span className="text-xs">कमाई व बिल</span>
          </button>

          {/* 🎖️ Profile */}
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`py-2 px-1 flex flex-col items-center justify-center rounded-2xl transition-all cursor-pointer ${activeTab === "profile"
                ? "text-indigo-800 font-black bg-indigo-50 scale-105"
                : "text-slate-600 font-bold hover:text-slate-900"
              }`}
          >
            <Award className="w-5 h-5 mb-0.5" />
            <span className="text-xs">प्रोफ़ाइल व हुनर</span>
          </button>
        </div>
      </nav>
      {/* ================= MODAL 1: REQUEST DETAILS MODAL ================= */}
      {viewingRequest && !isConfirmingAccept && !isRejecting && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden border-4 border-amber-500 shadow-2xl">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b-2 border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">📋</span>
                <h3 className="text-lg font-black">मरम्मत अनुरोध विवरण</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingRequest(null)}
                className="text-slate-400 hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[82vh] overflow-y-auto text-xs sm:text-sm">
              {/* Farmer and Machine info */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-xs font-bold text-slate-500 block">किसान:</span>
                  <div className="font-black text-slate-900 text-base">
                    {viewingRequest.farmerName || "Pawan Gupta"}
                  </div>
                  <div className="text-xs text-slate-600 font-bold">
                    📱 +91 {viewingRequest.farmerPhone || "9876543210"}
                  </div>
                  <div className="text-xs text-slate-500">
                    📍 {viewingRequest.farmerLocation?.village || "शाहपुर, लखनऊ"} ({viewingRequest.approxDistanceText || "3.2 किमी"})
                  </div>
                </div>

                <div>
                  <span className="text-xs font-bold text-slate-500 block">मशीन:</span>
                  <div className="font-black text-slate-900 text-base flex items-center gap-1.5">
                    <span>{viewingRequest.machineIcon || "🚜"}</span>
                    <span>{viewingRequest.machineNameHi || "Tractor"}</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 inline-block">
                      ⚠️ जरूरी (आज ही)
                    </span>
                  </div>
                </div>
              </div>

              {/* Problem summary */}
              <div className="bg-amber-50/70 border border-amber-300 p-3.5 rounded-2xl space-y-1">
                <span className="text-xs font-black text-amber-950 uppercase tracking-wide">
                  किसान द्वारा बताई गई समस्या:
                </span>
                <div className="text-base font-black text-slate-950">
                  "{viewingRequest.problemDescription}"
                </div>
              </div>

              {/* AI Potential Diagnosis */}
              <div className="bg-indigo-50 border-2 border-indigo-200 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-indigo-950 flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-indigo-700" />
                    <span>AI की संभावित जांच (Potential AI Assessment):</span>
                  </span>
                  <span className="text-xs font-black text-indigo-700 bg-white px-2 py-0.5 rounded-full border border-indigo-200">
                    {viewingRequest.diagnosis?.confidence || "89% (उच्च)"}
                  </span>
                </div>

                <div className="text-sm font-black text-indigo-900">
                  {viewingRequest.diagnosis?.possibleProblem || "Starting system में समस्या हो सकती है."}
                </div>

                {viewingRequest.diagnosis?.reasons && viewingRequest.diagnosis.reasons.length > 0 && (
                  <ul className="list-disc pl-4 space-y-1 text-xs text-indigo-950 font-bold">
                    {viewingRequest.diagnosis.reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                )}

                {viewingRequest.diagnosis?.safeAction && (
                  <div className="pt-1.5 border-t border-indigo-200 text-xs text-amber-950 font-bold flex items-start gap-1">
                    <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <span>{viewingRequest.diagnosis.safeAction}</span>
                  </div>
                )}
              </div>

              {/* Buttons: Accept or Reject */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsRejecting(true)}
                  className="bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-slate-700 font-black py-3 rounded-2xl text-sm transition-all cursor-pointer"
                >
                  मना करें
                </button>

                <button
                  type="button"
                  onClick={() => setIsConfirmingAccept(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl text-sm shadow-md transition-all cursor-pointer border border-emerald-800"
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
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden border-4 border-slate-400 shadow-2xl">
            <div className="bg-slate-900 text-white px-5 py-4 border-b-2 border-slate-800">
              <h3 className="text-base font-black">अनुरोध अस्वीकार करने का कारण चुनें</h3>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs font-bold text-slate-600">
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
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer font-bold text-xs sm:text-sm ${
                    selectedRejectReason === reason
                      ? "bg-amber-50 border-amber-500 text-slate-900"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="rejectReason"
                    value={reason}
                    checked={selectedRejectReason === reason}
                    onChange={(e) => setSelectedRejectReason(e.target.value)}
                    className="accent-amber-600 w-4 h-4"
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
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold"
                />
              )}

              <div className="grid grid-cols-2 gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="bg-slate-100 hover:bg-slate-200 py-2.5 rounded-xl text-xs font-black text-slate-700 cursor-pointer"
                >
                  वापस जाएं
                </button>

                <button
                  type="button"
                  onClick={handleConfirmReject}
                  className="bg-red-600 hover:bg-red-700 py-2.5 rounded-xl text-xs font-black text-white cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden border-4 border-emerald-600 shadow-2xl">
            <div className="bg-emerald-800 text-white px-5 py-4 border-b-2 border-emerald-900">
              <h3 className="text-base font-black">क्या आप यह मरम्मत अनुरोध स्वीकार करना चाहते हैं?</h3>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-3.5 space-y-1.5 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Farmer:</span>
                  <span className="font-black text-slate-900">{viewingRequest.farmerName || "Pawan Gupta"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Machine:</span>
                  <span className="font-black text-slate-900">{viewingRequest.machineNameHi || "Tractor"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Problem:</span>
                  <span className="font-black text-slate-900">{viewingRequest.problemDescription}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmingAccept(false)}
                  className="bg-slate-100 hover:bg-slate-200 py-3 rounded-2xl text-xs sm:text-sm font-black text-slate-700 cursor-pointer"
                >
                  वापस जाएं
                </button>

                <button
                  type="button"
                  onClick={handleConfirmAccept}
                  className="bg-emerald-600 hover:bg-emerald-700 py-3 rounded-2xl text-xs sm:text-sm font-black text-white shadow-md cursor-pointer border border-emerald-800"
                >
                  पुष्टि करें / स्वीकार करें
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 4: PARTS / TOOLS PREPARATION WIZARD ================= */}
      {isPartsToolsWizardOpen && acceptedRepair && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden border-4 border-emerald-600 shadow-2xl">
            <div className="bg-emerald-800 text-white px-5 py-4 border-b-2 border-emerald-900">
              <h3 className="text-base sm:text-lg font-black">इस मरम्मत के लिए कुछ सामान साथ ले जाना है?</h3>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs sm:text-sm">
              {/* Category options */}
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer font-black text-slate-800">
                  <input
                    type="checkbox"
                    checked={includeSpareParts}
                    onChange={(e) => setIncludeSpareParts(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span>🔧 Spare Parts (स्पेयर पार्ट्स)</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer font-black text-slate-800">
                  <input
                    type="checkbox"
                    checked={includeTools}
                    onChange={(e) => setIncludeTools(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span>🧰 Tools (उपकरण व औजार किट)</span>
                </label>

                <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer font-black text-slate-800">
                  <input
                    type="checkbox"
                    checked={needFarmerInfo}
                    onChange={(e) => setNeedFarmerInfo(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span>❓ किसान से पहले जानकारी लेनी है</span>
                </label>
              </div>

              {/* Spare parts sub-section */}
              {includeSpareParts && (
                <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-2xl space-y-2">
                  <div className="font-black text-emerald-950 text-xs sm:text-sm">कौन-से parts चाहिए?</div>
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
                          className={`p-2 rounded-xl border text-left font-bold flex items-center justify-between cursor-pointer ${
                            isSel
                              ? "bg-emerald-600 text-white border-emerald-700"
                              : "bg-white text-slate-800 border-slate-200"
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
                      className="flex-1 bg-white p-2 rounded-xl border border-slate-300 text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customPartInput.trim() && !selectedPartsList.includes(customPartInput.trim())) {
                          setSelectedPartsList([...selectedPartsList, customPartInput.trim()]);
                          setCustomPartInput("");
                        }
                      }}
                      className="bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-black cursor-pointer"
                    >
                      + जोड़ें
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold">
                    * ये सुझाव डेमो संदर्भ हेतु हैं। आवश्यकतानुसार बदलाव कर सकते हैं।
                  </p>
                </div>
              )}

              {/* Farmer Question sub-section */}
              {needFarmerInfo && (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl space-y-2">
                  <div className="font-black text-blue-950 text-xs sm:text-sm">किसान से कुछ और पूछना है?</div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setTechnicianMessageToFarmer("क्या tractor में battery की light आ रही है?")}
                      className="text-[11px] bg-white border border-blue-300 text-blue-900 px-2.5 py-1 rounded-full font-bold cursor-pointer hover:bg-blue-100"
                    >
                      + "क्या battery light आ रही है?"
                    </button>
                    <button
                      type="button"
                      onClick={() => setTechnicianMessageToFarmer("क्या सेल्फ दबाने पर क्लिक-क्लिक आवाज आ रही है?")}
                      className="text-[11px] bg-white border border-blue-300 text-blue-900 px-2.5 py-1 rounded-full font-bold cursor-pointer hover:bg-blue-100"
                    >
                      + "क्या क्लिक-क्लिक आवाज है?"
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="संदेश लिखें..."
                    value={technicianMessageToFarmer}
                    onChange={(e) => setTechnicianMessageToFarmer(e.target.value)}
                    className="w-full bg-white p-2 rounded-xl border border-blue-300 text-xs font-bold"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleSavePartsAndProceed}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl text-sm shadow-md cursor-pointer border border-emerald-800"
              >
                आगे बढ़ें (तैयारी पूरी) ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 5: FINAL TRIP CONFIRMATION ================= */}
      {isTripConfirmationOpen && acceptedRepair && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden border-4 border-emerald-600 shadow-2xl">
            <div className="bg-emerald-800 text-white px-5 py-4 border-b-2 border-emerald-900">
              <h3 className="text-base font-black">मरम्मत के लिए तैयार?</h3>
            </div>

            <div className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Farmer:</span>
                  <span className="font-black text-slate-900">{acceptedRepair.farmerName || "Pawan Gupta"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Machine:</span>
                  <span className="font-black text-slate-900">{acceptedRepair.machineNameHi || "Tractor"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Problem:</span>
                  <span className="font-black text-slate-900">{acceptedRepair.problemDescription}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-bold">Required items:</span>
                  <span className="font-black text-emerald-800">{selectedPartsList.join(", ") || "कोई पार्ट नहीं"}</span>
                </div>
                {technicianMessageToFarmer && (
                  <div className="pt-1 text-[11px] text-blue-900 font-bold">
                    संदेश: "{technicianMessageToFarmer}"
                  </div>
                )}
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-300 text-xs font-bold text-amber-950 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-700 shrink-0" />
                <div>
                  किसान का स्थान: <strong>{acceptedRepair.farmerLocation?.village || "शाहपुर"}, {acceptedRepair.farmerLocation?.district || "लखनऊ"}</strong>
                </div>
              </div>

              <button
                type="button"
                onClick={handleStartTrip}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 rounded-2xl text-sm shadow-md cursor-pointer border border-emerald-800 active:scale-98"
              >
                मरम्मत के लिए निकलें 🚜
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 6: COMPLETE REPAIR MODAL ================= */}
      {isCompletingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-3 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden border-4 border-emerald-600 shadow-2xl">
            <div className="bg-emerald-800 text-white px-5 py-4 border-b-2 border-emerald-900">
              <h3 className="text-base font-black">मरम्मत पूरी करें (Mark Repair Completed)</h3>
            </div>

            <div className="p-5 space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  कार्य का विवरण (Work Performed):
                </label>
                <textarea
                  rows={2}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  उपयोग किए गए स्पेयर पार्ट्स:
                </label>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 font-bold text-xs text-slate-800">
                  {selectedPartsList.join(", ") || "कोई नया पार्ट नहीं लगा"}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-700 mb-1">
                  अंतिम मरम्मत शुल्क (Final Labour Fee):
                </label>
                <input
                  type="number"
                  value={completionLabourFee}
                  onChange={(e) => setCompletionLabourFee(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-black text-sm text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCompletingModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 py-3 rounded-2xl text-xs font-black text-slate-700 cursor-pointer"
                >
                  रद्द करें
                </button>

                <button
                  type="button"
                  onClick={handleConfirmCompletion}
                  className="bg-emerald-600 hover:bg-emerald-700 py-3 rounded-2xl text-xs font-black text-white shadow-md cursor-pointer border border-emerald-800"
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
        <div className="fixed bottom-24 left-4 right-4 z-50 max-w-sm mx-auto bg-slate-900 text-white px-4 py-3 rounded-2xl font-black text-center text-xs shadow-2xl border-2 border-emerald-400 animate-fadeIn">
          {feedbackToast}
        </div>
      )}
    </div>
  );
}
