import { NextRequest, NextResponse } from "next/server";

/**
 * /api/auth/otp — Backend Authentication & OTP API
 *
 * Implements:
 * 1. Strict Backend Role Verification (FARMER vs TECHNICIAN only).
 * 2. Arbitrary role rejection with HTTP 400.
 * 3. Existing user profile resolution from backend source of truth.
 * 4. Account profile creation & persistence (Name, Phone, Address, Role, Skills, Timestamps).
 * 5. Role-based token generation and session storage for backend API protection.
 * 6. Farmer-friendly localized error handling.
 */

export type UserRole = "farmer" | "technician";

export interface ServerAddress {
  villageOrCity: string;
  district: string;
  state: string;
  pinCode?: string;
}

export interface ServerUserProfile {
  id: string;
  phone: string;
  role: UserRole;
  name: string;
  nameHi: string;
  address?: ServerAddress;
  villageOrArea?: string;
  skills?: string[];
  serviceArea?: string;
  available?: boolean;
  machinesLinked?: string[];
  location?: {
    latitude: number;
    longitude: number;
    village?: string;
    district?: string;
    state?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ServerOtpRecord {
  phone: string;
  role: UserRole;
  otp: string;
  expiresAt: number;
  attemptsLeft: number;
}

// Global in-memory storage across Next.js API calls in runtime
const globalStore = global as unknown as {
  __agripulse_active_otps?: Map<string, ServerOtpRecord>;
  __agripulse_users?: Map<string, ServerUserProfile>;
  __agripulse_sessions?: Map<string, ServerUserProfile>;
};

if (!globalStore.__agripulse_active_otps) {
  globalStore.__agripulse_active_otps = new Map<string, ServerOtpRecord>();
}
if (!globalStore.__agripulse_users) {
  globalStore.__agripulse_users = new Map<string, ServerUserProfile>();
}
const users = globalStore.__agripulse_users;

  // 1. Seed Farmer accounts (Pawan Gupta & Ramlal Yadav)
  const seedFarmer: ServerUserProfile = {
    id: "farmer-001",
    phone: "9876543210",
    role: "farmer",
    name: "Pawan Gupta",
    nameHi: "रामलाल यादव (Pawan Gupta)",
    address: {
      villageOrCity: "शाहपुर",
      district: "लखनऊ",
      state: "उत्तर प्रदेश",
      pinCode: "226001",
    },
    villageOrArea: "शाहपुर, लखनऊ",
    machinesLinked: ["tractor", "sprayer"],
    location: {
      latitude: 26.8467,
      longitude: 80.9462,
      village: "शाहपुर",
      district: "लखनऊ",
      state: "उत्तर प्रदेश",
    },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
  users.set("9876543210_farmer", seedFarmer);
  users.set("farmer-001", seedFarmer);
  users.set("9876543210", seedFarmer);

  // 2. Seed Technician: Rajesh Kumar (9856789012 - exact prompt specification)
  const seedRajeshTech: ServerUserProfile = {
    id: "tech-007",
    phone: "9856789012",
    role: "technician",
    name: "Rajesh Kumar",
    nameHi: "राजेश कुमार",
    address: {
      villageOrCity: "काटोल",
      district: "नागपुर",
      state: "महाराष्ट्र",
      pinCode: "441302",
    },
    villageOrArea: "नागपुर व काटोल क्षेत्र (15 किमी)",
    skills: ["Tractor", "Engine", "Mechanical", "Hydraulic"],
    serviceArea: "नागपुर व काटोल क्षेत्र (15 किमी)",
    available: true,
    location: {
      latitude: 26.8527,
      longitude: 80.9302,
      village: "काटोल",
    },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
  users.set("9856789012_technician", seedRajeshTech);
  users.set("tech-007", seedRajeshTech);
  users.set("9856789012", seedRajeshTech);

  // 3. Seed Technician: Ajay Patel (9834567890)
  const seedAjayTech: ServerUserProfile = {
    id: "tech-005",
    phone: "9834567890",
    role: "technician",
    name: "Ajay Patel",
    nameHi: "अजय पटेल",
    address: {
      villageOrCity: "नरखेड",
      district: "नागपुर",
      state: "महाराष्ट्र",
      pinCode: "441304",
    },
    villageOrArea: "नरखेड व वरुड (12 किमी)",
    skills: ["Tractor", "Engine", "Electrical", "Mechanical"],
    serviceArea: "नरखेड व वरुड",
    available: true,
    location: {
      latitude: 26.8247,
      longitude: 80.9352,
      village: "नरखेड",
    },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
  users.set("9834567890_technician", seedAjayTech);
  users.set("tech-005", seedAjayTech);
  users.set("9834567890", seedAjayTech);

  // 4. Seed Technician: Suresh Yadav (9876501234)
  const seedSureshTech: ServerUserProfile = {
    id: "tech-002",
    phone: "9876501234",
    role: "technician",
    name: "Suresh Yadav",
    nameHi: "सुरेश यादव",
    address: {
      villageOrCity: "हिंगना",
      district: "नागपुर",
      state: "महाराष्ट्र",
      pinCode: "441110",
    },
    villageOrArea: "हिंगना व बुटीबोरी",
    skills: ["Water Pump", "Engine", "Electrical"],
    serviceArea: "हिंगना व बुटीबोरी (15 किमी)",
    available: true,
    location: {
      latitude: 26.8437,
      longitude: 80.9842,
      village: "हिंगना व बुटीबोरी",
    },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
  users.set("9876501234_technician", seedSureshTech);
  users.set("tech-002", seedSureshTech);
  users.set("9876501234", seedSureshTech);

  // 5. Seed Technician: Mohan Singh (9812345678)
  const seedMohanTech: ServerUserProfile = {
    id: "tech-003",
    phone: "9812345678",
    role: "technician",
    name: "Mohan Singh",
    nameHi: "मोहन सिंह",
    address: {
      villageOrCity: "काटोल",
      district: "नागपुर",
      state: "महाराष्ट्र",
      pinCode: "441302",
    },
    villageOrArea: "नागपुर सेंट्रल व काटोल",
    skills: ["Tractor", "Power Tiller", "Engine", "Hydraulic", "Harvester"],
    serviceArea: "नागपुर सेंट्रल व काटोल",
    available: false,
    location: {
      latitude: 26.8527,
      longitude: 80.9302,
      village: "काटोल",
    },
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };
  users.set("9812345678_technician", seedMohanTech);
  users.set("tech-003", seedMohanTech);
  users.set("9812345678", seedMohanTech);

  globalStore.__agripulse_users = users;
if (!globalStore.__agripulse_sessions) {
  globalStore.__agripulse_sessions = new Map<string, ServerUserProfile>();
}

const activeOtps = globalStore.__agripulse_active_otps!;
const serverUsers = globalStore.__agripulse_users!;
const serverSessions = globalStore.__agripulse_sessions!;

/**
 * Find user by phone and optional role
 */
function findServerUser(phone: string, role?: string | null): ServerUserProfile | undefined {
  const cPhone = cleanPhone(phone);
  if (role) {
    const roleLower = role.trim().toLowerCase();
    const compound = `${cPhone}_${roleLower}`;
    if (serverUsers.has(compound)) {
      return serverUsers.get(compound);
    }
    // Search values strictly by role and phone
    for (const u of serverUsers.values()) {
      if (cleanPhone(u.phone) === cPhone && u.role.toLowerCase() === roleLower) {
        return u;
      }
    }
    // If a role was specified and not found, strictly return undefined!
    // Do NOT fall back to a user of a different role.
    return undefined;
  }

  // Only if no role was specified, search by phone
  for (const u of serverUsers.values()) {
    if (cleanPhone(u.phone) === cPhone) {
      return u;
    }
  }

  if (serverUsers.has(cPhone)) {
    return serverUsers.get(cPhone);
  }

  return undefined;
}

/**
 * Persist user cleanly across compound key, ID, and phone index
 */
function saveServerUser(user: ServerUserProfile): void {
  const cPhone = cleanPhone(user.phone);
  const compound = `${cPhone}_${user.role.toLowerCase()}`;
  serverUsers.set(compound, user);
  serverUsers.set(user.id, user);
  serverUsers.set(`${user.role.toLowerCase()}_${cPhone}`, user);
  serverUsers.set(cPhone, user);
}

function cleanPhone(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  return digits;
}

function isValidIndianPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

/**
 * Strict role validator: only allows FARMER or TECHNICIAN (case-insensitive).
 * Blocks arbitrary/malicious roles.
 */
function normalizeAndValidateRole(rawRole: any): UserRole | null {
  if (typeof rawRole !== "string") return null;
  const lower = rawRole.trim().toLowerCase();
  if (lower === "farmer") return "farmer";
  if (lower === "technician") return "technician";
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      phone: rawPhone,
      role: rawRole,
      otp: enteredOtp,
      registrationDetails,
    } = body;

    const phone = cleanPhone(rawPhone);

    // 1. Phone Validation
    if (!isValidIndianPhone(phone)) {
      return NextResponse.json(
        {
          success: false,
          error: "invalid_phone",
          messageHi: "कृपया मान्य 10 अंकों का मोबाइल नंबर दर्ज करें (6-9 से शुरू होने वाला)।",
          messageEn: "Please enter a valid 10-digit mobile number.",
        },
        { status: 400 }
      );
    }

    // 2. Strict Role Validation
    const validatedRole = normalizeAndValidateRole(rawRole);
    if (!validatedRole) {
      return NextResponse.json(
        {
          success: false,
          error: "invalid_role",
          messageHi: "अमान्य खाता प्रकार। केवल 'किसान' या 'टेक्नीशियन' ही अनुमत हैं।",
          messageEn: "Invalid role specified. Only 'farmer' or 'technician' is allowed.",
        },
        { status: 400 }
      );
    }

    const otpKey = `${phone}`;

    // ─── ACTION: SEND OTP ──────────────────────────────────────────
    if (action === "send") {
      const otpCode = "123456";
      const expiresInSeconds = 300; // 5 minutes
      const expiresAt = Date.now() + expiresInSeconds * 1000;

      activeOtps.set(otpKey, {
        phone,
        role: validatedRole,
        otp: otpCode,
        expiresAt,
        attemptsLeft: 5,
      });

      const existingUser = findServerUser(phone, validatedRole);
      const isExistingUser = !!existingUser;

      return NextResponse.json({
        success: true,
        phone,
        role: existingUser ? existingUser.role : validatedRole,
        isExistingUser,
        demoOtp: otpCode,
        expiresInSeconds,
        messageHi: `6 अंकों का OTP आपके मोबाइल (+91 ${phone.slice(0, 5)} ${phone.slice(5)}) पर भेज दिया गया है।`,
        messageEn: `A 6-digit OTP has been sent to +91 ${phone}.`,
      });
    }

    // ─── ACTION: VERIFY OTP ────────────────────────────────────────
    if (action === "verify") {
      const cleanOtp = (enteredOtp || "").replace(/\D/g, "");

      if (cleanOtp.length !== 6) {
        return NextResponse.json(
          {
            success: false,
            error: "invalid_format",
            messageHi: "कृपया 6 अंकों का पूरा OTP दर्ज करें।",
            messageEn: "Please enter all 6 digits of the OTP.",
          },
          { status: 400 }
        );
      }

      let record = activeOtps.get(otpKey);

      // Demo fallback if server restarted
      if (!record && cleanOtp === "123456") {
        record = {
          phone,
          role: validatedRole,
          otp: "123456",
          expiresAt: Date.now() + 300000,
          attemptsLeft: 5,
        };
      }

      if (!record) {
        return NextResponse.json(
          {
            success: false,
            error: "otp_expired",
            messageHi: "OTP की समय सीमा समाप्त हो गई है। कृपया 'दोबारा भेजें' दबाएं।",
            messageEn: "OTP has expired. Please request a new OTP.",
          },
          { status: 400 }
        );
      }

      if (Date.now() > record.expiresAt) {
        activeOtps.delete(otpKey);
        return NextResponse.json(
          {
            success: false,
            error: "otp_expired",
            messageHi: "OTP की समय सीमा समाप्त हो चुकी है। कृपया नया OTP प्राप्त करें।",
            messageEn: "OTP has expired. Please request a new OTP.",
          },
          { status: 400 }
        );
      }

      if (record.otp !== cleanOtp) {
        record.attemptsLeft -= 1;
        if (record.attemptsLeft <= 0) {
          activeOtps.delete(otpKey);
          return NextResponse.json(
            {
              success: false,
              error: "too_many_attempts",
              messageHi: "गलत OTP के अधिकतम प्रयास हो चुके हैं। कृपया नया OTP मंगाएं।",
              messageEn: "Too many incorrect attempts. Please request a new OTP.",
            },
            { status: 400 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: "wrong_otp",
            messageHi: `गलत OTP दर्ज किया गया है! शेष प्रयास: ${record.attemptsLeft}।`,
            messageEn: `Incorrect OTP. Remaining attempts: ${record.attemptsLeft}.`,
          },
          { status: 400 }
        );
      }

      // Valid OTP
      activeOtps.delete(otpKey);

      // ─── BACKEND ROLE VERIFICATION & ACCOUNT RETRIEVAL ──────────────
      // 1. Look up user by phone and requested role
      let user = findServerUser(phone, validatedRole);
      let isNewUser = false;

      if (user) {
        // EXISTING USER: Backend role & profile is the ABSOLUTE SOURCE OF TRUTH.
        user.updatedAt = new Date().toISOString();
        saveServerUser(user);
      } else {
        const realName = (registrationDetails?.name || "").trim();
        if (!realName) {
          // Returning user login: enforce stored database role to prevent spoofing
          const existingAnyRole = findServerUser(phone);
          if (existingAnyRole) {
            user = existingAnyRole;
            user.updatedAt = new Date().toISOString();
            saveServerUser(user);
          } else {
            return NextResponse.json(
              {
                success: false,
                error: "user_not_found",
                messageHi: "यह मोबाइल नंबर पंजीकृत नहीं है। कृपया पहले 'नया रजिस्ट्रेशन' पर जाकर अपना खाता बनाएं।",
                messageEn: "Mobile number is not registered. Please register first.",
              },
              { status: 404 }
            );
          }
        } else {
          // NEW USER REGISTRATION: Save the user's actual entered Full Name and Address
          isNewUser = true;
          const now = new Date().toISOString();
          const targetRole = validatedRole;

          const addr: ServerAddress = {
            villageOrCity: (registrationDetails?.address?.villageOrCity || "").trim(),
            district: (registrationDetails?.address?.district || "").trim(),
            state: (registrationDetails?.address?.state || "").trim(),
            pinCode: (registrationDetails?.address?.pinCode || "").trim(),
          };

          const villageOrArea = [addr.villageOrCity, addr.district, addr.state].filter(Boolean).join(", ");

          user = {
            id: `${targetRole}-${phone}-${Date.now().toString(36)}`,
            phone,
            role: targetRole, // Backend assigns and validates the role strictly
            name: realName,
            nameHi: realName,
            address: addr,
            villageOrArea,
            skills:
              targetRole === "technician"
                ? registrationDetails?.skills && registrationDetails.skills.length > 0
                  ? registrationDetails.skills
                  : ["General Mechanical"]
                : undefined,
            serviceArea:
              targetRole === "technician"
                ? (registrationDetails?.serviceArea || addr.villageOrCity || "").trim()
                : undefined,
            available: targetRole === "technician" ? (registrationDetails?.available ?? true) : undefined,
            machinesLinked:
              targetRole === "farmer" ? ["tractor"] : undefined,
            location: {
              latitude: 21.1458,
              longitude: 79.0882,
              village: addr.villageOrCity,
              district: addr.district,
              state: addr.state,
            },
            createdAt: now,
            updatedAt: now,
          };

          // Persist to server user database
          saveServerUser(user);
        }
      }

      // Generate verified session token
      const token = `agri-token-${user.role.toLowerCase()}-${phone}-${Date.now()}`;
      serverSessions.set(token, user);

      const session = {
        token,
        user,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      return NextResponse.json({
        success: true,
        token,
        session,
        user,
        role: user.role, // Backend-verified authoritative role
        isNewUser,
        messageHi: `नमस्ते, ${user.nameHi || user.name} 👋 लॉगिन सफल हुआ!`,
        messageEn: `Welcome, ${user.name}! Login successful.`,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: "invalid_action",
        messageHi: "अमान्य अनुरोध।",
        messageEn: "Invalid action requested.",
      },
      { status: 400 }
    );
  } catch (err: any) {
    console.error("OTP API Error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "server_error",
        messageHi: "सर्वर त्रुटि: कृपया थोड़ी देर बाद पुनः प्रयास करें।",
        messageEn: "Server error occurred. Please try again.",
        details: err?.message,
      },
      { status: 500 }
    );
  }
}
