import { NextRequest, NextResponse } from "next/server";
import {
  MASTER_SUPPLIERS,
  MASTER_STOCK_ITEMS,
  MASTER_COMPATIBILITY_RULES,
  identifyRequiredPartsFromDiagnosis,
  findNearbySuppliersWithParts,
  isPartCompatibleWithMachine,
  checkSupplierPartStock,
} from "@/services/sparePartsNetworkService";
import { mockSpareParts, getSparePartById } from "@/services/sparePartData";

/**
 * /api/parts — Spare Parts Network & Multi-Supplier Matching API
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.toLowerCase();
    const machine = searchParams.get("machine");
    const partIdsParam = searchParams.get("partIds");
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const suppliersOnly = searchParams.get("suppliers");

    // 1. Return suppliers list
    if (suppliersOnly === "true") {
      return NextResponse.json({ suppliers: MASTER_SUPPLIERS }, { status: 200 });
    }

    // 2. Nearby supplier matching with stock check
    if (lat && lng && partIdsParam) {
      const partIds = partIdsParam.split(",").map((p) => p.trim()).filter(Boolean);
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);

      if (isNaN(latitude) || isNaN(longitude)) {
        return NextResponse.json({ error: "Invalid lat/lng coordinates" }, { status: 400 });
      }

      const matches = findNearbySuppliersWithParts({
        partIds,
        location: { lat: latitude, lng: longitude },
      });

      return NextResponse.json(
        {
          requestedPartIds: partIds,
          matchesCount: matches.length,
          nearbySuppliers: matches,
        },
        { status: 200 }
      );
    }

    // 3. Search or filter parts catalog
    let parts = [...mockSpareParts];

    if (machine) {
      parts = parts.filter((p) =>
        p.compatibleMachines.some(
          (m) => m.toLowerCase() === "all" || m.toLowerCase() === machine.toLowerCase()
        )
      );
    }

    if (search) {
      parts = parts.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          p.nameHi.includes(search) ||
          p.partCode.toLowerCase().includes(search) ||
          p.category.toLowerCase().includes(search)
      );
    }

    return NextResponse.json({ total: parts.length, parts }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, diagnosis, machineType, machineModel, partId, supplierId, quantity } = body;

    // Action 1: Identify required parts from diagnosis text or result
    if (action === "identify_parts" || diagnosis) {
      const identified = identifyRequiredPartsFromDiagnosis(diagnosis, machineType);
      return NextResponse.json({ success: true, identifiedParts: identified }, { status: 200 });
    }

    // Action 2: Check compatibility
    if (action === "check_compatibility" && partId && machineType) {
      const compatible = isPartCompatibleWithMachine(partId, machineType, machineModel);
      return NextResponse.json(
        {
          partId,
          machineType,
          machineModel: machineModel || null,
          isCompatible: compatible,
        },
        { status: 200 }
      );
    }

    // Action 3: Check specific supplier stock
    if (action === "check_stock" && supplierId && partId) {
      const stockInfo = checkSupplierPartStock(supplierId, partId, quantity || 1);
      return NextResponse.json({ success: true, ...stockInfo }, { status: 200 });
    }

    return NextResponse.json({ error: "Invalid action or parameters" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to process request" }, { status: 500 });
  }
}
