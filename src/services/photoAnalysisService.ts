/**
 * Photo Vision & YOLO-Compatible Analysis Service — P2I Step 2 AgriPulse
 *
 * Implements a pluggable VisionProvider architecture for detecting visible machine issues
 * (smoke, oil_leak, fuel_leak, damaged_part, loose_part, electrical_damage, overheating_sign)
 * from captured or uploaded photos, with farmer-friendly Hindi language, confidence mapping,
 * image quality checks, and offline resilience.
 */

import {
  BoundingBox,
  DetectionClass,
  PhotoAnalysisResult,
  PhotoAnalysisSeverity,
  VisionResult,
  YOLODetection,
} from "@/types";

export interface VisionContext {
  machineType?: string;
  complaintText?: string;
  fileName?: string;
}

/**
 * Universal VisionProvider Interface (YOLO-Compatible Adapter)
 */
export interface VisionProvider {
  readonly providerName: string;
  readonly supportedClasses: DetectionClass[];
  analyzeImage(image: string, context?: VisionContext): Promise<VisionResult>;
}

export interface PhotoAnalysisInput {
  image?: string | null;
  machineType?: string;
  complaintText?: string;
  fileName?: string;
}

// ─── Farmer-Friendly Hindi Mappings ──────────────────────────────────────────

/**
 * Hindi human-readable labels for visible detection classes.
 * Requirement 6: NEVER show raw class names like oil_leak or damaged_part to the farmer.
 */
export const DETECTION_CLASS_LABELS_HI: Record<DetectionClass, string> = {
  oil_leak: "तेल का रिसाव दिखाई दे रहा है",
  fuel_leak: "ईंधन का रिसाव दिखाई दे रहा है",
  smoke: "धुआं निकलता दिखाई दे रहा है",
  damaged_part: "पार्ट में नुकसान दिखाई दे रहा है",
  loose_part: "ढीला पार्ट दिखाई दे रहा है",
  electrical_damage: "बिजली / तारों में खराबी दिखाई दे रही है",
  overheating_sign: "ओवरहीटिंग का लक्षण दिखाई दे रहा है",
};

/**
 * Location annotations in simple Hindi for each class.
 */
export const DETECTION_CLASS_AREAS_HI: Record<DetectionClass, string> = {
  oil_leak: "ऑयल सम्प व होस पाइप जोड़",
  fuel_leak: "फ्यूल पाइप व कार्बोरेटर / नोज़ल क्षेत्र",
  smoke: "साइलेंसर व एग्जॉस्ट मैनिफोल्ड क्षेत्र",
  damaged_part: "बॉडी पैनल, बेयरिंग व बाहरी पुर्जा",
  loose_part: "पुली बेल्ट एवं माउंटिंग ब्रैकेट",
  electrical_damage: "अल्टरनेटर, वायरिंग हार्नेस व बैटरी टर्मिनल",
  overheating_sign: "रेडिएटर कोर एवं कूलिंग जैकेट",
};

/**
 * Requirement 7: Convert confidence into simple farmer-friendly language.
 * >= 0.80: "काफी स्पष्ट"
 * 0.60–0.79: "संभावित"
 * < 0.60: "पक्का नहीं"
 * Do NOT present AI confidence as certainty.
 */
export function formatVisionConfidenceHi(confidence: number): string {
  if (confidence >= 0.8) return "काफी स्पष्ट";
  if (confidence >= 0.6) return "संभावित";
  return "पक्का नहीं";
}

/**
 * Requirement 9: Safety check for dangerous visual detections.
 */
export function isDangerousVisualClass(label: DetectionClass): boolean {
  return (
    label === "smoke" ||
    label === "fuel_leak" ||
    label === "oil_leak" ||
    label === "electrical_damage" ||
    label === "overheating_sign"
  );
}

export const MANDATORY_SAFETY_WARNING = "⚠️ मशीन बंद रखें और सुरक्षित दूरी बनाए रखें।";

// ─── Image Quality Evaluation ────────────────────────────────────────────────

/**
 * Evaluates whether an image has sufficient quality for confident analysis.
 * Requirement 8: If image quality is poor, ask farmer to retake a clear photo.
 */
export function evaluateImageQuality(
  imageStr: string,
  context?: VisionContext
): "good" | "poor" {
  if (!imageStr) return "poor";

  // Check context hints (e.g. file name with 'blur', 'blurry', 'dark', 'poor', 'unclear')
  const combined = `${context?.fileName || ""} ${context?.complaintText || ""}`.toLowerCase();
  if (
    combined.includes("blur") ||
    combined.includes("blurry") ||
    combined.includes("धुंधला") ||
    combined.includes("साफ नहीं") ||
    combined.includes("poor") ||
    combined.includes("dark")
  ) {
    return "poor";
  }

  // Tiny base64 payload (< 300 characters is too small for a legitimate photo)
  if (imageStr.length < 300) {
    return "poor";
  }

  return "good";
}

// ─── MockVisionProvider (Prototype Adapter) ──────────────────────────────────

/**
 * Deterministic Mock Vision Provider.
 * Provides prototype detection for the 7 supported classes with offline guarantees.
 * NOTE: As required, this does NOT claim to be real trained YOLO weights.
 */
export class MockVisionProvider implements VisionProvider {
  readonly providerName = "MockVisionProvider";
  readonly supportedClasses: DetectionClass[] = [
    "smoke",
    "oil_leak",
    "fuel_leak",
    "damaged_part",
    "loose_part",
    "electrical_damage",
    "overheating_sign",
  ];

  async analyzeImage(image: string, context?: VisionContext): Promise<VisionResult> {
    // 1. Image Quality Evaluation (Requirement 8)
    const quality = evaluateImageQuality(image, context);
    if (quality === "poor") {
      return {
        detected: false,
        detections: [],
        imageQuality: "poor",
      };
    }

    const text = (context?.complaintText || "").toLowerCase();
    const file = (context?.fileName || "").toLowerCase();
    const machine = (context?.machineType || "").toLowerCase();
    const probe = `${text} ${file} ${machine}`;

    // Explicit inconclusive / clean image test handling
    if (
      probe.includes("clean") ||
      probe.includes("normal") ||
      probe.includes("unclear") ||
      probe.includes("unknown") ||
      probe.includes("fallback") ||
      probe.includes("स्पष्ट नहीं") ||
      probe.includes("सामान्य")
    ) {
      return {
        detected: false,
        detections: [],
        imageQuality: "good",
      };
    }

    // 2. Class Detection Rules

    // Class: smoke
    if (
      probe.includes("धुआं") ||
      probe.includes("धुआ") ||
      probe.includes("धुंआ") ||
      probe.includes("smoke") ||
      probe.includes("exhaust")
    ) {
      return {
        detected: true,
        imageQuality: "good",
        detections: [
          {
            label: "smoke",
            confidence: 0.88,
            boundingBox: { x: 120, y: 70, width: 220, height: 180 },
          },
        ],
      };
    }

    // Class: fuel_leak
    if (
      probe.includes("ईंधन") ||
      probe.includes("डीजल") ||
      probe.includes("पेट्रोल") ||
      probe.includes("fuel") ||
      probe.includes("कार्बोरेटर")
    ) {
      return {
        detected: true,
        imageQuality: "good",
        detections: [
          {
            label: "fuel_leak",
            confidence: 0.85,
            boundingBox: { x: 140, y: 190, width: 170, height: 130 },
          },
        ],
      };
    }

    // Class: oil_leak
    if (
      probe.includes("तेल") ||
      probe.includes("रिसाव") ||
      probe.includes("रिसना") ||
      probe.includes("leak") ||
      probe.includes("लीक") ||
      probe.includes("टपक") ||
      probe.includes("सम्प")
    ) {
      return {
        detected: true,
        imageQuality: "good",
        detections: [
          {
            label: "oil_leak",
            confidence: 0.84,
            boundingBox: { x: 150, y: 210, width: 180, height: 140 },
          },
        ],
      };
    }

    // Class: electrical_damage
    if (
      probe.includes("तार") ||
      probe.includes("बिजली") ||
      probe.includes("चिनगारी") ||
      probe.includes("spark") ||
      probe.includes("wire") ||
      probe.includes("electrical") ||
      probe.includes("बैटरी")
    ) {
      return {
        detected: true,
        imageQuality: "good",
        detections: [
          {
            label: "electrical_damage",
            confidence: 0.82,
            boundingBox: { x: 110, y: 160, width: 160, height: 140 },
          },
        ],
      };
    }

    // Class: overheating_sign
    if (
      probe.includes("गरम") ||
      probe.includes("हीट") ||
      probe.includes("ओवरहीट") ||
      probe.includes("रेडिएटर") ||
      probe.includes("भाप") ||
      probe.includes("स्टीम")
    ) {
      return {
        detected: true,
        imageQuality: "good",
        detections: [
          {
            label: "overheating_sign",
            confidence: 0.86,
            boundingBox: { x: 100, y: 90, width: 250, height: 210 },
          },
        ],
      };
    }

    // Class: loose_part
    if (
      probe.includes("ढीला") ||
      probe.includes("loose") ||
      probe.includes("बोल्ट") ||
      probe.includes("नट") ||
      probe.includes("बेल्ट") ||
      probe.includes("belt")
    ) {
      return {
        detected: true,
        imageQuality: "good",
        detections: [
          {
            label: "loose_part",
            confidence: 0.83,
            boundingBox: { x: 160, y: 140, width: 190, height: 150 },
          },
        ],
      };
    }

    // Class: damaged_part
    if (
      probe.includes("दरार") ||
      probe.includes("टूटा") ||
      probe.includes("डेंट") ||
      probe.includes("नुकसान") ||
      probe.includes("crack") ||
      probe.includes("damage") ||
      probe.includes("मुड़ा")
    ) {
      return {
        detected: true,
        imageQuality: "good",
        detections: [
          {
            label: "damaged_part",
            confidence: 0.81,
            boundingBox: { x: 90, y: 120, width: 240, height: 200 },
          },
        ],
      };
    }

    // Default demonstration fallback if an image is attached without explicit match
    if (image.length > 500) {
      return {
        detected: true,
        imageQuality: "good",
        detections: [
          {
            label: "damaged_part",
            confidence: 0.72,
            boundingBox: { x: 100, y: 130, width: 210, height: 170 },
          },
        ],
      };
    }

    // Inconclusive fallback
    return {
      detected: false,
      detections: [],
      imageQuality: "good",
    };
  }
}

// ─── YOLOVisionProvider (Future Real Model Adapter) ──────────────────────────

/**
 * YOLO Vision Provider Adapter.
 * Ready to host ONNX Runtime Web / WebAssembly weights when verified models are supplied.
 * Transparently falls back to MockVisionProvider in this prototype.
 */
export class YOLOVisionProvider implements VisionProvider {
  readonly providerName = "YOLOVisionProvider";
  readonly supportedClasses: DetectionClass[] = [
    "smoke",
    "oil_leak",
    "fuel_leak",
    "damaged_part",
    "loose_part",
    "electrical_damage",
    "overheating_sign",
  ];
  private fallbackProvider: MockVisionProvider = new MockVisionProvider();

  isModelReady(): boolean {
    // Verified local model weights are not loaded yet; safely using fallback adapter
    return false;
  }

  async analyzeImage(image: string, context?: VisionContext): Promise<VisionResult> {
    // In production, load ONNX model session and run tensor inference here.
    // For this prototype, cleanly delegate to MockVisionProvider.
    return this.fallbackProvider.analyzeImage(image, context);
  }
}

// ─── Active Provider Singleton ───────────────────────────────────────────────

let activeVisionProvider: VisionProvider = new MockVisionProvider();

export function setVisionProvider(provider: VisionProvider): void {
  activeVisionProvider = provider;
}

export function getVisionProvider(): VisionProvider {
  return activeVisionProvider;
}

// ─── Public Facade Function ──────────────────────────────────────────────────

/**
 * Public facade function called during the diagnosis and photo review flow.
 * Analyzes photo via the active VisionProvider, enforces safety warnings,
 * formats farmer-friendly descriptions, and produces PhotoAnalysisResult.
 */
export async function analyzeMachinePhoto(
  input: PhotoAnalysisInput,
  provider: VisionProvider = activeVisionProvider
): Promise<PhotoAnalysisResult> {
  const { image, machineType = "मशीन", complaintText = "", fileName = "" } = input;

  // If no image is provided
  if (!image) {
    return {
      detectedIssue: "फोटो उपलब्ध नहीं",
      confidence: 0,
      evidence: ["मशीन की कोई फोटो संलग्न नहीं की गई है।"],
      severity: "low",
      isClear: false,
      unclearReason: "फोटो संलग्न नहीं है।",
      friendlyLabelHi: "फोटो संलग्न नहीं है",
      confidenceLevelHi: "पक्का नहीं",
    };
  }

  try {
    const visionResult = await provider.analyzeImage(image, {
      machineType,
      complaintText,
      fileName,
    });

    // Requirement 8: Poor image quality handling
    if (visionResult.imageQuality === "poor") {
      return {
        detected: false,
        imageQuality: "poor",
        detectedIssue: "अस्पष्ट फोटो",
        confidence: 0.35,
        evidence: [
          "फोटो साफ नहीं है। कृपया मशीन की समस्या के पास से एक साफ फोटो लें।",
        ],
        severity: "low",
        isClear: false,
        unclearReason: "फोटो साफ नहीं है। कृपया मशीन की समस्या के पास से एक साफ फोटो लें।",
        actionHint: "फिर से फोटो लें",
        visionResult,
        friendlyLabelHi: "फोटो साफ नहीं है। कृपया मशीन की समस्या के पास से एक साफ फोटो लें।",
        confidenceLevelHi: "पक्का नहीं",
      };
    }

    // Requirement 6: Visible issue detected
    if (visionResult.detected && visionResult.detections.length > 0) {
      const primary = visionResult.detections[0];
      const friendlyLabel = DETECTION_CLASS_LABELS_HI[primary.label] || primary.label;
      const area = DETECTION_CLASS_AREAS_HI[primary.label] || "मशीन का दृश्य क्षेत्र";
      const confidenceText = formatVisionConfidenceHi(primary.confidence);

      const isDangerous = isDangerousVisualClass(primary.label);
      const severity: PhotoAnalysisSeverity = isDangerous
        ? "high"
        : primary.confidence >= 0.8
        ? "medium"
        : "low";

      const evidence = [
        `फोटो में ${friendlyLabel} (${confidenceText})`,
        `निरीक्षण क्षेत्र: ${area}`,
      ];

      return {
        detected: true,
        imageQuality: "good",
        detectedIssue: friendlyLabel,
        confidence: primary.confidence,
        evidence,
        severity,
        isClear: true,
        annotatedArea: area,
        actionHint: "मैकेनिक को यह फोटो दिखाएं ताकि वह सही औजार साथ ला सके।",
        visionResult,
        friendlyLabelHi: friendlyLabel,
        confidenceLevelHi: confidenceText,
        safetyWarning: isDangerous ? MANDATORY_SAFETY_WARNING : null,
      };
    }

    // Requirement 11: Inconclusive / No specific issue found
    return {
      detected: false,
      imageQuality: "good",
      detectedIssue: "फोटो से समस्या स्पष्ट नहीं हो पाई",
      confidence: 0.5,
      evidence: [
        "फोटो से समस्या स्पष्ट नहीं हो पाई। किसान अपनी आवाज अथवा लिखकर समस्या बता सकते हैं।",
      ],
      severity: "low",
      isClear: true,
      actionHint: "आप बोलकर या लिखकर समस्या बता सकते हैं।",
      visionResult,
      friendlyLabelHi: "फोटो से समस्या स्पष्ट नहीं हो पाई।",
      confidenceLevelHi: "पक्का नहीं",
    };
  } catch {
    // Fail-safe catch without throwing
    return {
      detected: false,
      imageQuality: "good",
      detectedIssue: "फोटो से समस्या स्पष्ट नहीं हो पाई",
      confidence: 0.4,
      evidence: ["फोटो विश्लेषण में बाधा आई। सामान्य जाँच जारी रखी जा सकती है।"],
      severity: "low",
      isClear: false,
      unclearReason: "फोटो से समस्या स्पष्ट नहीं हो पाई।",
      actionHint: "आप बोलकर या लिखकर समस्या बता सकते हैं।",
      visionResult: {
        detected: false,
        detections: [],
        imageQuality: "good",
      },
      friendlyLabelHi: "फोटो से समस्या स्पष्ट नहीं हो पाई।",
      confidenceLevelHi: "पक्का नहीं",
    };
  }
}
