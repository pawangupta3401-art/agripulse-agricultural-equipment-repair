import { NextRequest, NextResponse } from "next/server";
import {
  calculateSupplierSettlement,
  getEcosystemFinancialSummary,
} from "@/services/billingAndRevenueService";
import {
  calculateTechnicianSettlement,
  calculateServiceCentreSettlement,
  getPlatformBusinessSummary,
} from "@/services/businessModelService";
import { getTechnicians } from "@/services/certificationService";
import { getServiceCentres } from "@/services/serviceCentreService";
import { MASTER_SUPPLIERS } from "@/services/sparePartsNetworkService";

/**
 * /api/billing/settlements — Multi-Party Ecosystem Settlements & Financial Ledger API
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");
    const technicianId = searchParams.get("technicianId");
    const serviceCentreId = searchParams.get("serviceCentreId");

    // Single supplier settlement
    if (supplierId) {
      const settlement = calculateSupplierSettlement(supplierId);
      return NextResponse.json({ settlement }, { status: 200 });
    }

    // Single technician settlement
    if (technicianId) {
      const settlement = calculateTechnicianSettlement(technicianId);
      return NextResponse.json({ settlement }, { status: 200 });
    }

    // Single service centre settlement
    if (serviceCentreId) {
      const settlement = calculateServiceCentreSettlement(serviceCentreId);
      return NextResponse.json({ settlement }, { status: 200 });
    }

    // Full ecosystem ledger report
    const techs = getTechnicians();
    const centres = getServiceCentres();

    const technicianSettlements = techs.map((t) => calculateTechnicianSettlement(t.id));
    const supplierSettlements = MASTER_SUPPLIERS.map((s) => calculateSupplierSettlement(s.id));
    const serviceCentreSettlements = centres.map((c) => calculateServiceCentreSettlement(c.id));
    const platformSummary = getPlatformBusinessSummary();

    return NextResponse.json(
      {
        platformSummary,
        supplierSettlements,
        technicianSettlements,
        serviceCentreSettlements,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to generate settlements" }, { status: 500 });
  }
}
