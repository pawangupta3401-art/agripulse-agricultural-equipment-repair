const fs = require('fs');
const path = require('path');

const options = {
  additionalTrustedOrigins: [],
  appVersion: "1.0.0",
  appVersionCode: 1,
  backgroundColor: "#165420",
  display: "standalone",
  enableSiteSettingsShortcut: true,
  enableNotifications: true,
  includeSourceCode: false,
  fallbackType: "customtabs",
  features: {
    locationDelegation: {
      enabled: true
    },
    playBilling: {
      enabled: false
    }
  },
  host: "https://agripulse-agricultural-equipment-re.vercel.app",
  iconUrl: "https://agripulse-agricultural-equipment-re.vercel.app/icons/icon-512x512.png",
  launcherName: "AgriPulse",
  name: "AgriPulse",
  maskableIconUrl: "https://agripulse-agricultural-equipment-re.vercel.app/icons/maskable-icon.png",
  navigationColor: "#165420",
  navigationColorDark: "#165420",
  navigationDividerColor: "#165420",
  navigationDividerColorDark: "#165420",
  orientation: "portrait",
  packageId: "com.agripulse.app",
  pwaUrl: "https://agripulse-agricultural-equipment-re.vercel.app",
  shortcuts: [],
  signingMode: "new",
  signing: {
    file: null,
    alias: "agripulse",
    fullName: "AgriPulse",
    organization: "AgriPulse Farm Solutions",
    organizationalUnit: "Agricultural Equipment Repair",
    countryCode: "IN",
    keyPassword: "AgriPulse@2026",
    storePassword: "AgriPulse@2026"
  },
  splashScreenFadeOutDuration: 300,
  startUrl: "/",
  themeColor: "#165420",
  themeColorDark: "#165420",
  webManifestUrl: "https://agripulse-agricultural-equipment-re.vercel.app/manifest.json"
};

async function main() {
  console.log("Submitting AgriPulse APK build request to CloudAPK...");
  const res = await fetch("https://pwabuilder-cloudapk.azurewebsites.net/enqueuePackageJob", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "platform-identifier": "ServerUI",
      "platform-identifier-version": "1.0.0"
    },
    body: JSON.stringify(options)
  });

  if (!res.ok) {
    throw new Error(`Failed to enqueue build: ${res.status} ${res.statusText}`);
  }

  const jobId = await res.text();
  console.log(`Job enqueued successfully! Job ID: ${jobId}`);

  let completed = false;
  const startTime = Date.now();

  while (!completed) {
    await new Promise(r => setTimeout(r, 4000));
    const jobRes = await fetch("https://pwabuilder-cloudapk.azurewebsites.net/getPackageJob?id=" + encodeURIComponent(jobId));
    if (!jobRes.ok) {
      console.error(`Fetch job error: ${jobRes.status}`);
      continue;
    }

    const job = await jobRes.json();
    console.log(`[${Math.round((Date.now() - startTime) / 1000)}s] Status: ${job.status}`);

    if (job.status === "Completed") {
      completed = true;
      console.log("Build Completed! Downloading package ZIP...");
      const zipRes = await fetch("https://pwabuilder-cloudapk.azurewebsites.net/downloadPackageZip?id=" + encodeURIComponent(jobId));
      if (!zipRes.ok) {
        throw new Error(`Failed to download zip: ${zipRes.status}`);
      }

      const buffer = await zipRes.arrayBuffer();
      const outputDir = path.join(__dirname, "..", "android-apk");
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const zipPath = path.join(outputDir, "agripulse-package.zip");
      fs.writeFileSync(zipPath, Buffer.from(buffer));
      console.log(`Saved package ZIP to: ${zipPath} (${(buffer.byteLength / (1024 * 1024)).toFixed(2)} MB)`);
    } else if (job.status === "Failed") {
      console.error("Job Failed. Logs:\n", job.logs);
      process.exit(1);
    } else if (job.logs && job.logs.length > 0) {
      const lastLog = job.logs[job.logs.length - 1];
      console.log(" > " + lastLog);
    }
  }
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
