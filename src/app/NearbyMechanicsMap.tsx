/**
 * NearbyMechanicsMap — P2K Step 1 AgriPulse
 *
 * Leaflet + OpenStreetMap map showing farmer location and nearby technicians.
 *
 * - Farmer marker (blue/green) at GPS or default location
 * - Technician markers (green = available, red/grey = busy)
 * - Tap technician marker -> technician info card popup
 * - "मैकेनिक चुनें" button connects to existing job-card flow
 * - Offline: tiles fail silently, list remains usable
 * - Permission denied: falls back to default location, never crashes
 *
 * IMPORTANT: This component must be imported with next/dynamic + ssr: false
 * because Leaflet uses window/document at module load.
 */
"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, WifiOff, Loader2, Navigation, X, UserCheck, Star } from "lucide-react";
import { Technician } from "@/services/technicianData";
import { skillLabelHi } from "@/services/technicianMatchingService";
import {
  FarmerLocation,
  LocationPermissionStatus,
  requestFarmerLocation,
  getDefaultFarmerLocation,
  formatLocationSourceHi,
  calculateTechnicianDistance,
  getRouteUrl,
} from "@/services/locationService";

// Dynamically import leaflet only on client
let L: typeof import("leaflet") | null = null;

interface NearbyMechanicsMapProps {
  /** All technicians to display */
  technicians: Technician[];
  /** Whether the device is online */
  isOnline: boolean;
  /** Callback when farmer selects a technician (→ existing job-card flow) */
  onSelectTechnician: (tech: Technician) => void;
  /** Callback to close/exit the map screen */
  onClose: () => void;
  /** P2K Step 2: Callback when farmer location is updated */
  onLocationChange?: (location: FarmerLocation) => void;
  /** Existing farmer location if already acquired */
  initialFarmerLocation?: FarmerLocation | null;
}

export default function NearbyMechanicsMap({
  technicians,
  isOnline,
  onSelectTechnician,
  onClose,
  onLocationChange,
  initialFarmerLocation,
}: NearbyMechanicsMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  const [farmerLocation, setFarmerLocation] = useState<FarmerLocation | null>(
    initialFarmerLocation || null
  );
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>(
    initialFarmerLocation ? "granted" : "unknown"
  );
  const [locationMessageHi, setLocationMessageHi] = useState<string>(
    initialFarmerLocation ? "लोकेशन उपलब्ध है" : ""
  );
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [locationRequested, setLocationRequested] = useState(Boolean(initialFarmerLocation));

  /** Request GPS location */
  const handleRequestLocation = useCallback(async () => {
    setIsLoadingLocation(true);
    setLocationRequested(true);
    const result = await requestFarmerLocation();
    const loc = result.location || getDefaultFarmerLocation();
    setFarmerLocation(loc);
    setPermissionStatus(result.permissionStatus);
    setLocationMessageHi(result.messageHi);
    setIsLoadingLocation(false);
    onLocationChange?.(loc);
  }, [onLocationChange]);

  /** Use default location without GPS */
  const handleSkipLocation = useCallback(() => {
    const loc = getDefaultFarmerLocation();
    setFarmerLocation(loc);
    setPermissionStatus("denied");
    setLocationMessageHi("लोकेशन बाद में दी जा सकती है। अभी अनुमानित स्थान दिखाया जा रहा है।");
    setLocationRequested(true);
    onLocationChange?.(loc);
  }, [onLocationChange]);

  /** Initialize Leaflet map after farmer location is known */
  useEffect(() => {
    if (!farmerLocation || !mapContainerRef.current || mapInstanceRef.current) return;
    if (!isOnline) {
      setMapReady(true);
      return;
    }

    // Dynamic import Leaflet (avoids SSR issues)
    import("leaflet").then((leafletModule) => {
      const leaflet = leafletModule.default || (leafletModule as unknown as typeof import("leaflet"));
      L = leaflet;

      // Fix Leaflet default icon path issue in Next.js/webpack
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (leaflet.Icon.Default.prototype as any)._getIconUrl = undefined;
      leaflet.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = leaflet.map(mapContainerRef.current!, {
        center: [farmerLocation.latitude, farmerLocation.longitude],
        zoom: 13,
        zoomControl: true,
        attributionControl: true,
      });

      // OpenStreetMap tiles — free, no API key
      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Farmer marker (custom blue/green colour)
      const farmerIcon = leaflet.divIcon({
        html: `<div style="background:#16a34a;color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);">🧑‍🌾</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: "",
      });

      const farmerMarker = leaflet.marker(
        [farmerLocation.latitude, farmerLocation.longitude],
        { icon: farmerIcon }
      ).addTo(map);

      farmerMarker.bindPopup(
        `<div style="font-family:sans-serif;font-size:13px;font-weight:bold;">
          📍 आपका स्थान<br/>
          <span style="font-size:11px;color:#555;">${formatLocationSourceHi(farmerLocation.locationSource)}</span>
        </div>`
      );

      // Technician markers
      technicians.forEach((tech) => {
        if (tech.latitude == null || tech.longitude == null) return;

        const availColor = tech.available ? "#16a34a" : "#94a3b8";
        const availEmoji = tech.available ? "👨‍🔧" : "👨‍🔧";
        const borderColor = tech.available ? "#15803d" : "#64748b";

        const techIcon = leaflet.divIcon({
          html: `<div style="background:${availColor};color:white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid ${borderColor};box-shadow:0 2px 8px rgba(0,0,0,0.35);">${availEmoji}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          className: "",
        });

        const marker = leaflet.marker([tech.latitude, tech.longitude], { icon: techIcon }).addTo(map);

        const availText = tech.available
          ? '<span style="color:#16a34a;font-weight:bold;">🟢 उपलब्ध</span>'
          : '<span style="color:#94a3b8;font-weight:bold;">🔴 व्यस्त</span>';

        marker.bindPopup(
          `<div style="font-family:sans-serif;font-size:13px;min-width:140px;">
            <div style="font-weight:900;font-size:15px;">${tech.nameHi}</div>
            <div style="margin:4px 0;">${availText}</div>
            <div style="color:#555;font-size:11px;">📍 ${tech.distanceKm} किमी &nbsp; ⭐ ${tech.rating}</div>
          </div>`
        );

        // Click on marker → open side card
        marker.on("click", () => {
          setSelectedTech(tech);
        });
      });

      mapInstanceRef.current = map;
      setMapReady(true);
    }).catch(() => {
      // Map failed to load — app continues with list
      setMapReady(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerLocation, isOnline]);

  const availableTechs = technicians.filter((t) => t.available);
  const busyTechs = technicians.filter((t) => !t.available);

  // ─── LOCATION PERMISSION PROMPT (before showing map) ─────────────────────
  if (!locationRequested) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <MapPin className="w-6 h-6 text-emerald-700" />
            पास के मैकेनिक
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1"
            aria-label="बंद करें"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Permission request card */}
        <div className="bg-emerald-50 border-3 border-emerald-400 rounded-3xl p-6 space-y-5 text-center shadow-md">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-100 border-4 border-emerald-400 flex items-center justify-center text-3xl sm:text-4xl mx-auto shadow-inner">
            📍
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-slate-900">
              लोकेशन की अनुमति दें
            </h3>
            <p className="text-base font-bold text-slate-700 leading-relaxed">
              पास के मैकेनिक दिखाने के लिए आपकी लोकेशन चाहिए।
            </p>
            <p className="text-sm font-bold text-slate-500">
              आपकी लोकेशन केवल इस सत्र में उपयोग होगी। कहीं सेव नहीं होगी।
            </p>
          </div>
          <button
            id="map-request-location-btn"
            onClick={handleRequestLocation}
            disabled={isLoadingLocation}
            className="w-full bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] text-white font-black py-4 px-4 rounded-2xl text-lg shadow-lg border-2 border-emerald-950 flex items-center justify-center gap-2.5 transition-transform disabled:opacity-60"
          >
            {isLoadingLocation ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Navigation className="w-5 h-5" />
            )}
            <span>हाँ, लोकेशन दें</span>
          </button>
          <button
            id="map-skip-location-btn"
            onClick={handleSkipLocation}
            className="w-full py-3 text-base font-bold text-slate-600 hover:text-slate-900"
          >
            लोकेशन बाद में दें →
          </button>
        </div>
      </div>
    );
  }

  // ─── MAIN MAP VIEW ────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <MapPin className="w-6 h-6 text-emerald-700" />
          पास के मैकेनिक
        </h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-700 p-1"
          aria-label="बंद करें"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Location status bar */}
      {locationMessageHi && (
        <div className={`rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm font-bold ${
          permissionStatus === "granted"
            ? "bg-emerald-50 border border-emerald-300 text-emerald-900"
            : "bg-amber-50 border border-amber-300 text-amber-900"
        }`}>
          <MapPin className="w-4 h-4 shrink-0" />
          {locationMessageHi}
        </div>
      )}

      {/* Offline notice */}
      {!isOnline && (
        <div className="bg-amber-50 border-3 border-amber-400 rounded-2xl p-4 flex items-start gap-3">
          <WifiOff className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-black text-amber-950">
            अभी लाइव नक्शा उपलब्ध नहीं है। पहले से उपलब्ध मैकेनिक जानकारी दिखाई जा रही है।
          </p>
        </div>
      )}

      {/* Map container — hidden offline */}
      {isOnline && (
        <div className="relative rounded-2xl overflow-hidden border-3 border-slate-300 shadow-md">
          {/* Leaflet CSS */}
          <link
            rel="stylesheet"
            href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          />
          <div
            ref={mapContainerRef}
            id="agripulse-map"
            className="w-full"
            style={{ height: "280px", background: "#e8f4f8" }}
          />
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
              <div className="flex flex-col items-center gap-2 text-slate-600">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
                <span className="text-sm font-bold">नक्शा लोड हो रहा है...</span>
              </div>
            </div>
          )}
          {/* Legend */}
          <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 text-xs font-bold shadow border border-slate-200 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
              उपलब्ध
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-slate-400 inline-block" />
              व्यस्त
            </div>
          </div>
        </div>
      )}

      {/* Selected technician popup card */}
      {selectedTech && (() => {
        const distResult = calculateTechnicianDistance(selectedTech, farmerLocation);
        const routeUrl = getRouteUrl(farmerLocation, selectedTech);
        const expertise = selectedTech.primaryExpertise || `${skillLabelHi(selectedTech.skills[0])} विशेषज्ञ`;

        return (
          <div
            id="map-tech-card"
            className="bg-white border-3 border-emerald-500 rounded-3xl p-5 shadow-lg space-y-4 animate-[fadeInUp_0.2s_ease-out]"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-100 border-3 border-emerald-400 flex items-center justify-center text-2xl sm:text-3xl shadow-sm flex-shrink-0">
                👨‍🔧
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-slate-900">{selectedTech.nameHi}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-sm font-black px-2.5 py-0.5 rounded-xl border ${
                    selectedTech.available
                      ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                      : "bg-slate-100 text-slate-600 border-slate-300"
                  }`}>
                    {selectedTech.available ? "🟢 उपलब्ध" : "🔴 व्यस्त"}
                  </span>
                  <span className="text-sm font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                    📍 {distResult.displayText}
                  </span>
                  <span className="text-sm font-bold text-amber-800 flex items-center gap-0.5">
                    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    {selectedTech.rating}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedTech(null)}
                className="text-slate-400 hover:text-slate-700 p-1 -mt-1 -mr-1"
                aria-label="बंद करें"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-600">🔧 मशीन विशेषज्ञता:</span>
              <span className="text-sm font-black text-emerald-800">
                {expertise}
              </span>
            </div>

            {/* P2K Step 2: Route / Directions Button (Online only; offline gracefully displays distance) */}
            {routeUrl && isOnline ? (
              <button
                type="button"
                id="map-tech-route-btn"
                onClick={() => window.open(routeUrl, "_blank")}
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold py-3 px-4 rounded-2xl text-base border-2 border-blue-300 flex items-center justify-center gap-2 transition-colors"
              >
                <Navigation className="w-4 h-4 text-blue-700" />
                <span>रास्ता देखें (दिशा-निर्देश)</span>
              </button>
            ) : (
              <div className="text-xs font-bold text-slate-600 text-center py-2 bg-slate-50 rounded-xl border border-slate-200">
                📍 {isOnline ? `मैकेनिक का स्थान उपलब्ध (${distResult.displayText})` : `अभी लाइव दिशा-निर्देश उपलब्ध नहीं हैं। ${distResult.displayText}`}
              </div>
            )}

            <button
              id="map-select-tech-btn"
              onClick={() => onSelectTechnician(selectedTech)}
              disabled={!selectedTech.available}
              className={`w-full font-black py-4 px-4 rounded-2xl text-lg shadow-lg border-2 flex items-center justify-center gap-2.5 transition-transform active:scale-[0.98] ${
                selectedTech.available
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-950"
                  : "bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed"
              }`}
            >
              <UserCheck className="w-5 h-5" />
              <span>
                {selectedTech.available ? "मैकेनिक चुनें" : "अभी व्यस्त हैं"}
              </span>
            </button>
          </div>
        );
      })()}

      {/* Technician list (always visible — works offline) */}
      <div className="space-y-3">
        <div className="text-base font-black text-slate-700 flex items-center gap-2">
          <span>👨‍🔧</span>
          <span>उपलब्ध मैकेनिक ({availableTechs.length})</span>
        </div>

        {availableTechs.map((tech) => {
          const distResult = calculateTechnicianDistance(tech, farmerLocation);
          const expertise = tech.primaryExpertise || `${skillLabelHi(tech.skills[0])} विशेषज्ञ`;

          return (
            <button
              key={tech.id}
              id={`map-tech-list-${tech.id}`}
              type="button"
              onClick={() => setSelectedTech(tech)}
              className="w-full bg-white border-3 border-emerald-400 rounded-2xl p-4 text-left hover:border-emerald-600 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👨‍🔧</span>
                  <div>
                    <div className="text-lg font-black text-slate-900">{tech.nameHi}</div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        🔧 {expertise}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        📍 {distResult.displayText}
                      </span>
                      <span className="text-xs font-bold text-amber-800">
                        ⭐ {tech.rating}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-sm font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-xl shrink-0">
                  🟢 उपलब्ध
                </span>
              </div>
            </button>
          );
        })}

        {busyTechs.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-bold text-slate-500">अभी व्यस्त ({busyTechs.length})</div>
            {busyTechs.map((tech) => (
              <div
                key={tech.id}
                className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl p-4 flex items-center justify-between opacity-60"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl grayscale">👨‍🔧</span>
                  <div>
                    <div className="text-base font-black text-slate-700">{tech.nameHi}</div>
                    <div className="text-xs font-bold text-slate-500">
                      📍 {tech.distanceKm} किमी &nbsp; ⭐ {tech.rating}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-500 bg-slate-200 px-2 py-1 rounded-lg">
                  व्यस्त
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
