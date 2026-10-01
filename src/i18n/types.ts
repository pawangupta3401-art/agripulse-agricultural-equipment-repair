/**
 * AgriPulse Multilingual Localization System — Type Definitions
 * Covers all 15 Indian languages & regional dialects requested.
 */

export type LanguageCode =
  | "en"   // English
  | "hi"   // हिन्दी (Hindi)
  | "mr"   // मराठी (Marathi)
  | "te"   // తెలుగు (Telugu)
  | "pa"   // ਪੰਜਾਬੀ (Punjabi)
  | "gu"   // ગુજરાતી (Gujarati)
  | "bn"   // বাংলা (Bengali)
  | "ta"   // தமிழ் (Tamil)
  | "kn"   // ಕನ್ನಡ (Kannada)
  | "ml"   // മലയാളം (Malayalam)
  | "or"   // ଓଡ଼ିଆ (Odia)
  | "as"   // অসমীয়া (Assamese)
  | "ur"   // اردو (Urdu - RTL)
  | "bgc"  // हरियाणवी (Haryanvi - Regional)
  | "raj"; // राजस्थानी / मारवाड़ी (Rajasthani - Regional)

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  script: string;
  speechCode: string;
  isRTL: boolean;
  region: string;
  isPopular?: boolean;
}

export interface TranslationDictionary {
  common: {
    appName: string;
    tagline: string;
    back: string;
    continue: string;
    cancel: string;
    save: string;
    close: string;
    loading: string;
    offline: string;
    online: string;
    cached: string;
    cachedNotice: string;
    live: string;
    verified: string;
    pending: string;
    expired: string;
    error: string;
    retry: string;
    status: string;
    success: string;
    confirm: string;
    kilometers: string;
    hours: string;
    rupee: string;
    view?: string;
    dataSafeNotice?: string;
    syncingNotice?: string;
    offlineNotice?: string;
    reset?: string;
    total?: string;
  };
  nav: {
    home: string;
    machines: string;
    repairs: string;
    emergency: string;
    settings: string;
    language: string;
    ivrPhone: string;
    assistedDesk: string;
    service?: string;
    help?: string;
  };
  welcome: {
    title: string;
    subtitle: string;
    chooseLanguage: string;
    popularLanguages: string;
    moreLanguages: string;
    continueBtn: string;
    greeting?: string;
    howCanIHelp?: string;
  };
  dashboard: {
    greeting: string;
    farmerName: string;
    registeredMachines: string;
    activeRepairs: string;
    quickActions: string;
    reportProblem: string;
    emergencyService: string;
    preventiveCheck: string;
    oneClickDemoTitle: string;
    oneClickDemoBtn: string;
    oneClickDemoSub: string;
    viewAllMachines: string;
    myMachines?: string;
    reportBreakdown?: string;
    callMechanic?: string;
    myRepairs?: string;
    nextService?: string;
    recoveryEngine?: string;
    featurePhone?: string;
    assistedDesk?: string;
    kisanSahayak?: string;
    askQuestion?: string;
  };
  machines: {
    myMachines: string;
    addMachine: string;
    machineDetails: string;
    statusActive: string;
    statusMaintenance: string;
    statusBreakdown: string;
    operatingHours: string;
    lastService: string;
    nextService: string;
    serviceHistory: string;
    partsReplaced: string;
    machinePassport: string;
    viewPassport: string;
    totalServices: string;
    title?: string;
    selectType?: string;
    machineName?: string;
    addMachineBtn?: string;
    operational?: string;
    attentionNeeded?: string;
    viewMachine?: string;
  };
  repair?: {
    activeRepair?: string;
    noRepairs?: string;
    title?: string;
  };
  complaint: {
    reportTitle: string;
    selectMachine: string;
    describeProblem: string;
    describePlaceholder: string;
    voiceBtn: string;
    voiceRecording: string;
    voiceListening: string;
    voiceStop: string;
    voiceUnsupported: string;
    photoBtn: string;
    photoEvidence: string;
    urgencyTitle: string;
    urgencyToday: string;
    urgencyLater: string;
    criticalWindowNotice: string;
    submitBtn: string;
    title?: string;
  };
  diagnosis: {
    title: string;
    preliminaryNotice: string;
    possibleIssue: string;
    confidenceLevel: string;
    confidenceHigh: string;
    confidenceMedium: string;
    confidenceLow: string;
    physicalInspectionRequired: string;
    safeActionTitle: string;
    safetyWarningTitle: string;
    technicianConfirmationNeeded: string;
    viewRecoveryOptionsBtn: string;
    // Farmer-Friendly 5-Part Presentation & Voice UX
    whatIsTheProblem?: string;
    whatToDoNow?: string;
    whatNotToDo?: string;
    whenToCallMechanic?: string;
    urgencyTitle?: string;
    listenBtn?: string;
    listenResponseBtn?: string;
    pauseVoiceBtn?: string;
    resumeVoiceBtn?: string;
    stopVoiceBtn?: string;
    replayVoiceBtn?: string;
    speakingStatus?: string;
    pausedStatus?: string;
    aiUnavailableMessage?: string;
  };
  recovery: {
    title: string;
    subtitle: string;
    fastestOption: string;
    nearestCentreOption: string;
    lowestCostOption: string;
    doorstepService: string;
    workshopService: string;
    partsAvailable: string;
    partsToOrder: string;
    estimatedDowntime: string;
    confirmPlanBtn: string;
    viewAllTechnicians: string;
    criticalWindowBanner: string;
    technician?: string;
  };
  pricing: {
    title: string;
    diagnosticFee: string;
    labourFee: string;
    partsEstimate: string;
    travelFee: string;
    subsidyDiscount: string;
    totalEstimate: string;
    finalCost: string;
    adjustPriceBtn: string;
    priceAdjustmentTitle: string;
    reasonExtraLabour: string;
    reasonExtraPart: string;
    reasonNoPart: string;
    reasonOther: string;
    savePriceBtn: string;
    disclaimer: string;
  };
  jobCard: {
    title: string;
    trackingStatus: string;
    assigned: string;
    onTheWay: string;
    arrived: string;
    repairing: string;
    completed: string;
    advanceStatusBtn: string;
    mechanicDetails: string;
    experienceYears: string;
    viewCredentialsBtn: string;
    routeDirectionsBtn: string;
    humanOverrideBtn: string;
    humanOverrideTitle: string;
    humanOverridePlaceholder: string;
    saveOverrideBtn: string;
    checkMachineBtn: string;
    partsSectionTitle: string;
    partNeeded: string;
    partNotNeeded: string;
  };
  verification: {
    title: string;
    question: string;
    yesWorking: string;
    noIssueRemains: string;
    reRepairBtn: string;
    viewMachineBtn: string;
    isMachineWorking?: string;
    testInstructions?: string;
    machineFixed?: string;
    issueRemains?: string;
  };
  passport: {
    title: string;
    subtitle: string;
    previousRepairs: string;
    partsReplaced: string;
    serviceHistoryTotal: string;
    verifiedStamp: string;
    maintenanceRecommendation: string;
    estimatedCostLabel: string;
    finalCostLabel: string;
    nextMaintenance?: string;
  };
  preventive: {
    title: string;
    subtitle: string;
    preSowingPkg: string;
    preHarvestPkg: string;
    comprehensivePkg: string;
    bookBtn: string;
    serviceDue?: string;
    serviceOverdue?: string;
    allMachinesHealthy?: string;
  };
  settings: {
    title: string;
    changeLanguage: string;
    offlineMode: string;
    syncQueue: string;
    syncNowBtn: string;
    storageUsage: string;
    resetDemoData: string;
  };
  telephony: {
    ivrModalTitle: string;
    ivrKeypadTitle: string;
    press1Repair: string;
    press2Status: string;
    press3Contact: string;
    press4Packages: string;
    smsDrawerTitle: string;
    assistedDeskTitle: string;
  };
  voiceHelp?: {
    buttonLabel: string;
    listening: string;
    speaking: string;
    thinking: string;
    stop: string;
    retry: string;
    close: string;
    micDenied: string;
    unavailable: string;
  };
}
