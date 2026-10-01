import { NextRequest, NextResponse } from "next/server";
import { ServerUserProfile } from "../otp/route";

/**
 * /api/auth/me — Get Authenticated User Profile & Role from Backend
 */

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || req.headers.get("x-auth-token") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return NextResponse.json(
      { success: false, error: "unauthorized", messageHi: "सत्र अनुपलब्ध है।" },
      { status: 401 }
    );
  }

  const parts = token.split("-");
  const role = parts[2]?.toLowerCase();
  const phone = parts[3];

  if (!role || !phone) {
    return NextResponse.json(
      { success: false, error: "invalid_token", messageHi: "अमान्य सत्र टोकन।" },
      { status: 401 }
    );
  }

  const globalStore = global as unknown as {
    __agripulse_users?: Map<string, ServerUserProfile>;
    __agripulse_sessions?: Map<string, ServerUserProfile>;
  };

  // 1. Check active session cache by token
  let user = globalStore.__agripulse_sessions?.get(token);

  // 2. Check users map by compound key
  if (!user && globalStore.__agripulse_users) {
    const compound = `${phone}_${role}`;
    user = globalStore.__agripulse_users.get(compound);

    if (!user) {
      for (const u of globalStore.__agripulse_users.values()) {
        if (u.phone === phone && u.role.toLowerCase() === role) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      user = globalStore.__agripulse_users.get(phone);
    }
  }

  if (user) {
    return NextResponse.json({
      success: true,
      user,
      role: user.role,
    });
  }

  const normalizedRole = role === "technician" ? "technician" : "farmer";
  return NextResponse.json({
    success: true,
    user: {
      id: `${role}-${phone}`,
      phone,
      role: normalizedRole,
      name: normalizedRole === "farmer" ? "Pawan Gupta" : "Rajesh Kumar",
      nameHi: normalizedRole === "farmer" ? "Pawan Gupta" : "राजेश कुमार",
    },
    role: normalizedRole,
  });
}
