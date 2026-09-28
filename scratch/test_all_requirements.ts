import {
  MockVisionProvider,
  YOLOVisionProvider,
  formatVisionConfidenceHi,
  isDangerousVisualClass,
  evaluateImageQuality,
  analyzeMachinePhoto,
  DETECTION_CLASS_LABELS_HI,
} from "../src/services/photoAnalysisService";

async function runTests() {
  console.log("==================================================");
  console.log("RUNNING P2I STEP 2 COMPREHENSIVE TESTS");
  console.log("==================================================");

  // 1. Vision Provider Structure & Detection Classes
  const mockProvider = new MockVisionProvider();
  console.log("1. Provider Name:", mockProvider.providerName);
  console.log("   Supported Classes (7 required):", mockProvider.supportedClasses);
  if (mockProvider.supportedClasses.length !== 7) {
    throw new Error("Expected 7 classes");
  }

  // 2. Confidence Formatting
  console.log("\n2. Confidence Formatting:");
  console.log("   >=0.80 (0.85):", formatVisionConfidenceHi(0.85), "(Expected: काफी स्पष्ट)");
  console.log("   0.60-0.79 (0.72):", formatVisionConfidenceHi(0.72), "(Expected: संभावित)");
  console.log("   <0.60 (0.50):", formatVisionConfidenceHi(0.50), "(Expected: पक्का नहीं)");
  if (formatVisionConfidenceHi(0.85) !== "काफी स्पष्ट" ||
      formatVisionConfidenceHi(0.72) !== "संभावित" ||
      formatVisionConfidenceHi(0.50) !== "पक्का नहीं") {
    throw new Error("Confidence formatting mismatch");
  }

  // 3. Test A: Clear Image with Oil Leak
  console.log("\n3. TEST A & C: Clear image with detected issue (oil leak)");
  const fakeClearImage = "data:image/jpeg;base64," + "A".repeat(1200);
  const resultLeak = await analyzeMachinePhoto({
    image: fakeClearImage,
    machineType: "tractor",
    complaintText: "गियरबॉक्स से तेल टपक रहा है",
    fileName: "engine_oil_leak.jpg"
  });
  console.log("   Detected:", resultLeak.detected);
  console.log("   Issue (Hindi):", resultLeak.friendlyLabelHi);
  console.log("   Confidence:", resultLeak.confidenceLevelHi);
  console.log("   Safety Warning:", resultLeak.safetyWarning);
  console.log("   Bounding Box:", resultLeak.visionResult?.detections[0]?.boundingBox);

  if (!resultLeak.detected || resultLeak.friendlyLabelHi !== "तेल का रिसाव दिखाई दे रहा है") {
    throw new Error("Test A/C failed: oil leak not detected properly");
  }

  // 4. Test B: Poor Quality Image
  console.log("\n4. TEST B: Poor quality image");
  const fakePoorImage = "data:image/jpeg;base64," + "A".repeat(80); // very small
  const resultPoor = await analyzeMachinePhoto({
    image: fakePoorImage,
    machineType: "tractor",
    fileName: "blurry_pic.jpg"
  });
  console.log("   Quality:", resultPoor.imageQuality);
  console.log("   Unclear Reason:", resultPoor.unclearReason);
  console.log("   Action Hint:", resultPoor.actionHint);
  if (resultPoor.imageQuality !== "poor" || !resultPoor.unclearReason?.includes("फोटो साफ नहीं है")) {
    throw new Error("Test B failed: poor image was not rejected");
  }

  // 5. Test G: Dangerous Visual Issue (Smoke)
  console.log("\n5. TEST G: Dangerous Visual Issue (smoke / overheating)");
  const resultSmoke = await analyzeMachinePhoto({
    image: fakeClearImage,
    machineType: "tractor",
    complaintText: "धुआं निकल रहा है",
    fileName: "exhaust_smoke.jpg"
  });
  console.log("   Detected:", resultSmoke.detected);
  console.log("   Friendly Label:", resultSmoke.friendlyLabelHi);
  console.log("   Safety Warning:", resultSmoke.safetyWarning);
  if (!resultSmoke.safetyWarning?.includes("⚠️ मशीन बंद रखें और सुरक्षित दूरी बनाए रखें।")) {
    throw new Error("Test G failed: safety warning missing for smoke");
  }

  // 6. Test F: Inconclusive / Fallback
  console.log("\n6. TEST F: Fallback / Inconclusive analysis");
  const resultFallback = await analyzeMachinePhoto({
    image: fakeClearImage,
    machineType: "sprayer",
    complaintText: "सामान्य मशीन",
    fileName: "clean_view.jpg"
  });
  console.log("   Detected:", resultFallback.detected);
  console.log("   Friendly Label:", resultFallback.friendlyLabelHi);
  console.log("   Action Hint:", resultFallback.actionHint);
  if (!resultFallback.friendlyLabelHi?.includes("फोटो से समस्या स्पष्ट नहीं हो पाई")) {
    throw new Error("Test F failed: fallback message missing");
  }

  // 7. YOLOVisionProvider Adapter Skeleton Check
  console.log("\n7. YOLO Provider Adapter Skeleton:");
  const yoloAdapter = new YOLOVisionProvider();
  console.log("   YOLO Provider Name:", yoloAdapter.providerName);
  console.log("   Is Model Ready?", yoloAdapter.isModelReady());

  console.log("\n==================================================");
  console.log("ALL P2I STEP 2 TESTS PASSED PERFECTLY!");
  console.log("==================================================");
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
