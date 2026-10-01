import { NextRequest, NextResponse } from "next/server";

/**
 * /api/farmer/repairs — Protected Farmer-Only Backend API
 *
 * Enforces role-based authorization on the server.
 * Technicians and unauthorized users are blocked with HTTP 403 Forbidden.
 */

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || req.headers.get("x-auth-token") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return NextResponse.json(
      {
        success: false,
        error: "unauthorized",
        messageHi: "कृपया पहले किसान खाते से लॉगिन करें।",
        messageEn: "Authentication token missing.",
      },
      { status: 401 }
    );
  }

  // Token format: agri-token-${role}-${phone}-${timestamp}
  const parts = token.split("-");
  const role = parts[2]?.toLowerCase();

  // Strict backend role authorization
  if (role !== "farmer") {
    return NextResponse.json(
      {
        success: false,
        error: "forbidden",
        messageHi: "पहुंच अस्वीकृत: यह सेवा केवल किसान खातों के लिए उपलब्ध है।",
        messageEn: "Access forbidden: only farmers may access this endpoint.",
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    role: "farmer",
    authorized: true,
    messageHi: "किसान मरम्मत विवरण सफलतापूर्वक लोड हुए।",
  });
}
