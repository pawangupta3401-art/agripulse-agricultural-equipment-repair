async function verifyLiveServer() {
  const baseUrl = "http://localhost:3000";
  console.log("==================================================");
  console.log("🔍 AGRIPULSE LIVE SERVER ENDPOINT VERIFICATION");
  console.log("==================================================");

  const tests = [
    {
      name: "Homepage (GET /)",
      url: `${baseUrl}/`,
      options: { method: "GET" },
      expectedStatus: 200,
    },
    {
      name: "Auth OTP Request (POST /api/auth/otp)",
      url: `${baseUrl}/api/auth/otp`,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", phone: "9876543210", role: "farmer" }),
      },
      expectedStatus: 200,
    },
    {
      name: "Farmer Repairs Unauthorized Check (GET /api/farmer/repairs without token)",
      url: `${baseUrl}/api/farmer/repairs`,
      options: { method: "GET" },
      expectedStatus: 401,
    },
    {
      name: "Farmer Repairs Authorized Check (GET /api/farmer/repairs with farmer token)",
      url: `${baseUrl}/api/farmer/repairs`,
      options: {
        method: "GET",
        headers: { Authorization: "Bearer agri-token-farmer-9876543210-12345" },
      },
      expectedStatus: 200,
    },
    {
      name: "Create Farmer Repair (POST /api/farmer/repairs)",
      url: `${baseUrl}/api/farmer/repairs`,
      options: {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer agri-token-farmer-9876543210-12345",
        },
        body: JSON.stringify({
          machineId: "tractor",
          problemDescription: "हाइड्रोलिक लिफ्ट काम नहीं कर रही है",
          urgency: "today",
          farmerName: "पवन गुप्ता",
          farmerPhone: "9876543210",
        }),
      },
      expectedStatus: 201,
    },
    {
      name: "Technician Jobs Block Farmer Token (GET /api/technician/jobs with farmer token)",
      url: `${baseUrl}/api/technician/jobs`,
      options: {
        method: "GET",
        headers: { Authorization: "Bearer agri-token-farmer-9876543210-12345" },
      },
      expectedStatus: 403,
    },
    {
      name: "Technician Jobs Authorized (GET /api/technician/jobs with tech token)",
      url: `${baseUrl}/api/technician/jobs`,
      options: {
        method: "GET",
        headers: { Authorization: "Bearer agri-token-technician-9812345678-12345" },
      },
      expectedStatus: 200,
    },
    {
      name: "Spare Parts Catalog (GET /api/parts)",
      url: `${baseUrl}/api/parts`,
      options: { method: "GET" },
      expectedStatus: 200,
    },
    {
      name: "Service Centres & FPO (GET /api/service-centres)",
      url: `${baseUrl}/api/service-centres`,
      options: { method: "GET" },
      expectedStatus: 200,
    },
    {
      name: "Technician Training Modules (GET /api/technician/training)",
      url: `${baseUrl}/api/technician/training`,
      options: { method: "GET" },
      expectedStatus: 200,
    },
    {
      name: "Technician Certifications List (GET /api/technician/certifications)",
      url: `${baseUrl}/api/technician/certifications`,
      options: { method: "GET" },
      expectedStatus: 200,
    },
    {
      name: "Billing Settlements (GET /api/billing/settlements)",
      url: `${baseUrl}/api/billing/settlements`,
      options: { method: "GET" },
      expectedStatus: 200,
    },
    {
      name: "Billing Transaction Create (POST /api/billing/transaction)",
      url: `${baseUrl}/api/billing/transaction`,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          repairRequestId: "rep-pawan-tractor-01",
          farmerPhone: "9876543210",
          farmerName: "Pawan Gupta",
          technicianId: "tech-001",
          technicianName: "Mohan Singh",
          totalAmount: 1250,
          labourFee: 350,
          partsEstimate: 700,
          travelFee: 100,
          platformFee: 100,
        }),
      },
      expectedStatus: 201,
    },
    {
      name: "WhatsApp Webhook Token Verification (GET /api/whatsapp/webhook)",
      url: `${baseUrl}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=agripulse_verify_token_secure&hub.challenge=test_challenge_123`,
      options: { method: "GET" },
      expectedStatus: 200,
    },
    {
      name: "WhatsApp Webhook Message Processing (POST /api/whatsapp/webhook)",
      url: `${baseUrl}/api/whatsapp/webhook`,
      options: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          object: "whatsapp_business_account",
          entry: [
            {
              id: "12345",
              changes: [
                {
                  field: "messages",
                  value: {
                    messaging_product: "whatsapp",
                    metadata: { display_phone_number: "1234567890", phone_number_id: "phone_001" },
                    contacts: [{ profile: { name: "Pawan" }, wa_id: "919876543210" }],
                    messages: [
                      {
                        from: "919876543210",
                        id: "wamid.001",
                        timestamp: "1234567890",
                        type: "text",
                        text: { body: "नमस्ते" },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        }),
      },
      expectedStatus: 200,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const t of tests) {
    try {
      const res = await fetch(t.url, t.options);
      const isOk = res.status === t.expectedStatus;
      if (isOk) {
        console.log(`✓ PASS: ${t.name} -> HTTP ${res.status}`);
        passed++;
      } else {
        console.log(`✗ FAIL: ${t.name} -> Got HTTP ${res.status}, Expected ${t.expectedStatus}`);
        const body = await res.text().catch(() => "");
        console.log(`   Response: ${body.slice(0, 150)}`);
        failed++;
      }
    } catch (err) {
      console.log(`✗ ERROR: ${t.name} -> Connection error: ${err.message}`);
      failed++;
    }
  }

  console.log("==================================================");
  console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");
}

verifyLiveServer();
