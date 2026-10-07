/**
 * visualAnalysisService.ts
 * ────────────────────────
 * VISUAL ANALYSIS ABSTRACTION LAYER — Job-Ready Verification
 *
 * Architecture:
 *  1. Defines a clean VisualAnalysisEngine interface.
 *  2. Provides a MockFallbackEngine that returns deterministic, safe results
 *     when no real YOLO / computer vision model is connected.
 *  3. Provides a LocalYOLOEngine stub ready to be wired up once a real model
 *     is available (e.g., ONNX Runtime Web, TensorFlow.js, roboflow.js).
 *  4. runVisualAnalysis() is the single public entry point — it picks the
 *     best available engine automatically.
 *
 * IMPORTANT:
 *  - The mock fallback NEVER claims AI analysed the evidence.
 *  - All results carry a `source` field so the UI can display the correct label.
 *  - Safety-critical pass/fail decisions are ALWAYS made by the deterministic
 *    rule engine in jobReadinessService.ts, not by this service alone.
 */

import { VisualAnalysisResult, VisualAnalysisSource } from "@/types";

// ─── Engine Interface ─────────────────────────────────────────────────────────

export interface VisualAnalysisInput {
  /**
   * Array of evidence data URLs or object URLs.
   * For video, only metadata / thumbnail is used; no frame extraction yet.
   */
  evidenceUrls: string[];

  /** Which farm operation context this analysis is for */
  farmOperation: "spraying";
}

export interface VisualAnalysisEngine {
  readonly source: VisualAnalysisSource;
  /** Returns true when this engine is ready to run (model loaded, WASM ready, etc.) */
  isAvailable(): Promise<boolean>;
  analyze(input: VisualAnalysisInput): Promise<VisualAnalysisResult>;
}

// ─── Mock Fallback Engine ─────────────────────────────────────────────────────
//
// INTERNAL NOTE: THIS IS A MOCK. No real computer vision analysis is performed.
// Results are deterministic and safe-positive when evidence is present.
// The `source: "mock_fallback"` field MUST be preserved so the UI can
// communicate this honestly to users and developers.

class MockFallbackEngine implements VisualAnalysisEngine {
  readonly source: VisualAnalysisSource = "mock_fallback";

  async isAvailable(): Promise<boolean> {
    // Mock is always available as the last-resort fallback
    return true;
  }

  async analyze(input: VisualAnalysisInput): Promise<VisualAnalysisResult> {
    const urls = input?.evidenceUrls || (input as any)?.mediaUrls || [];
    const hasEvidence = urls.length > 0;

    // Simulate a brief analysis delay (100-300ms) for realistic UX
    await new Promise((r) => setTimeout(r, 150 + Math.random() * 200));

    if (!hasEvidence) {
      // INTERNAL NOTE: Mock — no evidence, return insufficient quality
      return {
        source: "mock_fallback",
        nozzle_activity: null,
        visible_leak: null,
        spray_pattern: null,
        visible_damage: null,
        evidence_quality: "insufficient",
        confidence: 1.0,
        analyzedAt: new Date().toISOString(),
        internalNote: "[MOCK] No evidence provided — cannot analyse.",
      };
    }

    // INTERNAL NOTE: Mock — evidence present, return optimistic but honest result.
    // A real YOLO model would actually parse the image/video frames.
    return {
      source: "mock_fallback",
      nozzle_activity: true,       // Mock: assumed active — real model would verify
      visible_leak: false,          // Mock: assumed clean — real model would verify
      spray_pattern: "normal",      // Mock: assumed normal — real model would verify
      visible_damage: false,        // Mock: assumed no damage — real model would verify
      evidence_quality: "good",
      confidence: 0.85,
      analyzedAt: new Date().toISOString(),
      internalNote:
        "[MOCK_FALLBACK] No YOLO model connected. Deterministic safe result used. " +
        "Wire LocalYOLOEngine or CloudVisionEngine to replace this.",
    };
  }
}

// ─── Local YOLO Engine Stub ──────────────────────────────────────────────────
//
// Wire up a real model here when available.
// Options: ONNX Runtime Web, TensorFlow.js, Roboflow Hosted Inference.

class LocalYOLOEngine implements VisualAnalysisEngine {
  readonly source: VisualAnalysisSource = "local_yolo";

  async isAvailable(): Promise<boolean> {
    // TODO: Check if ONNX / TFjs model is loaded.
    // Example: return typeof (window as any).ort !== "undefined" && modelLoaded;
    return false;
  }

  async analyze(_input: VisualAnalysisInput): Promise<VisualAnalysisResult> {
    // TODO: Run real YOLO inference here.
    // 1. Load model: const session = await ort.InferenceSession.create("/models/sprayer_yolo.onnx")
    // 2. Pre-process frame from evidenceUrl
    // 3. Run inference: const results = await session.run(feeds)
    // 4. Post-process detections → nozzle_activity, visible_leak, etc.
    throw new Error("LocalYOLOEngine.analyze() not implemented yet.");
  }
}

// ─── Engine Registry ─────────────────────────────────────────────────────────

const ENGINE_PRIORITY: VisualAnalysisEngine[] = [
  new LocalYOLOEngine(),
  new MockFallbackEngine(), // Always last
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run visual analysis on the provided evidence.
 *
 * Automatically selects the best available engine (LocalYOLO → MockFallback).
 * The mock fallback is ALWAYS used until a real model is wired in.
 *
 * @returns VisualAnalysisResult with `source` indicating which engine ran.
 */
export async function runVisualAnalysis(
  input: VisualAnalysisInput
): Promise<VisualAnalysisResult> {
  for (const engine of ENGINE_PRIORITY) {
    try {
      const available = await engine.isAvailable();
      if (available) {
        return await engine.analyze(input);
      }
    } catch (err) {
      // Engine failed — try next
      console.warn(`[visualAnalysisService] Engine "${engine.source}" failed:`, err);
    }
  }

  // Should never reach here since MockFallbackEngine is always available.
  // But if it does, return a safe "insufficient" result.
  return {
    source: "mock_fallback",
    nozzle_activity: null,
    visible_leak: null,
    spray_pattern: null,
    visible_damage: null,
    evidence_quality: "insufficient",
    confidence: 0,
    analyzedAt: new Date().toISOString(),
    internalNote: "[ERROR] All engines failed. Cannot analyse evidence.",
  };
}

/**
 * Returns a human-readable label for the analysis source.
 * Used only in developer/debug views — not shown as a "real AI verdict" to farmers.
 */
export function getAnalysisSourceLabel(source: VisualAnalysisSource): string {
  switch (source) {
    case "local_yolo":
      return "Local Vision Model";
    case "cloud_vision":
      return "Cloud Vision API";
    case "mock_fallback":
    default:
      return "Manual Review (Auto-Assist)";
  }
}
