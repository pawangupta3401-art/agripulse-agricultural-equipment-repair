import { NextRequest, NextResponse } from "next/server";
import {
  submitTechnicianCertification,
  updateCertificationVerificationStatus,
} from "@/services/technicianTrainingService";
import { getTechnicians } from "@/services/certificationService";

/**
 * /api/technician/certifications — Technician Certification Verification & Management API
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const technicianId = searchParams.get("technicianId");

    const techs = getTechnicians();

    if (technicianId) {
      const tech = techs.find((t) => t.id === technicianId);
      if (!tech) {
        return NextResponse.json({ error: "Technician not found" }, { status: 404 });
      }
      return NextResponse.json(
        {
          technicianId: tech.id,
          nameHi: tech.nameHi,
          verificationStatus: tech.verificationStatus,
          certifications: tech.certifications || [],
        },
        { status: 200 }
      );
    }

    // List all technicians with certifications summary
    const summary = techs.map((t) => ({
      id: t.id,
      nameHi: t.nameHi,
      skills: t.skills,
      verificationStatus: t.verificationStatus,
      certCount: t.certifications?.length || 0,
      certifications: t.certifications || [],
    }));

    return NextResponse.json({ technicians: summary }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch certifications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { technicianId, certData } = body;

    if (!technicianId || !certData || !certData.certificationName || !certData.category) {
      return NextResponse.json(
        { error: "Missing required fields (technicianId, certData with certificationName & category)" },
        { status: 400 }
      );
    }

    const createdCert = submitTechnicianCertification(technicianId, certData);
    return NextResponse.json({ success: true, certification: createdCert }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to submit certification" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { technicianId, certId, status } = body;

    if (!technicianId || !certId || !status) {
      return NextResponse.json({ error: "Missing technicianId, certId, or status" }, { status: 400 });
    }

    if (!["verified", "pending", "expired"].includes(status)) {
      return NextResponse.json({ error: "Status must be 'verified', 'pending', or 'expired'" }, { status: 400 });
    }

    const updated = updateCertificationVerificationStatus(technicianId, certId, status);
    if (!updated) {
      return NextResponse.json({ error: "Certification or technician not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, technicianId, certId, newStatus: status }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to update certification status" }, { status: 500 });
  }
}
