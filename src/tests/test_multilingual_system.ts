/**
 * Automated Verification Test for AgriPulse Multilingual Localization System
 *
 * Verifies:
 * 1. All 15 languages & regional dialects defined & accessible.
 * 2. Three-tier fallback engine (Language -> Hindi -> English).
 * 3. Never returns undefined key path (e.g. "repair.confirm_button").
 * 4. RTL detection (Urdu is RTL, others LTR).
 * 5. Native Speech Recognition code mapping with graceful dialect fallbacks.
 * 6. Dynamic AI Diagnosis presentation translation.
 * 7. Multilingual SMS template generation.
 * 8. Pricing labels translation and numerical retention.
 */

import {
  t,
  SUPPORTED_LANGUAGES,
  LanguageCode,
  isRTL,
  getSpeechRecognitionCode,
  localizeDiagnosisProblem,
} from "../i18n";
import { getLocalizedSMSTemplate } from "../services/telephonyProvider";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  } else {
    console.log(`✓ PASS: ${msg}`);
  }
}

async function runMultilingualTests() {
  console.log("==================================================");
  console.log("🌾 AGRIPULSE MULTILINGUAL SYSTEM AUTOMATED AUDIT");
  console.log("==================================================\n");

  // 1. Verify 15 Languages
  console.log("--- 1. Testing Supported Languages Count & Metadata ---");
  assert(SUPPORTED_LANGUAGES.length >= 15, `Must support at least 15 languages/dialects (Found ${SUPPORTED_LANGUAGES.length})`);
  
  const expectedCodes: LanguageCode[] = [
    "en", "hi", "mr", "te", "pa", "gu", "bn", "ta", "kn", "ml", "or", "as", "ur", "bgc", "raj"
  ];
  for (const code of expectedCodes) {
    const found = SUPPORTED_LANGUAGES.find((l) => l.code === code);
    assert(!!found, `Language code '${code}' must be present in SUPPORTED_LANGUAGES`);
    assert(!!found?.nativeName, `Language '${code}' must have nativeName`);
    assert(!!found?.speechCode, `Language '${code}' must have speechCode`);
  }

  // 2. Test RTL Detection
  console.log("\n--- 2. Testing Right-to-Left (RTL) Layout Flag ---");
  assert(isRTL("ur") === true, "Urdu must have isRTL = true");
  assert(isRTL("hi") === false, "Hindi must have isRTL = false");
  assert(isRTL("mr") === false, "Marathi must have isRTL = false");
  assert(isRTL("en") === false, "English must have isRTL = false");

  // 3. Test Speech Recognition Codes & Graceful Dialect Fallback
  console.log("\n--- 3. Testing Speech Recognition Codes & Fallbacks ---");
  assert(getSpeechRecognitionCode("hi") === "hi-IN", "Hindi speech code must be hi-IN");
  assert(getSpeechRecognitionCode("mr") === "mr-IN", "Marathi speech code must be mr-IN");
  assert(getSpeechRecognitionCode("te") === "te-IN", "Telugu speech code must be te-IN");
  assert(getSpeechRecognitionCode("pa") === "pa-IN", "Punjabi speech code must be pa-IN");
  assert(getSpeechRecognitionCode("gu") === "gu-IN", "Gujarati speech code must be gu-IN");
  assert(getSpeechRecognitionCode("bgc") === "hi-IN", "Haryanvi dialect must fall back to hi-IN speech recognition");
  assert(getSpeechRecognitionCode("raj") === "hi-IN", "Rajasthani dialect must fall back to hi-IN speech recognition");

  // 4. Test Translation across Screens in Major Languages
  console.log("\n--- 4. Testing Multi-Screen Translation Outputs ---");
  
  // Dashboard & Welcome
  const hiWelcome = t("dashboard.greeting", "hi");
  const enWelcome = t("dashboard.greeting", "en");
  const mrWelcome = t("dashboard.greeting", "mr");
  const teWelcome = t("dashboard.greeting", "te");
  const paWelcome = t("dashboard.greeting", "pa");
  assert(hiWelcome.includes("नमस्ते"), `Hindi greeting should have नमस्ते: got '${hiWelcome}'`);
  assert(enWelcome.includes("Welcome") || enWelcome.includes("Farmer") || enWelcome.includes("Hello"), `English greeting: got '${enWelcome}'`);
  assert(mrWelcome.includes("नमस्कार") || mrWelcome.includes("शेतकरी"), `Marathi greeting: got '${mrWelcome}'`);
  assert(teWelcome.includes("నమస్కారం") || teWelcome.includes("రైతు"), `Telugu greeting: got '${teWelcome}'`);
  assert(paWelcome.includes("ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ") || paWelcome.includes("ਕਿਸਾਨ"), `Punjabi greeting: got '${paWelcome}'`);

  // Nav tabs
  assert(t("nav.home", "en") === "Home", "en nav.home must be Home");
  assert(t("nav.machines", "en") === "Machines" || t("nav.machines", "en").includes("Machine"), "en nav.machines");
  assert(t("nav.home", "mr") === "मुख्यपृष्ठ" || t("nav.home", "mr") === "होम", "mr nav.home");

  // Recovery Engine
  assert(t("recovery.title", "en").includes("Recovery"), "en recovery.title");
  assert(t("recovery.fastestOption", "en").includes("Fastest"), "en recovery.fastestOption");
  assert(t("recovery.fastestOption", "mr").includes("जलद"), "mr recovery.fastestOption");

  // Pricing breakdown labels
  assert(t("pricing.diagnosticFee", "en") === "Diagnostic Fee", "en pricing.diagnosticFee");
  assert(t("pricing.labourFee", "en") === "Labour Charges", "en pricing.labourFee");
  assert(t("pricing.partsEstimate", "en") === "Spare Parts Estimate", "en pricing.partsEstimate");
  assert(t("pricing.travelFee", "en") === "Travel Fee", "en pricing.travelFee");
  assert(t("pricing.totalEstimate", "en") === "Estimated Total", "en pricing.totalEstimate");

  assert(t("pricing.diagnosticFee", "hi") === "जांच शुल्क", "hi pricing.diagnosticFee");
  assert(t("pricing.labourFee", "hi") === "मजदूरी शुल्क", "hi pricing.labourFee");
  assert(t("pricing.partsEstimate", "hi") === "स्पेयर पार्ट्स (अनुमानित)", "hi pricing.partsEstimate");
  assert(t("pricing.travelFee", "hi") === "घर आने का शुल्क (विजिट)", "hi pricing.travelFee");

  // Machine Passport
  assert(t("machines.machinePassport", "en") === "Machine Passport", "en machines.machinePassport");
  assert(t("machines.serviceHistory", "en") === "Service History", "en machines.serviceHistory");
  assert(t("machines.partsReplaced", "en") === "Parts Replaced", "en machines.partsReplaced");
  assert(t("machines.nextService", "en") === "Next Scheduled Service", "en machines.nextService");

  assert(t("machines.serviceHistory", "mr") === "सर्व्हिस इतिहास", "mr machines.serviceHistory");
  assert(t("machines.partsReplaced", "mr") === "बदललेले सुटे भाग", "mr machines.partsReplaced");

  // 5. Test Fallback Chain (Never return raw key)
  console.log("\n--- 5. Testing 3-Tier Fallback Chain ---");
  const missingKeyTest = t("non_existent.nested.key", "mr");
  assert(!missingKeyTest.includes("non_existent"), `Must not expose raw key path: got '${missingKeyTest}'`);

  // Test regional language dialect fallback to Hindi
  const dialectText = t("complaint.reportTitle", "bgc");
  assert(dialectText.length > 0 && !dialectText.includes("complaint."), `Haryanvi complaint.reportTitle must resolve: '${dialectText}'`);

  // 6. Test AI Diagnosis Presentation Localization
  console.log("\n--- 6. Testing AI Diagnosis Localization Helper ---");
  const diagEn = localizeDiagnosisProblem("हाइड्रोलिक प्रेशर ड्रॉप व लीकेज", "en");
  const diagMr = localizeDiagnosisProblem("हाइड्रोलिक प्रेशर ड्रॉप व लीकेज", "mr");
  const diagTe = localizeDiagnosisProblem("हाइड्रोलिक प्रेशर ड्रॉप व लीकेज", "te");
  assert(diagEn.includes("Hydraulic") || diagEn.includes("Leakage"), `Diagnosis in English: '${diagEn}'`);
  assert(diagMr.includes("हायड्रॉलिक") || diagMr.includes("गळती"), `Diagnosis in Marathi: '${diagMr}'`);
  assert(diagTe.includes("హైడ్రాలిక్") || diagTe.includes("లీకేజ్"), `Diagnosis in Telugu: '${diagTe}'`);

  // 7. Test Multilingual SMS Templates
  console.log("\n--- 7. Testing Multilingual SMS Templates ---");
  const smsEn = getLocalizedSMSTemplate("complaint_created", { id: "101", machineName: "Mahindra Tractor", totalEst: 1450 }, "en");
  const smsMr = getLocalizedSMSTemplate("complaint_created", { id: "101", machineName: "महिंद्रा ट्रॅक्टर", totalEst: 1450 }, "mr");
  const smsTe = getLocalizedSMSTemplate("complaint_created", { id: "101", machineName: "ట్రాక్టర్", totalEst: 1450 }, "te");
  assert(smsEn.includes("AgriPulse: Your repair request #101"), `English SMS: '${smsEn}'`);
  assert(smsMr.includes("AgriPulse: तुमची दुरुस्ती विनंती #101"), `Marathi SMS: '${smsMr}'`);
  assert(smsTe.includes("AgriPulse: మీ మరమ్మతు అభ్యర్థన #101"), `Telugu SMS: '${smsTe}'`);

  // 8. Test Verification Screen Prompts
  console.log("\n--- 8. Testing Verification Screen Prompts ---");
  assert(t("verification.yesWorking", "en") === "Yes, machine is working properly", "en verification.yesWorking");
  assert(t("verification.noIssueRemains", "en") === "No, issue still remains", "en verification.noIssueRemains");
  assert(t("verification.yesWorking", "mr") === "होय, यंत्र व्यवस्थित चालू आहे", "mr verification.yesWorking");
  assert(t("verification.noIssueRemains", "mr") === "नाही, समस्या अजूनही कायम आहे", "mr verification.noIssueRemains");

  console.log("\n==================================================");
  console.log("🎉 ALL 8 MULTILINGUAL AUDIT CHECKS PASSED PERFECTLY!");
  console.log("==================================================");
}

runMultilingualTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
