/**
 * Comprehensive Integration & Security Test
 * AgriPulse Authentication & Registration Flow: Farmer & Technician Separation
 */

const BASE_URL = "http://localhost:3000";

async function runTests() {
  console.log("==================================================");
  console.log("AGRIPULSE AUTH & REGISTRATION COMPREHENSIVE TEST");
  console.log("==================================================\n");

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

  // -------------------------------------------------------------------------
  // TEST 1: Backend Role Validation & Arbitrary Role Rejection
  // -------------------------------------------------------------------------
  console.log("--- 1. Testing Role Validation & Arbitrary Role Rejection ---");
  try {
    const res = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        phone: "9876543210",
        role: "SUPER_ADMIN", // Malicious / arbitrary role
      }),
    });
    const data = await res.json();
    assert(res.status === 400, "Backend rejected arbitrary role SUPER_ADMIN with HTTP 400");
    assert(data.success === false, "Response success is false for arbitrary role");
    assert(data.error === "invalid_role", "Error code is invalid_role");
  } catch (e: any) {
    assert(false, `Arbitrary role rejection crashed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Farmer Registration Flow (Pawan Gupta)
  // -------------------------------------------------------------------------
  console.log("\n--- 2. Testing Farmer Registration Flow ---");
  let farmerToken = "";
  const farmerPhone = "9898112233";
  try {
    // A. Request OTP
    const otpRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        phone: farmerPhone,
        role: "farmer",
      }),
    });
    const otpData = await otpRes.json();
    assert(otpRes.status === 200, "OTP requested successfully for Farmer");
    assert(otpData.success === true, "OTP send returned success: true");

    // B. Verify OTP with Registration Details
    const verifyRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        phone: farmerPhone,
        role: "farmer",
        otp: "123456",
        registrationDetails: {
          name: "Pawan Gupta",
          address: {
            villageOrCity: "नागपुर",
            district: "नागपुर",
            state: "महाराष्ट्र",
            pinCode: "440001",
          },
        },
      }),
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200, "Farmer OTP verified successfully with HTTP 200");
    assert(verifyData.role === "farmer", "Backend assigned role = farmer");
    assert(verifyData.user.name === "Pawan Gupta", "User full name stored as 'Pawan Gupta'");
    assert(verifyData.user.address?.villageOrCity === "नागपुर", "Address village/city stored");
    assert(verifyData.user.address?.state === "महाराष्ट्र", "Address state stored");
    assert(!!verifyData.token, "Session token generated");
    farmerToken = verifyData.token;
  } catch (e: any) {
    assert(false, `Farmer registration crashed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Technician Registration Flow (Pawan Gupta)
  // -------------------------------------------------------------------------
  console.log("\n--- 3. Testing Technician Registration Flow ---");
  let techToken = "";
  const techPhone = "9811998877";
  try {
    // A. Request OTP
    const otpRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        phone: techPhone,
        role: "technician",
      }),
    });
    const otpData = await otpRes.json();
    assert(otpRes.status === 200, "OTP requested successfully for Technician");

    // B. Verify OTP with Technician Profile Details
    const verifyRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        phone: techPhone,
        role: "technician",
        otp: "123456",
        registrationDetails: {
          name: "Pawan Gupta",
          address: {
            villageOrCity: "नागपुर",
            district: "नागपुर",
            state: "महाराष्ट्र",
            pinCode: "440001",
          },
          skills: ["Tractor", "Pump", "Mechanical"],
          serviceArea: "नागपुर व 15 किमी आसपास",
          available: true,
        },
      }),
    });
    const verifyData = await verifyRes.json();
    assert(verifyRes.status === 200, "Technician OTP verified successfully");
    assert(verifyData.role === "technician", "Backend assigned role = technician");
    assert(verifyData.user.name === "Pawan Gupta", "Technician name stored as 'Pawan Gupta'");
    assert(
      Array.isArray(verifyData.user.skills) && verifyData.user.skills.includes("Tractor"),
      "Technician skills include 'Tractor'"
    );
    assert(
      verifyData.user.serviceArea === "नागपुर व 15 किमी आसपास",
      "Technician service area stored"
    );
    assert(verifyData.user.available === true, "Technician availability stored as true");
    assert(!!verifyData.token, "Session token generated for technician");
    techToken = verifyData.token;
  } catch (e: any) {
    assert(false, `Technician registration crashed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Security — Cross-Role Access Control (403 Forbidden)
  // -------------------------------------------------------------------------
  console.log("\n--- 4. Testing Security: Cross-Role Backend Authorization ---");
  try {
    // A. Farmer token attempts to call Technician-only API
    const techApiRes = await fetch(`${BASE_URL}/api/technician/jobs`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${farmerToken}`,
      },
    });
    assert(techApiRes.status === 403, "Farmer token blocked from /api/technician/jobs with HTTP 403 Forbidden");

    // B. Technician token attempts to call Farmer-only API
    const farmerApiRes = await fetch(`${BASE_URL}/api/farmer/repairs`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${techToken}`,
      },
    });
    assert(farmerApiRes.status === 403, "Technician token blocked from /api/farmer/repairs with HTTP 403 Forbidden");

    // C. Authorized calls succeed
    const techSuccess = await fetch(`${BASE_URL}/api/technician/jobs`, {
      method: "GET",
      headers: { Authorization: `Bearer ${techToken}` },
    });
    assert(techSuccess.status === 200, "Technician token authorized on /api/technician/jobs (HTTP 200)");

    const farmerSuccess = await fetch(`${BASE_URL}/api/farmer/repairs`, {
      method: "GET",
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    assert(farmerSuccess.status === 200, "Farmer token authorized on /api/farmer/repairs (HTTP 200)");
  } catch (e: any) {
    assert(false, `Security test crashed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Returning User Login (Mobile Number + OTP ONLY)
  // -------------------------------------------------------------------------
  console.log("\n--- 5. Testing Returning User Login (Mobile + OTP only, No Name/Address sent) ---");
  try {
    // A. Send OTP for returning user (Pawan Gupta)
    await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        phone: farmerPhone,
        role: "farmer",
      }),
    });

    // B. Returning user submits ONLY phone + OTP (registrationDetails is undefined)
    const loginRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        phone: farmerPhone,
        role: "farmer",
        otp: "123456",
        // Notice: NO registrationDetails sent!
      }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, "Returning user verified with phone + OTP only");
    assert(loginData.isNewUser === false, "Returning user correctly marked isNewUser = false");
    assert(loginData.user.name === "Pawan Gupta", "Existing user name 'Pawan Gupta' fetched from backend database");
    assert(loginData.role === "farmer", "Existing user role 'farmer' fetched from backend database");
    assert(loginData.user.address?.villageOrCity === "नागपुर", "Existing user address retrieved from backend");
  } catch (e: any) {
    assert(false, `Returning user login crashed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Unregistered User Login Attempt Rejection (404 user_not_found)
  // -------------------------------------------------------------------------
  console.log("\n--- 6. Testing Unregistered User Login Attempt ---");
  try {
    const unregPhone = "9900112233";
    await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        phone: unregPhone,
        role: "farmer",
      }),
    });

    // Submits OTP without registration details
    const unregRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        phone: unregPhone,
        role: "farmer",
        otp: "123456",
      }),
    });
    const unregData = await unregRes.json();
    assert(unregRes.status === 404, "Unregistered user login rejected with HTTP 404");
    assert(unregData.error === "user_not_found", "Error code is user_not_found");
  } catch (e: any) {
    assert(false, `Unregistered user test crashed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 7: Custom User Registration (Never assume Pawan Gupta)
  // -------------------------------------------------------------------------
  console.log("\n--- 7. Testing Custom User Registration (विक्रम सिंह) ---");
  try {
    const customPhone = "9822334455";
    await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        phone: customPhone,
        role: "farmer",
      }),
    });

    const customRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        phone: customPhone,
        role: "farmer",
        otp: "123456",
        registrationDetails: {
          name: "विक्रम सिंह",
          address: {
            villageOrCity: "अमरावती",
            district: "अमरावती",
            state: "महाराष्ट्र",
            pinCode: "444601",
          },
        },
      }),
    });
    const customData = await customRes.json();
    assert(customRes.status === 200, "Custom user registered successfully");
    assert(customData.user.name === "विक्रम सिंह", "Stored name is strictly 'विक्रम सिंह', not any hardcoded name");
    assert(customData.user.address.villageOrCity === "अमरावती", "Stored village is 'अमरावती'");
  } catch (e: any) {
    assert(false, `Custom user registration crashed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Backend Role Source of Truth (Role Spoofing Prevention)
  // -------------------------------------------------------------------------
  console.log("\n--- 5. Testing Role Spoofing Prevention on Existing Account ---");
  try {
    // The farmer 9898112233 exists as FARMER.
    // Attacker modifies frontend request to claim role = "technician".
    const res = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        phone: farmerPhone,
        role: "technician", // Spoofed role from frontend
        otp: "123456",
      }),
    });
    const data = await res.json();
    assert(
      data.role === "farmer",
      "Backend role is the source of truth: Returned role is 'farmer' despite frontend spoofing 'technician'"
    );
    assert(
      data.user.role === "farmer",
      "User profile role returned from backend is strictly 'farmer'"
    );
  } catch (e: any) {
    assert(false, `Role spoofing test crashed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Error Handling — Wrong OTP, Expired OTP & Invalid Phone
  // -------------------------------------------------------------------------
  console.log("\n--- 6. Testing Error Handling (Hindi friendly messages) ---");
  try {
    // A. Request fresh OTP first
    await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        phone: farmerPhone,
        role: "farmer",
      }),
    });

    // B. Submit wrong OTP (999999)
    const wrongRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        phone: farmerPhone,
        role: "farmer",
        otp: "999999", // Wrong OTP
      }),
    });
    const wrongData = await wrongRes.json();
    assert(wrongRes.status === 400, "Wrong OTP returned HTTP 400");
    assert(wrongData.error === "wrong_otp", "Error code is wrong_otp");
    assert(
      typeof wrongData.messageHi === "string" && wrongData.messageHi.includes("गलत OTP"),
      "Farmer-friendly Hindi message shown for wrong OTP"
    );

    // C. Expired / non-existent OTP
    const expiredRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        phone: "9800000000",
        role: "farmer",
        otp: "654321",
      }),
    });
    const expiredData = await expiredRes.json();
    assert(expiredRes.status === 400, "Expired OTP returns HTTP 400");
    assert(expiredData.error === "otp_expired", "Error code is otp_expired");

    // D. Invalid phone
    const phoneRes = await fetch(`${BASE_URL}/api/auth/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        phone: "12345", // Invalid phone
        role: "farmer",
      }),
    });
    const phoneData = await phoneRes.json();
    assert(phoneRes.status === 400, "Invalid phone returned HTTP 400");
    assert(phoneData.error === "invalid_phone", "Error code is invalid_phone");
  } catch (e: any) {
    assert(false, `Error handling test crashed: ${e.message}`);
  }

  // -------------------------------------------------------------------------
  // TEST 7: Authenticated Session Profile (/api/auth/me)
  // -------------------------------------------------------------------------
  console.log("\n--- 7. Testing Authenticated Session Profile (/api/auth/me) ---");
  try {
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${farmerToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, "/api/auth/me returned HTTP 200");
    assert(meData.user.name === "Pawan Gupta", "Authoritative profile name is Pawan Gupta");
    assert(meData.role === "farmer", "Authoritative profile role is farmer");
  } catch (e: any) {
    assert(false, `Session me test crashed: ${e.message}`);
  }

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
