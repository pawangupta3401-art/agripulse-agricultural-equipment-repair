import { NextRequest, NextResponse } from "next/server";
import {
  getTrainingModules,
  enrollTechnicianInModule,
  recordModuleCompletion,
} from "@/services/technicianTrainingService";

/**
 * /api/technician/training — Technician Training Modules & Examination API
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || undefined;
    const modules = getTrainingModules(category);

    return NextResponse.json({ total: modules.length, modules }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch training modules" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, technicianId, moduleId, score } = body;

    if (!technicianId || !moduleId) {
      return NextResponse.json({ error: "Missing technicianId or moduleId" }, { status: 400 });
    }

    if (action === "enroll") {
      const enrollment = enrollTechnicianInModule(technicianId, moduleId);
      return NextResponse.json({ success: true, enrollment }, { status: 200 });
    }

    if (action === "complete" || typeof score === "number") {
      const result = recordModuleCompletion(technicianId, moduleId, score ?? 80);
      return NextResponse.json({ success: true, ...result }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action. Use 'enroll' or 'complete'" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to process training action" }, { status: 500 });
  }
}
