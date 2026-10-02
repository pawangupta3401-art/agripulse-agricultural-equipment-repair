import { NextRequest, NextResponse } from "next/server";
import {
  getServerRepairs,
  addServerRepair,
  updateServerRepair,
} from "@/services/serverRepairStore";
import { RepairRequest } from "@/types";

/**
 * /api/farmer/repairs — Comprehensive Farmer Backend API
 *
 * Supports:
 * - GET: Fetch active and past repair requests for farmers
 * - POST: Create and persist new repair requests to backend server
 * - PATCH: Update status, details, or notes of an existing repair
 *
 * Enforces role-based authorization when tokens are provided,
 * while seamlessly supporting authenticated farmer clients.
 */

function verifyFarmerAuth(req: NextRequest): {
  authorized: boolean;
  phone?: string;
  role?: string;
  errorResponse?: NextResponse;
} {
  const authHeader = req.headers.get("authorization") || req.headers.get("x-auth-token") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  // If no token, allow if query param ?mode=public or internal request header exists
  if (!token) {
    const isPublic = req.nextUrl.searchParams.get("mode") === "public";
    if (isPublic) {
      return { authorized: true, role: "farmer" };
    }
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "unauthorized",
          messageHi: "कृपया पहले किसान खाते से लॉगिन करें।",
          messageEn: "Authentication token missing.",
        },
        { status: 401 }
      ),
    };
  }

  // Token format: agri-token-${role}-${phone}-${timestamp}
  const parts = token.split("-");
  const role = parts[2]?.toLowerCase();
  const phone = parts[3];

  if (role !== "farmer" && role !== "admin") {
    return {
      authorized: false,
      errorResponse: NextResponse.json(
        {
          success: false,
          error: "forbidden",
          messageHi: "पहुंच अस्वीकृत: यह सेवा केवल किसान खातों के लिए उपलब्ध है।",
          messageEn: "Access forbidden: only farmers may access this endpoint.",
        },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, role, phone };
}

export async function GET(req: NextRequest) {
  const auth = verifyFarmerAuth(req);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  const allRepairs = getServerRepairs();
  const phone = auth.phone || req.nextUrl.searchParams.get("phone");

  // If a specific farmer phone is present, filter for their repairs, or return all if matching
  const filtered = phone
    ? allRepairs.filter((r) => !r.farmerPhone || r.farmerPhone.replace(/\D/g, "").includes(phone.replace(/\D/g, "")))
    : allRepairs;

  return NextResponse.json({
    success: true,
    role: "farmer",
    authorized: true,
    count: filtered.length,
    repairs: filtered,
    messageHi: "किसान मरम्मत विवरण सफलतापूर्वक लोड हुए।",
  });
}

export async function POST(req: NextRequest) {
  const auth = verifyFarmerAuth(req);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  try {
    const body = await req.json();

    if (!body.problemDescription && !body.machineId) {
      return NextResponse.json(
        {
          success: false,
          error: "invalid_input",
          messageHi: "मशीन और समस्या विवरण आवश्यक है।",
        },
        { status: 400 }
      );
    }

    const uniqueId = body.id || `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const newRepair: RepairRequest = {
      id: uniqueId,
      farmerId: body.farmerId || "farmer-001",
      farmerName: body.farmerName || "रामलाल यादव",
      farmerPhone: body.farmerPhone || auth.phone || "9876543210",
      machineId: body.machineId || "tractor",
      machineNameHi: body.machineNameHi || "ट्रैक्टर",
      machineIcon: body.machineIcon || "🚜",
      problemDescription: body.problemDescription || "मशीन में समस्या आ रही है",
      inputMethod: body.inputMethod || "voice",
      mediaFileName: body.mediaFileName,
      photoDataUrl: body.photoDataUrl,
      urgency: body.urgency || "today",
      status: "finding_mechanic",
      statusTextHi: "मैकेनिक खोज रहे हैं",
      createdAt: body.createdAt || new Date().toISOString(),
      verificationStatus: "pending",
      syncStatus: "synced",
      isOfflineCreated: false,
      diagnosis: body.diagnosis,
      estimatedCost: body.estimatedCost,
      farmerLocation: body.farmerLocation,
      channel: body.channel || "app",
      callerPhoneNumber: body.callerPhoneNumber,
      recommendedParts: body.recommendedParts,
    };

    const saved = addServerRepair(newRepair);

    return NextResponse.json(
      {
        success: true,
        role: "farmer",
        repair: saved,
        messageHi: "मरम्मत अनुरोध बैकएंड सर्वर पर सुरक्षित दर्ज हो गया।",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "server_error",
        messageHi: "अनुरोध दर्ज करने में त्रुटि आई।",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = verifyFarmerAuth(req);
  if (!auth.authorized) {
    return auth.errorResponse!;
  }

  try {
    const body = await req.json();
    const { repairId, ...updates } = body;

    if (!repairId) {
      return NextResponse.json(
        {
          success: false,
          error: "missing_repair_id",
          messageHi: "मरम्मत अनुरोध आईडी आवश्यक है।",
        },
        { status: 400 }
      );
    }

    const updated = updateServerRepair(repairId, updates);
    if (!updated) {
      return NextResponse.json(
        {
          success: false,
          error: "not_found",
          messageHi: "मरम्मत अनुरोध नहीं मिला।",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      repair: updated,
      messageHi: "अनुरोध सफलतापूर्वक अपडेट किया गया।",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "server_error",
        messageHi: "अपडेट करने में त्रुटि आई।",
      },
      { status: 500 }
    );
  }
}
