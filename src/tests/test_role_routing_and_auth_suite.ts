/**
 * Comprehensive Test Suite for AgriPulse Role-Based Auth Flow
 *
 * Verifies:
 * 1. New Technician Account Registration + OTP -> Role = "technician"
 * 2. New Farmer Account Registration + OTP -> Role = "farmer"
 * 3. Authoritative Backend Profile Lookup (/api/auth/me) for Technician -> Role = "technician"
 * 4. Authoritative Backend Profile Lookup (/api/auth/me) for Farmer -> Role = "farmer"
 * 5. Logout & Re-login as Technician -> Returns role = "technician"
 * 6. Logout & Re-login as Farmer -> Returns role = "farmer"
 * 7. Refresh scenario (simulated with token) -> Preserves role = "technician"
 * 8. Role-based backend security (/api/technician/jobs and /api/farmer/repairs)
 * 9. Regression test: Requesting technician role for phone 9876543210 does NOT return farmer seed
 */

const BASE_URL = "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${msg}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failed++;
  }
}

async function runSuite() {
  console.log("================================================================================");
  console.log("AGRIPULSE COMPLETE ROLE FLOW & AUTHENTICATION TEST SUITE");
  console.log("================================================================================\n");

  const techPhone = `981${Math.floor(1000000 + Math.random() * 9000000)}`;
  const farmerPhone = `982${Math.floor(1000000 + Math.random() * 9000000)}`;

  let techToken = "";
  let farmerToken = "";

  // ---------------------------------------------------------------------------
  // TEST 1: NEW TECHNICIAN REGISTRATION
  // ---------------------------------------------------------------------------
  console.log(`▶ [TEST 1] Registering New Technician (${techPhone})...`);
  try {
    const sendRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        phone: techPhone,
        role: "technician",
      }),
    });
    const sendData = await sendRes.json();
    assert(sendRes.status === 200, "Send OTP response status is 200");
    assert(sendData.role === "technician", "Send OTP returns role = technician");

    const verifyRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        phone: techPhone,
        role: "technician",
        otp: "123456",
        registrationDetails: {
          name: "Pawan Gupta Technician",
          phone: techPhone,
          address: {
            villageOrCity: "नागपुर",
            district: "नागपुर",
            state: "महाराष्ट्र",
          },
          skills: ["Tractor", "Engine"],
          serviceArea: "नागपुर ग्रामीण",
          available: true,
        },
      }),
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200, "Verify OTP response status is 200");
    assert(verifyData.role === "technician", "Backend assigned role = technician (NOT farmer)");
    assert(verifyData.user.role === "technician", "Saved user profile has role = technician");
    assert(verifyData.user.name === "Pawan Gupta Technician", "Technician name correctly persisted");
    assert(verifyData.token.includes("technician"), "Session token contains role technician");
    techToken = verifyData.token;
  } catch (e: any) {
    assert(false, `Test 1 threw error: ${e.message}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 2: NEW FARMER REGISTRATION
  // ---------------------------------------------------------------------------
  console.log(`\n▶ [TEST 2] Registering New Farmer (${farmerPhone})...`);
  try {
    const sendRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        phone: farmerPhone,
        role: "farmer",
      }),
    });
    const sendData = await sendRes.json();
    assert(sendRes.status === 200, "Send OTP response status is 200");
    assert(sendData.role === "farmer", "Send OTP returns role = farmer");

    const verifyRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        phone: farmerPhone,
        role: "farmer",
        otp: "123456",
        registrationDetails: {
          name: "Ramesh Farmer",
          phone: farmerPhone,
          address: {
            villageOrCity: "वर्धा",
            district: "वर्धा",
            state: "महाराष्ट्र",
          },
        },
      }),
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200, "Verify OTP response status is 200");
    assert(verifyData.role === "farmer", "Backend assigned role = farmer");
    assert(verifyData.user.role === "farmer", "Saved user profile has role = farmer");
    assert(verifyData.user.name === "Ramesh Farmer", "Farmer name correctly persisted");
    farmerToken = verifyData.token;
  } catch (e: any) {
    assert(false, `Test 2 threw error: ${e.message}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 3: BACKEND PROFILE /api/auth/me (SOURCE OF TRUTH)
  // ---------------------------------------------------------------------------
  console.log("\n▶ [TEST 3] Authoritative Backend Profile Verification (/api/auth/me)...");
  try {
    const meTechRes = await fetch(`${BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${techToken}` },
    });
    const meTechData = await meTechRes.json();
    assert(meTechRes.status === 200, "Technician /api/auth/me status is 200");
    assert(meTechData.role === "technician", "Authoritative profile role for Technician is technician");
    assert(meTechData.user.role === "technician", "Authoritative profile user.role is technician");

    const meFarmerRes = await fetch(`${BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    const meFarmerData = await meFarmerRes.json();
    assert(meFarmerRes.status === 200, "Farmer /api/auth/me status is 200");
    assert(meFarmerData.role === "farmer", "Authoritative profile role for Farmer is farmer");
    assert(meFarmerData.user.role === "farmer", "Authoritative profile user.role is farmer");
  } catch (e: any) {
    assert(false, `Test 3 threw error: ${e.message}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 4: LOGOUT & RE-LOGIN TEST (TECHNICIAN & FARMER)
  // ---------------------------------------------------------------------------
  console.log("\n▶ [TEST 4] Logout and Re-login Test...");
  try {
    // Re-login as Technician
    const reloginTechRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        phone: techPhone,
        role: "technician",
        otp: "123456",
      }),
    });
    const reloginTechData = await reloginTechRes.json();
    assert(reloginTechRes.status === 200, "Re-login as Technician status is 200");
    assert(reloginTechData.role === "technician", "Re-login as Technician returns role = technician");
    assert(reloginTechData.user.role === "technician", "Re-login user profile has role = technician");

    // Re-login as Farmer
    const reloginFarmerRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        phone: farmerPhone,
        role: "farmer",
        otp: "123456",
      }),
    });
    const reloginFarmerData = await reloginFarmerRes.json();
    assert(reloginFarmerRes.status === 200, "Re-login as Farmer status is 200");
    assert(reloginFarmerData.role === "farmer", "Re-login as Farmer returns role = farmer");
    assert(reloginFarmerData.user.role === "farmer", "Re-login user profile has role = farmer");
  } catch (e: any) {
    assert(false, `Test 4 threw error: ${e.message}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 5: BROWSER REFRESH SIMULATION (TOKEN RE-VALIDATION)
  // ---------------------------------------------------------------------------
  console.log("\n▶ [TEST 5] Browser Refresh Simulation (Validating stored session)...");
  try {
    const refreshRes = await fetch(`${BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${techToken}` },
    });
    const refreshData = await refreshRes.json();
    assert(refreshRes.status === 200, "Refresh re-validation returned HTTP 200");
    assert(refreshData.role === "technician", "Refresh re-validation kept role = technician (NOT farmer)");
    assert(refreshData.user.role === "technician", "Refresh re-validation user.role = technician");
  } catch (e: any) {
    assert(false, `Test 5 threw error: ${e.message}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 6: ROLE-BASED BACKEND SECURITY AUTHORIZATION
  // ---------------------------------------------------------------------------
  console.log("\n▶ [TEST 6] Role-Based Backend Security Authorization...");
  try {
    // Technician token accessing Technician API (/api/technician/jobs)
    const techJobsRes = await fetch(`${BASE_URL}/api/technician/jobs`, {
      method: "GET",
      headers: { Authorization: `Bearer ${techToken}` },
    });
    assert(techJobsRes.status === 200, "Technician token CAN access /api/technician/jobs (200 OK)");

    // Farmer token accessing Technician API -> MUST RETURN 403 FORBIDDEN
    const farmerJobsRes = await fetch(`${BASE_URL}/api/technician/jobs`, {
      method: "GET",
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert(farmerJobsRes.status === 403, "Farmer token CANNOT access /api/technician/jobs (403 Forbidden)");

    // Farmer token accessing Farmer API (/api/farmer/repairs)
    const farmerRepairsRes = await fetch(`${BASE_URL}/api/farmer/repairs`, {
      method: "GET",
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert(farmerRepairsRes.status === 200, "Farmer token CAN access /api/farmer/repairs (200 OK)");

    // Technician token accessing Farmer API -> MUST RETURN 403 FORBIDDEN
    const techRepairsRes = await fetch(`${BASE_URL}/api/farmer/repairs`, {
      method: "GET",
      headers: { Authorization: `Bearer ${techToken}` },
    });
    assert(techRepairsRes.status === 403, "Technician token CANNOT access /api/farmer/repairs (403 Forbidden)");
  } catch (e: any) {
    assert(false, `Test 6 threw error: ${e.message}`);
  }

  // ---------------------------------------------------------------------------
  // TEST 7: REGRESSION TEST FOR SEEDED/COLLIDING PHONE NUMBERS
  // ---------------------------------------------------------------------------
  console.log("\n▶ [TEST 7] Regression Test: Technician lookup with seed farmer phone (9876543210)...");
  try {
    // If someone specifies role = technician with 9876543210 (which is seeded as farmer Mohan Patel),
    // findServerUser must NOT return Mohan Patel the farmer!
    const otpRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        phone: "9876543210",
        role: "technician",
      }),
    });
    const otpData = await otpRes.json();
    assert(otpData.role === "technician", "Send OTP for 9876543210 as technician maintains role = technician");
    assert(otpData.isExistingUser === false, "Not treated as existing user because no technician exists for 9876543210");
  } catch (e: any) {
    assert(false, `Test 7 threw error: ${e.message}`);
  }

  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite();
