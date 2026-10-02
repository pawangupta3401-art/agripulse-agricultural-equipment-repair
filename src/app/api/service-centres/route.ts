import { NextRequest, NextResponse } from "next/server";
import {
  getServiceCentres,
  getServiceCentreById,
  matchServiceCentres,
  associateTechnicianWithCentre,
  disassociateTechnicianFromCentre,
  getCentresByTechnicianId,
  getCentresByOperatingType,
  createServiceCentre,
} from "@/services/serviceCentreService";

/**
 * /api/service-centres — Local Service Centres, FPOs & Cooperatives API
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const centreId = searchParams.get("id");
    const orgType = searchParams.get("type");
    const technicianId = searchParams.get("technicianId");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const machine = searchParams.get("machine");

    // Single centre lookup
    if (centreId) {
      const centre = getServiceCentreById(centreId);
      if (!centre) {
        return NextResponse.json({ error: "Service centre not found" }, { status: 404 });
      }
      return NextResponse.json({ centre }, { status: 200 });
    }

    // Filter by technician
    if (technicianId) {
      const affiliatedCentres = getCentresByTechnicianId(technicianId);
      return NextResponse.json({ total: affiliatedCentres.length, centres: affiliatedCentres }, { status: 200 });
    }

    // Filter by organization type (FPO / Cooperative / etc.)
    if (orgType) {
      const filtered = getCentresByOperatingType(orgType);
      return NextResponse.json({ total: filtered.length, centres: filtered }, { status: 200 });
    }

    // Location-based matching with equipment support
    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      if (!isNaN(latitude) && !isNaN(longitude)) {
        const matchResult = matchServiceCentres({
          machineType: machine || "Tractor",
          farmerLocation: {
            latitude,
            longitude,
            locationSource: "manual",
            locationUpdatedAt: new Date().toISOString(),
          },
        });
        return NextResponse.json({ matchResult }, { status: 200 });
      }
    }

    // All centres
    const all = getServiceCentres();
    return NextResponse.json({ total: all.length, centres: all }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to fetch service centres" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, centreId, technicianId, role, centreData } = body;

    // Action 1: Associate technician
    if (action === "associate_technician") {
      if (!centreId || !technicianId) {
        return NextResponse.json({ error: "Missing centreId or technicianId" }, { status: 400 });
      }
      const success = associateTechnicianWithCentre(centreId, technicianId, role || "affiliate");
      return NextResponse.json({ success, centreId, technicianId, role: role || "affiliate" }, { status: 200 });
    }

    // Action 2: Disassociate technician
    if (action === "disassociate_technician") {
      if (!centreId || !technicianId) {
        return NextResponse.json({ error: "Missing centreId or technicianId" }, { status: 400 });
      }
      const success = disassociateTechnicianFromCentre(centreId, technicianId);
      return NextResponse.json({ success, centreId, technicianId }, { status: 200 });
    }

    // Action 3: Register new Service Centre / FPO
    if (action === "create" || centreData) {
      const dataToCreate = centreData || body;
      const created = createServiceCentre(dataToCreate);
      return NextResponse.json({ success: true, centre: created }, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to process request" }, { status: 500 });
  }
}
