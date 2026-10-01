/**
 * Authentication & OTP Service — AgriPulse
 *
 * Implements:
 * 1. Role-based authentication: "farmer" (किसान) and "technician" (टेक्नीशियन).
 * 2. Mobile OTP verification architecture (ready for real SMS gateway like Twilio / MSG91 / Fast2SMS).
 * 3. Deterministic mock OTP generator for testing & evaluation (Default demo OTP: 123456).
 * 4. Integration with AgriPulse MockBackendProvider (honors network latency & simulated failures).
 * 5. Farmer & Technician profile resolution from existing seed data (DEMO_FARMERS & mockTechnicians).
 * 6. Session persistence via localStorage ("agripulse_auth_session_v1").
 * 7. Farmer-friendly localized error messages for invalid phone, wrong OTP, expired OTP, and network failure.
 */

import { DEMO_FARMERS, DemoFarmer } from "./demoData";
import { mockTechnicians, Technician } from "./technicianData";
import { getBackendProvider } from "./backendProvider";
import { dispatchSimulatedSMS } from "./telephonyProvider";

export type UserRole = "farmer" | "technician" | "FARMER" | "TECHNICIAN";

/**
 * Strict case-insensitive helper to test if a role is Technician
 */
export function isTechnicianRole(role?: string): boolean {
  if (!role) return false;
  const upper = role.trim().toUpperCase();
  return upper === "TECHNICIAN" || upper === "TECH";
}

/**
 * Strict case-insensitive helper to test if a role is Farmer
 */
export function isFarmerRole(role?: string): boolean {
  if (!role) return false;
  return role.trim().toUpperCase() === "FARMER";
}

/**
 * Normalize role to standard lowercase farmer or technician
 */
export function normalizeRole(role?: string): "farmer" | "technician" {
  return isTechnicianRole(role) ? "technician" : "farmer";
}

export interface UserAddress {
  villageOrCity: string;
  district: string;
  state: string;
  pinCode?: string;
}

export interface RegistrationInput {
  name: string;
  phone?: string;
  address?: UserAddress;
  skills?: string[];
  serviceArea?: string;
  available?: boolean;
}

export interface AuthUser {
  id: string;
  phone: string;
  role: UserRole;
  name: string;
  nameHi: string;
  villageOrArea?: string;
  address?: UserAddress;
  isNewUser: boolean;
  avatarIcon?: string;
  rating?: number;
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
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  createdAt: string;
  expiresAt: string;
}

export interface OtpRequestResult {
  success: boolean;
  messageHi: string;
  messageEn: string;
  phone: string;
  role: UserRole;
  demoOtp?: string;
  expiresInSeconds?: number;
  isExistingUser: boolean;
  error?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  session?: AuthSession;
  messageHi: string;
  messageEn: string;
  isNewUser?: boolean;
  error?: string;
}

const AUTH_SESSION_STORAGE_KEY = "agripulse_auth_session_v1";
const ACTIVE_OTP_STORAGE_KEY = "agripulse_active_otp_v1";
const REGISTERED_USERS_STORAGE_KEY = "agripulse_registered_users_v1";

interface PendingOtpRecord {
  phone: string;
  role: UserRole;
  otp: string;
  expiresAt: number; // Unix timestamp ms
  attemptsLeft: number;
}

/**
 * Validate 10-digit Indian Mobile Number
 * Starts with 6, 7, 8, or 9 and has exactly 10 digits
 */
export function isValidIndianMobileNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return /^[6-9]\d{9}$/.test(cleaned);
}

/**
 * Clean phone string to 10 digits
 */
export function cleanPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  // If prefixed with 91 and 12 digits, strip country code
  if (cleaned.length === 12 && cleaned.startsWith("91")) {
    return cleaned.slice(2);
  }
  return cleaned;
}

/**
 * Look up existing user profile from DEMO data or localStorage registered users
 */
export function lookupUserProfile(phone: string, role: UserRole): { user?: AuthUser; isExisting: boolean } {
  const cleanPhone = cleanPhoneNumber(phone);
  const targetIsTech = isTechnicianRole(role);

  // 1. Check custom registered users in localStorage
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(REGISTERED_USERS_STORAGE_KEY);
      if (stored) {
        const users: AuthUser[] = JSON.parse(stored);
        const match = users.find(
          (u) => cleanPhoneNumber(u.phone) === cleanPhone && isTechnicianRole(u.role) === targetIsTech
        );
        if (match) {
          return { user: match, isExisting: true };
        }
      }
    } catch {
      // fallback
    }
  }

  // 2. Check existing DEMO / SEEDED records
  if (targetIsTech) {
    const demoTech = mockTechnicians.find((t) => cleanPhoneNumber(t.phone) === cleanPhone);
    if (demoTech) {
      return {
        user: {
          id: demoTech.id,
          phone: cleanPhone,
          role: "technician",
          name: demoTech.name,
          nameHi: demoTech.nameHi,
          villageOrArea: demoTech.serviceArea || "स्थानीय ब्लॉक",
          serviceArea: demoTech.serviceArea,
          available: demoTech.available ?? true,
          isNewUser: false,
          avatarIcon: "🔧",
          rating: demoTech.rating,
          skills: demoTech.skills,
          location: demoTech.latitude && demoTech.longitude ? {
            latitude: demoTech.latitude,
            longitude: demoTech.longitude,
            village: demoTech.serviceArea,
          } : undefined,
        },
        isExisting: true,
      };
    }
  } else {
    // Farmer check
    const demoFarmer = DEMO_FARMERS.find((f) => cleanPhoneNumber(f.phone) === cleanPhone);
    if (demoFarmer) {
      return {
        user: {
          id: demoFarmer.id,
          phone: cleanPhone,
          role: "farmer",
          name: demoFarmer.name,
          nameHi: demoFarmer.nameHi,
          villageOrArea: `${demoFarmer.villageHi}, ${demoFarmer.districtHi}`,
          address: {
            villageOrCity: demoFarmer.villageHi,
            district: demoFarmer.districtHi,
            state: "उत्तर प्रदेश",
            pinCode: "226001",
          },
          machinesLinked: ["tractor", "sprayer"],
          isNewUser: false,
          avatarIcon: "🚜",
          location: {
            latitude: 26.8467,
            longitude: 80.9462,
            village: demoFarmer.villageHi,
            district: demoFarmer.districtHi,
          },
        },
        isExisting: true,
      };
    }
  }

  return { isExisting: false };
}

/**
 * Fetch current authenticated user profile & role directly from backend /api/auth/me
 * Ensures the backend is the authoritative source of truth upon session restoration / page refresh.
 */
export async function fetchCurrentAuthProfile(token: string): Promise<{
  success: boolean;
  user?: AuthUser;
  role?: string;
  error?: string;
}> {
  if (typeof window === "undefined" || !token) {
    return { success: false, error: "no_token" };
  }
  try {
    const res = await fetch("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        success: data.success,
        user: data.user,
        role: data.role || data.user?.role,
      };
    }
    return { success: false, error: `http_${res.status}` };
  } catch {
    return { success: false, error: "network_error" };
  }
}

/**
 * Check if network is available (honors MockBackendProvider simulateFailure)
 */
function checkNetworkAvailability(): { available: boolean; errorHi: string } {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return {
      available: false,
      errorHi: "इंटरनेट कनेक्शन उपलब्ध नहीं है। कृपया नेटवर्क जांचें।",
    };
  }

  const backend = getBackendProvider();
  if (backend && typeof (backend as any).getSimulateFailure === "function") {
    if ((backend as any).getSimulateFailure()) {
      return {
        available: false,
        errorHi: "नेटवर्क त्रुटि: सर्वर से संपर्क नहीं हो पा रहा है (सिम्युलेटेड विफलता)। कृपया पुनः प्रयास करें।",
      };
    }
  }

  return { available: true, errorHi: "" };
}

/**
 * Request OTP for a phone number and account role
 */
export async function requestOtp(rawPhone: string, role: UserRole): Promise<OtpRequestResult> {
  const phone = cleanPhoneNumber(rawPhone);

  // 1. Validation
  if (!isValidIndianMobileNumber(phone)) {
    return {
      success: false,
      phone,
      role,
      isExistingUser: false,
      error: "invalid_phone",
      messageHi: "कृपया मान्य 10 अंकों का मोबाइल नंबर दर्ज करें (6-9 से शुरू होने वाला)।",
      messageEn: "Please enter a valid 10-digit mobile number.",
    };
  }

  // 2. Network Check
  const net = checkNetworkAvailability();
  if (!net.available) {
    return {
      success: false,
      phone,
      role,
      isExistingUser: false,
      error: "network_failure",
      messageHi: net.errorHi,
      messageEn: "Network error: unable to connect to the server.",
    };
  }

  // 3. Connect to backend /api/auth/otp
  if (typeof window !== "undefined") {
    try {
      const apiRes = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", phone, role }),
      });
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (!apiData.success) {
          return {
            success: false,
            phone,
            role,
            isExistingUser: false,
            error: apiData.error || "otp_failed",
            messageHi: apiData.messageHi || "OTP भेजने में समस्या आई।",
            messageEn: apiData.messageEn || "Failed to send OTP.",
          };
        }
      }
    } catch {
      // offline fallback
    }
  }

  // Simulate network roundtrip latency (200ms)
  await new Promise((r) => setTimeout(r, 200));

  // 4. User lookup
  const { isExisting } = lookupUserProfile(phone, role);

  // 5. Generate OTP (Demo OTP is 123456 for predictable demo testing, valid for 5 minutes)
  const otpCode = "123456";
  const expiresInSeconds = 300; // 5 minutes
  const expiresAt = Date.now() + expiresInSeconds * 1000;

  const record: PendingOtpRecord = {
    phone,
    role,
    otp: otpCode,
    expiresAt,
    attemptsLeft: 5,
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(ACTIVE_OTP_STORAGE_KEY, JSON.stringify(record));
    } catch {
      // ignore
    }
  }

  // 6. Send simulated SMS via telephonyProvider logger
  dispatchSimulatedSMS({
    recipientPhone: phone,
    messageTextHi: `AgriPulse: आपका सुरक्षा OTP है ${otpCode}। यह 5 मिनट के लिए मान्य है। किसी के साथ साझा न करें।`,
    eventType: "status_inquiry",
  });

  return {
    success: true,
    phone,
    role,
    demoOtp: otpCode,
    expiresInSeconds,
    isExistingUser: isExisting,
    messageHi: `6 अंकों का OTP +91 ${phone.slice(0, 5)} ${phone.slice(5)} पर भेजा गया है।`,
    messageEn: `A 6-digit OTP has been sent to +91 ${phone}.`,
  };
}

/**
 * Verify OTP and generate authenticated session with backend role verification
 */
export async function verifyOtp(
  rawPhone: string,
  role: UserRole,
  enteredOtp: string,
  registrationDetails?: RegistrationInput
): Promise<OtpVerifyResult> {
  const phone = cleanPhoneNumber(rawPhone);
  const cleanOtp = enteredOtp.replace(/\D/g, "");
  const normalizedRole: UserRole = isTechnicianRole(role) ? "technician" : "farmer";

  // 1. Network Check
  const net = checkNetworkAvailability();
  if (!net.available) {
    return {
      success: false,
      error: "network_failure",
      messageHi: net.errorHi,
      messageEn: "Network error: unable to connect to server.",
    };
  }

  // 2. Validate input
  if (cleanOtp.length !== 6) {
    return {
      success: false,
      error: "invalid_format",
      messageHi: "कृपया 6 अंकों का पूरा OTP दर्ज करें।",
      messageEn: "Please enter all 6 digits of the OTP.",
    };
  }

  // 3. Call backend verification if in browser (BACKEND ROLE SOURCE OF TRUTH)
  if (typeof window !== "undefined") {
    try {
      const apiRes = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          phone,
          role: normalizedRole,
          otp: cleanOtp,
          registrationDetails,
        }),
      });
      const apiData = await apiRes.json();
      if (!apiData.success) {
        return {
          success: false,
          error: apiData.error || "wrong_otp",
          messageHi: apiData.messageHi || "गलत OTP दर्ज किया गया है।",
          messageEn: apiData.messageEn || "Incorrect OTP.",
        };
      }

      // If backend successfully verified and created/retrieved session
      if (apiData.session) {
        try {
          localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(apiData.session));
          const stored = localStorage.getItem(REGISTERED_USERS_STORAGE_KEY);
          const list: AuthUser[] = stored ? JSON.parse(stored) : [];
          const filtered = list.filter((u) => !(u.phone === apiData.user.phone && u.role === apiData.user.role));
          filtered.push(apiData.user);
          localStorage.setItem(REGISTERED_USERS_STORAGE_KEY, JSON.stringify(filtered));
        } catch {}

        return {
          success: true,
          session: apiData.session,
          isNewUser: apiData.isNewUser,
          messageHi: apiData.messageHi || `नमस्ते, ${apiData.user.nameHi || apiData.user.name} 👋`,
          messageEn: apiData.messageEn || "Login successful.",
        };
      }
    } catch {
      // offline fallback
    }
  }

  // Simulate network latency
  await new Promise((r) => setTimeout(r, 200));

  // 4. Read pending OTP record
  let record: PendingOtpRecord | null = null;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(ACTIVE_OTP_STORAGE_KEY);
      if (stored) {
        record = JSON.parse(stored);
      }
    } catch {
      record = null;
    }
  }

  // If no record or phone/role mismatch
  if (!record || record.phone !== phone || record.role !== role) {
    // For seamless testing, allow demo code 123456 even if active record was cleared
    if (cleanOtp === "123456") {
      record = {
        phone,
        role,
        otp: "123456",
        expiresAt: Date.now() + 300000,
        attemptsLeft: 5,
      };
    } else {
      return {
        success: false,
        error: "otp_expired",
        messageHi: "OTP की समय सीमा समाप्त हो गई है या अमान्य है। कृपया 'दोबारा भेजें' दबाएं।",
        messageEn: "OTP has expired. Please request a new OTP.",
      };
    }
  }

  // 5. Check expiration
  if (Date.now() > record.expiresAt) {
    return {
      success: false,
      error: "otp_expired",
      messageHi: "OTP की समय सीमा समाप्त हो चुकी है। कृपया नया OTP प्राप्त करें।",
      messageEn: "OTP has expired. Please request a new OTP.",
    };
  }

  // 6. Check code match
  if (record.otp !== cleanOtp) {
    record.attemptsLeft -= 1;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ACTIVE_OTP_STORAGE_KEY, JSON.stringify(record));
      } catch {}
    }

    if (record.attemptsLeft <= 0) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(ACTIVE_OTP_STORAGE_KEY);
      }
      return {
        success: false,
        error: "too_many_attempts",
        messageHi: "गलत OTP के अधिकतम प्रयास हो चुके हैं। कृपया नया OTP मंगाएं।",
        messageEn: "Too many incorrect attempts. Please request a new OTP.",
      };
    }

    return {
      success: false,
      error: "wrong_otp",
      messageHi: `गलत OTP दर्ज किया गया है! शेष प्रयास: ${record.attemptsLeft}।`,
      messageEn: `Incorrect OTP. Remaining attempts: ${record.attemptsLeft}.`,
    };
  }

  // 7. Success: Clear pending OTP
  if (typeof window !== "undefined") {
    localStorage.removeItem(ACTIVE_OTP_STORAGE_KEY);
  }

  // 8. Resolve or create user profile
  let { user, isExisting } = lookupUserProfile(phone, normalizedRole);

  if (!user) {
    // Brand new user registration with registrationDetails if present
    const newId = normalizedRole === "farmer" ? `farmer-${Date.now()}` : `tech-${Date.now()}`;
    const realName = (registrationDetails?.name || "").trim() || (normalizedRole === "farmer" ? "किसान साथी" : "टेक्नीशियन मित्र");
    const address = registrationDetails?.address || {
      villageOrCity: "नागपुर",
      district: "नागपुर",
      state: "महाराष्ट्र",
      pinCode: "440001",
    };
    const villageOrArea = `${address.villageOrCity}, ${address.district}`;

    user = {
      id: newId,
      phone,
      role: normalizedRole,
      name: realName,
      nameHi: realName,
      address,
      villageOrArea,
      skills: normalizedRole === "technician" ? registrationDetails?.skills || ["Tractor", "Mechanical"] : undefined,
      serviceArea: normalizedRole === "technician" ? registrationDetails?.serviceArea || address.villageOrCity : undefined,
      available: normalizedRole === "technician" ? true : undefined,
      machinesLinked: normalizedRole === "farmer" ? ["tractor"] : undefined,
      isNewUser: true,
      avatarIcon: normalizedRole === "farmer" ? "🚜" : "🔧",
      rating: normalizedRole === "technician" ? 5.0 : undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to registered users list
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(REGISTERED_USERS_STORAGE_KEY);
        const list: AuthUser[] = stored ? JSON.parse(stored) : [];
        list.push(user);
        localStorage.setItem(REGISTERED_USERS_STORAGE_KEY, JSON.stringify(list));
      } catch {}
    }
  }

  // 9. Create and persist AuthSession
  const sessionToken = `agri-token-${normalizedRole}-${phone}-${Date.now()}`;
  const session: AuthSession = {
    token: sessionToken,
    user,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  };

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {}
  }

  return {
    success: true,
    session,
    isNewUser: !isExisting,
    messageHi: `सफलतापूर्वक लॉगिन हो गया! ${normalizedRole === "farmer" ? "किसान पोर्टल" : "टेक्नीशियन पोर्टल"} खुल रहा है...`,
    messageEn: "Login successful!",
  };
}

/**
 * Register a new technician with trade details and create active session
 */
export async function registerNewTechnician(params: {
  phone: string;
  name: string;
  experienceYears: number;
  serviceArea: string;
  skills: string[];
}): Promise<OtpVerifyResult> {
  const cleanPhone = cleanPhoneNumber(params.phone);
  const newId = `tech-${Date.now()}`;

  const user: AuthUser = {
    id: newId,
    phone: cleanPhone,
    role: "technician",
    name: params.name || "प्रमाणित मैकेनिक",
    nameHi: params.name || "प्रमाणित मैकेनिक",
    villageOrArea: params.serviceArea || "स्थानीय क्षेत्र",
    isNewUser: false,
    avatarIcon: "🔧",
    rating: 5.0,
    skills: params.skills.length > 0 ? params.skills : ["Tractor", "Mechanical"],
  };

  // Save to registered users
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(REGISTERED_USERS_STORAGE_KEY);
      const list: AuthUser[] = stored ? JSON.parse(stored) : [];
      // replace if existing with same phone & role
      const filtered = list.filter((u) => !(u.phone === cleanPhone && u.role === "technician"));
      filtered.push(user);
      localStorage.setItem(REGISTERED_USERS_STORAGE_KEY, JSON.stringify(filtered));

      // Also create session
      const sessionToken = `agri-token-technician-${cleanPhone}-${Date.now()}`;
      const session: AuthSession = {
        token: sessionToken,
        user,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };
      localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(session));

      return {
        success: true,
        session,
        isNewUser: false,
        messageHi: "टेक्नीशियन पंजीकरण सफल हुआ! आपका डैशबोर्ड खुल रहा है...",
        messageEn: "Technician registered successfully!",
      };
    } catch (e: any) {
      return {
        success: false,
        error: "storage_error",
        messageHi: "पंजीकरण सुरक्षित करने में समस्या आई।",
        messageEn: "Could not save registration.",
      };
    }
  }

  return {
    success: false,
    error: "no_window",
    messageHi: "ब्राउज़र वातावरण उपलब्ध नहीं है।",
    messageEn: "Browser environment not available.",
  };
}

/**
 * Get active authenticated session from localStorage
 */
export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: AuthSession = JSON.parse(raw);
    if (!session || !session.user || !session.user.role) return null;

    // Check expiration
    if (session.expiresAt && new Date(session.expiresAt).getTime() < Date.now()) {
      localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Clear authenticated session (Logout)
 */
export function clearStoredSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_OTP_STORAGE_KEY);
  } catch {}
}

/**
 * Verify Backend Authorization for protected role-based endpoints
 */
export async function verifyBackendAuthorization(
  token: string,
  targetEndpoint: "technician" | "farmer"
): Promise<{ authorized: boolean; status: number; messageHi: string }> {
  try {
    const endpoint =
      targetEndpoint === "technician"
        ? "/api/technician/jobs"
        : "/api/farmer/repairs";
    const res = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    return {
      authorized: res.status === 200,
      status: res.status,
      messageHi: data.messageHi || (res.status === 403 ? "पहुंच अस्वीकृत" : "सत्यापित"),
    };
  } catch (err: any) {
    return {
      authorized: false,
      status: 500,
      messageHi: "नेटवर्क त्रुटि: सर्वर से संपर्क नहीं हुआ।",
    };
  }
}

