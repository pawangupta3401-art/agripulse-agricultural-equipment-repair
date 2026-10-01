import assert from "assert";
import { VoiceHelpScreenContext } from "../types/voiceAssistant";
import { POST as voiceHelpRouteHandler } from "../app/api/assistant/voice-help/route";
import { POST as otpRouteHandler } from "../app/api/auth/otp/route";
import { NextRequest } from "next/server";

function createMockRequest(body: unknown, path = "/api/assistant/voice-help"): NextRequest {
  const url = `http://localhost:3000${path}`;
  return new NextRequest(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function runTestSuite() {
  console.log("==================================================");
  console.log("AGRIPULSE — VOICE-ONLY AI HELP ASSISTANT TEST SUITE");
  console.log("==================================================");

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✓ [TEST ${total}] ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ [TEST ${total}] ${name}:`, err);
    }
  }

  // 1. Farmer selects Farmer context
  await test("Scenario 1: Farmer role context correctly processed", async () => {
    const context: VoiceHelpScreenContext = {
      currentPage: "login_registration",
      selectedRole: "farmer",
      authMode: "register",
      currentStep: "role_selection",
      language: "hi",
    };
    const req = createMockRequest({
      userQuery: "मुझे किसान का अकाउंट बनाना है",
      context,
    });
    const res = await voiceHelpRouteHandler(req);
    const data = await res.json();
    assert(data.success === true, "Response should be successful");
    assert(data.spokenText.length > 5, "Response should contain spoken text");
    assert(
      data.spokenText.includes("किसान") || data.spokenText.includes("नाम"),
      "Response should guide farmer to fill details"
    );
  });

  // 2. Voice help explains next step for farmer
  await test("Scenario 2: Voice help explains next step for farmer registration", async () => {
    const context: VoiceHelpScreenContext = {
      currentPage: "login_registration",
      selectedRole: "farmer",
      authMode: "register",
      currentStep: "role_selection",
      language: "hi",
    };
    const req = createMockRequest({
      userQuery: "मुझे समझ नहीं आ रहा क्या करना है",
      context,
    });
    const res = await voiceHelpRouteHandler(req);
    const data = await res.json();
    assert(data.success === true);
    assert(data.spokenText.includes("खाता") || data.spokenText.includes("किसान"));
  });

  // 3. Technician selects Technician
  await test("Scenario 3: Technician role selection query", async () => {
    const context: VoiceHelpScreenContext = {
      currentPage: "login_registration",
      selectedRole: "technician",
      authMode: "login",
      currentStep: "role_selection",
      language: "hi",
    };
    const req = createMockRequest({
      userQuery: "मैं technician हूं",
      context,
    });
    const res = await voiceHelpRouteHandler(req);
    const data = await res.json();
    assert(data.success === true);
    assert(
      data.spokenText.includes("टेक्नीशियन") || data.spokenText.includes("मोबाइल"),
      "Should explain technician step"
    );
  });

  // 4. Voice help explains next step for technician
  await test("Scenario 4: Voice help guides technician on registration step", async () => {
    const context: VoiceHelpScreenContext = {
      currentPage: "login_registration",
      selectedRole: "technician",
      authMode: "register",
      currentStep: "details_input",
      language: "hi",
    };
    const req = createMockRequest({
      userQuery: "अब मुझे क्या करना होगा?",
      context,
    });
    const res = await voiceHelpRouteHandler(req);
    const data = await res.json();
    assert(data.success === true);
    assert(data.spokenText.length > 0);
  });

  // 5. Login mode guidance
  await test("Scenario 5: Login mode guidance", async () => {
    const context: VoiceHelpScreenContext = {
      currentPage: "login_registration",
      selectedRole: "farmer",
      authMode: "login",
      currentStep: "role_selection",
      language: "hi",
    };
    const req = createMockRequest({
      userQuery: "मुझे लॉगिन करना है",
      context,
    });
    const res = await voiceHelpRouteHandler(req);
    const data = await res.json();
    assert(data.success === true);
    assert(
      data.spokenText.includes("लॉगिन") || data.spokenText.includes("मोबाइल"),
      "Should guide user on login flow"
    );
  });

  // 6. Registration mode guidance
  await test("Scenario 6: Registration mode guidance", async () => {
    const context: VoiceHelpScreenContext = {
      currentPage: "login_registration",
      selectedRole: "farmer",
      authMode: "register",
      currentStep: "role_selection",
      language: "hi",
    };
    const req = createMockRequest({
      userQuery: "नया खाता कैसे खोलें?",
      context,
    });
    const res = await voiceHelpRouteHandler(req);
    const data = await res.json();
    assert(data.success === true);
    assert(data.spokenText.length > 10);
  });

  // 7. OTP explanation
  await test("Scenario 7: OTP explanation in simple farmer-friendly words", async () => {
    const context: VoiceHelpScreenContext = {
      currentPage: "login_registration",
      selectedRole: "farmer",
      authMode: "login",
      currentStep: "otp_verification",
      language: "hi",
    };
    const req = createMockRequest({
      userQuery: "OTP क्या होता है?",
      context,
    });
    const res = await voiceHelpRouteHandler(req);
    const data = await res.json();
    assert(data.success === true);
    assert(
      data.spokenText.includes("सत्यापन") || data.spokenText.includes("कोड") || data.spokenText.includes("मोबाइल"),
      "Should explain OTP as verification code"
    );
  });

  // 8. Hindi voice response format
  await test("Scenario 8: Hindi voice response language correctness", async () => {
    const context: VoiceHelpScreenContext = {
      currentPage: "login_registration",
      selectedRole: "farmer",
      authMode: "login",
      currentStep: "role_selection",
      language: "hi",
    };
    const req = createMockRequest({
      userQuery: "नमस्ते",
      context,
    });
    const res = await voiceHelpRouteHandler(req);
    const data = await res.json();
    assert(data.success === true);
    assert(/[\u0900-\u097F]/.test(data.spokenText), "Should be in Devanagari Hindi script");
  });

  // 9. English voice response if English is selected
  await test("Scenario 9: English voice response if English is selected", async () => {
    const context: VoiceHelpScreenContext = {
      currentPage: "login_registration",
      selectedRole: "farmer",
      authMode: "login",
      currentStep: "role_selection",
      language: "en",
    };
    const req = createMockRequest({
      userQuery: "What is an OTP?",
      context,
    });
    const res = await voiceHelpRouteHandler(req);
    const data = await res.json();
    assert(data.success === true);
    assert(
      data.spokenText.toLowerCase().includes("otp") || data.spokenText.toLowerCase().includes("verification") || data.spokenText.toLowerCase().includes("code"),
      "Should answer in English"
    );
  });

  // 10. Machine Breakdown Query Redirect (Safety rule)
  await test("Scenario 10: Machine breakdown query redirect to login first", async () => {
    const context: VoiceHelpScreenContext = {
      currentPage: "login_registration",
      selectedRole: "farmer",
      authMode: "login",
      currentStep: "role_selection",
      language: "hi",
    };
    const req = createMockRequest({
      userQuery: "मेरी ट्रैक्टर स्टार्ट नहीं हो रही और सफेद धुआं आ रहा है",
      context,
    });
    const res = await voiceHelpRouteHandler(req);
    const data = await res.json();
    assert(data.success === true);
    assert(data.isMachineBreakdownQuery === true, "Must flag machine breakdown query");
    assert(
      data.spokenText.includes("मशीन की समस्या") && data.spokenText.includes("लॉगिन"),
      "Must redirect user to login before machine diagnosis"
    );
  });

  // 11. AI/API Failure Fallback
  await test("Scenario 11: AI/API Failure gracefully produces farmer assistance without developer jargon", async () => {
    const context: VoiceHelpScreenContext = {
      currentPage: "login_registration",
      selectedRole: "farmer",
      authMode: "login",
      currentStep: "role_selection",
      language: "hi",
    };
    // Empty query
    const req = createMockRequest({
      userQuery: "",
      context,
    });
    const res = await voiceHelpRouteHandler(req);
    const data = await res.json();
    assert(!data.spokenText.includes("API Error"), "Must never contain API Error");
    assert(!data.spokenText.includes("Gemini Error"), "Must never contain Gemini Error");
    assert(!data.spokenText.includes("500"), "Must never contain technical status codes");
  });

  // 12. Existing login/registration authentication still works 100%
  await test("Scenario 12: Existing login/registration authentication is 100% intact", async () => {
    // Send OTP for Pawan Gupta (Farmer)
    const sendReq = createMockRequest(
      { action: "send", phone: "9876543210", role: "farmer" },
      "/api/auth/otp"
    );
    const sendRes = await otpRouteHandler(sendReq);
    const sendData = await sendRes.json();
    assert(sendData.success === true, "Farmer OTP request should succeed");

    // Verify OTP
    const verifyReq = createMockRequest(
      { action: "verify", phone: "9876543210", otp: "123456", role: "farmer" },
      "/api/auth/otp"
    );
    const verifyRes = await otpRouteHandler(verifyReq);
    const verifyData = await verifyRes.json();
    assert(verifyData.success === true, "Farmer verification should succeed");
    assert(verifyData.user?.name === "Pawan Gupta", "Should return correct farmer profile");
    assert(verifyData.user?.role === "farmer", "Role should be farmer");
  });

  console.log("==================================================");
  console.log(`TEST SUMMARY: ${passed}/${total} PASSED`);
  console.log("==================================================");

  if (passed !== total) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
