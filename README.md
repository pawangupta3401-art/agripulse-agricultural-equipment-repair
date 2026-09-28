# AgriPulse (एग्रीपल्स) — One-Stop Agricultural Equipment Repair Platform

> **Nagpur RISE 2026 Challenge Submission**  
> *"Unified, Affordable, and Reliable Agricultural Machine Care for Every Indian Farmer"*

---

## 🌾 Overview

AgriPulse is a mission-critical agricultural equipment repair and maintenance platform engineered for Indian smallholder farmers, local mechanics, FPOs, and service centres. 

It addresses the fundamental rural problem: **When farm machinery breaks down during critical agricultural windows (such as sowing or harvesting), days of downtime lead to massive crop and financial loss.**

AgriPulse delivers a complete, end-to-end ecosystem:
- **Smartphone Web Application:** Ultra-accessible Hindi UI with audio narration, large tap targets, and voice/photo problem reporting.
- **Feature-Phone & Normal Mobile Access:** Interactive voice response (IVR) keypad flow (Toll-Free 1800-AGRI-HELP) and SMS notifications for non-smartphone farmers.
- **Assisted Access via FPOs & Cooperatives:** Single-desk operator portal enabling village agents to book repairs on behalf of illiterate or disconnected farmers into the exact same central pipeline.
- **AI-Assisted Diagnostic Support:** Real-time problem interpretation, photographic visual inspection, and honest confidence calibration ("संभावित समस्या", "तकनीशियन द्वारा प्रत्यक्ष जांच आवश्यक").
- **AgriPulse Recovery Engine (Signature Feature):** Synthesizes machine downtime, critical farm windows ("कल बुवाई शुरू"), technician skills, spare parts availability, workshop facilities, and transparent costs to generate practical recovery plans (⚡ सबसे त्वरित, 🏪 नजदीकी सर्विस सेंटर, 💰 किफायती विकल्प).
- **Verified Technician Network:** Equipment-level skill certification (Tractor, Hydraulic, Electrical) with verifiable credentials, avoiding false certification claims.
- **Local Service Centre & FPO Network:** Integrates local workshops, FPOs, and cooperatives with transparent inventory and ₹0 doorstep travel charges for workshop walk-ins.
- **Transparent Pricing System:** Itemized pre-repair estimates (Diagnostic + Labour + Parts + Travel - Subsidies = Total) and tamper-proof price change audit logs with mandatory farmer-facing reasons.
- **Interactive Job Cards & Repair Tracking:** Step-by-step lifecycle tracking (मैकेनिक नियुक्त ➔ रास्ते में ➔ पहुँच गया ➔ मरम्मत जारी ➔ मशीन जांच बाकी).
- **Farmer-Led Repair Verification:** The farmer validates machine operation before completion; failed verifications automatically trigger re-repair without losing audit history.
- **Machine Passport & Preventive Maintenance:** Tamper-evident lifecycle digital ledger recording all past services, replaced parts, and automated service reminders.
- **Offline-First Foundation:** IndexedDB/localStorage offline storage and background synchronization when connectivity returns — zero data loss.

---

## 🏛️ Core System Architecture

All access channels feed into **ONE COMMON REPAIR PIPELINE**:

```
      Smartphone App             Feature Phone / IVR            FPO / Assisted Desk
    (Voice / Photo / Text)       (Toll-Free 1800 Keypad)         (Operator Portal)
              │                             │                            │
              └─────────────────────────────┼────────────────────────────┘
                                            ▼
                                COMMON COMPLAINT MODEL
                                 (channel: APP | PHONE | ASSISTED)
                                            │
                                            ▼
                                  AI-ASSISTED DIAGNOSIS
                               ("संभावित समस्या" & Confidence)
                                            │
                                            ▼
                                  CRITICAL FARM WINDOW
                             (Urgency: "कल बुवाई का दिन")
                                            │
                                            ▼
                                 AGRIPULSE RECOVERY ENGINE
                             (Fastest | Nearest Centre | Low Cost)
                                            │
                                            ▼
                                 VERIFIED TECHNICIAN & FPO
                               (Certification & Skills Match)
                                            │
                                            ▼
                                   TRANSPARENT PRICING
                             (Diagnostic + Labour + Parts + Travel)
                                            │
                                            ▼
                                      JOB CARD CREATED
                                            │
                                            ▼
                                  5-STAGE REPAIR TRACKING
                                (Assigned ➔ En Route ➔ Repairing)
                                            │
                                            ▼
                                   FARMER VERIFICATION
                                (हाँ, मशीन ठीक है / समस्या बाकी है)
                                            │
                                            ▼
                                     MACHINE PASSPORT
                                 (Tamper-Evident History)
                                            │
                                            ▼
                                  PREVENTIVE MAINTENANCE
                               (Seasonal Checklist Reminders)
```

---

## 🚀 Quick Start & Setup

### Prerequisites
- Node.js (v18.17.0 or higher recommended)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/agripulse.git
   cd agripulse
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file based on `.env.example`:
   ```bash
   cp .env.example .env.local
   ```
   *(AgriPulse operates completely out of the box with offline mock engines. Optional Gemini API keys can be supplied for live LLM vision diagnostics without breaking offline fallbacks).*

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Run the Automated P2Q & P2P Test Suite:**
   ```bash
   npx tsx src/tests/test_p2q_recovery_and_channels.ts
   ```

6. **Create a Production Build:**
   ```bash
   npm run build
   npm start
   ```

---

## 🎯 1-Click Hackathon Demo Scenario (3–5 Minutes)

AgriPulse includes a dedicated **1-Click Hackathon Demo Scenario** right on the Home screen:

1. **Launch:** Tap **"🎯 डेमो शुरू करें (3–5 Min Flow)"** on the Home screen.
2. **Context:** Equipment is **Tractor (महिंद्रा 575 DI)**; complaint is **"ट्रैक्टर की हाइड्रोलिक लिफ्ट नहीं उठ रही, कल बुवाई शुरू करनी है"**; Urgency is set to **आज ही (Today)**.
3. **AI Interpretation:** Tap **"आगे बढ़ें"**. The AI diagnosis identifies possible hydraulic valve pressure drop ("संभावित समस्या") with high confidence and displays an honest physical inspection disclaimer.
4. **Recovery Engine:** Tap **"मशीन रिकवरी योजना देखें"**. The Recovery Engine detects the Critical Farm Window (कल बुवाई) and presents 3 practical options:
   - ⚡ **सबसे तेज (Fastest):** Doorstep repair by Mohan Singh (certified hydraulic tech, 3.8 km away, ~2 hours).
   - 🏪 **नजदीकी सर्विस सेंटर (Nearest Centre):** Nagpur Kisan FPO Workshop (in-house spare parts in stock, 5.2 km away, ₹0 travel fee).
   - 💰 **किफायती विकल्प (Lowest Cost):** Vidarbha Sahakari Workshop (with cooperative subsidy).
5. **Transparent Pricing:** Review the transparent breakdown (Diagnostic: ₹150 + Labour: ₹350 + Parts: ₹450 + Travel: ₹100 = ₹1,050).
6. **Confirmation & Job Card:** Tap **"✓ यह विकल्प चुनें और जॉब कार्ड बनाएं"**. Job card is created; SMS is dispatched to the farmer.
7. **Live Progression:** Step through technician progress:
   - *मैकेनिक रास्ते में निकला ➔*
   - *मैकेनिक पहुँच गया ➔*
   - *मरम्मत शुरू करें ➔*
   - *मरम्मत पूरी हुई ➔*
8. **Farmer Verification:** Tap **"मशीन की जाँच करें"**. Tap **"✅ हाँ, मशीन ठीक है"**.
9. **Machine Passport:** The digital passport updates with the verification ID, technician name, and final invoice.
10. **Preventive Maintenance:** View upcoming seasonal service dates and maintenance checklists.

---

## 📞 Multi-Channel & Non-Smartphone Access

### 1. Feature-Phone / IVR Keypad Simulator
- Tap **"📞 फीचर फोन / IVR"** on the Home screen.
- Emulates a farmer dialing **1800-AGRI-HELP** on a basic mobile:
  - `1`: Machine repair (1: Tractor, 2: Sprayer, 3: Pump, 4: Tiller, 5: Harvester, 6: Other).
  - `2`: Check complaint status ("Technician assigned", "Repair in progress", etc.).
  - `3`: Direct call to certified mechanic.
  - `4`: Seasonal maintenance packages (Basic ₹399, Pre-sowing ₹899, Comprehensive ₹1999).
- Submitting via IVR automatically tags the complaint as `channel: "PHONE"` and creates a backend record with an SMS alert.

### 2. Assisted Access via FPO / Cooperative Desk
- Tap **"🌾 FPO डेस्क"** on the Home screen.
- Village cooperative operators log complaints on behalf of farmers who cannot read or do not own a phone.
- Tags the complaint as `channel: "ASSISTED"`, attaches operator metadata, and immediately generates an AgriPulse Recovery Plan.

### 3. SMS Notification Log Drawer
- Tap **"📱 SMS इतिहास"** to view real-time dispatched SMS notifications across the complaint lifecycle.
- *Notice:* Labeled clearly as **"प्रोटोटाइप / डेमो सिमुलेशन"** (no fraudulent claims of live telecom gateways).

---

## 🔒 Security & Data Integrity

- **Zero Hardcoded Secrets:** No API keys or credentials committed to the codebase.
- **Safe Environment Fallbacks:** If `GEMINI_API_KEY` is not provided, the local offline heuristic engine seamlessly runs without failing or throwing raw technical errors.
- **Tamper-Evident Certification:** Technicians cannot self-verify certifications; all submissions remain in `verificationStatus: "pending"` review state. Self-declared skills are segregated from verified skills.
- **Transparent Billing Auditing:** Any change to price estimates requires a mandatory farmer-facing reason selection (`PRICE_CHANGE_REASONS`) and cannot be altered silently.

---

## 📄 License & Attribution

Developed for the **Nagpur RISE 2026 Hackathon** — *One-Stop Agricultural Equipment Repair Platform*.  
Licensed under the MIT License.
#   a g r i p u l s e - f a r m - r e p a i r  
 