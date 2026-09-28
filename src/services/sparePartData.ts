/**
 * Spare Part Data — P2F AgriPulse
 *
 * Local mock inventory. No real supplier API.
 * Offline-safe: all data is in-process.
 */

export type PartCategory =
  | "Engine"
  | "Filter"
  | "Electrical"
  | "Seals & Pipes"
  | "Sprayer"
  | "Belt & Drive";

export type MachineCompatibility =
  | "Tractor"
  | "Sprayer"
  | "Water Pump"
  | "Power Tiller"
  | "All";

export interface SparePart {
  id: string;
  /** Hindi part name shown to farmer */
  nameHi: string;
  /** English reference name */
  name: string;
  /** Part code for mock inventory */
  partCode: string;
  category: PartCategory;
  compatibleMachines: MachineCompatibility[];
  available: boolean;
  quantity: number; // units in mock stock
  estimatedPrice: number; // ₹
}

export const mockSpareParts: SparePart[] = [
  {
    id: "part-001",
    nameHi: "इंजन ऑयल",
    name: "Engine Oil",
    partCode: "EO-15W40-001",
    category: "Engine",
    compatibleMachines: ["Tractor", "Power Tiller", "Water Pump"],
    available: true,
    quantity: 12,
    estimatedPrice: 480,
  },
  {
    id: "part-002",
    nameHi: "ऑयल फ़िल्टर",
    name: "Oil Filter",
    partCode: "OF-UNI-002",
    category: "Filter",
    compatibleMachines: ["Tractor", "Power Tiller"],
    available: true,
    quantity: 8,
    estimatedPrice: 220,
  },
  {
    id: "part-003",
    nameHi: "एयर फ़िल्टर",
    name: "Air Filter",
    partCode: "AF-DRY-003",
    category: "Filter",
    compatibleMachines: ["Tractor", "Sprayer", "Power Tiller"],
    available: true,
    quantity: 5,
    estimatedPrice: 350,
  },
  {
    id: "part-004",
    nameHi: "स्पार्क प्लग",
    name: "Spark Plug",
    partCode: "SP-NGK-004",
    category: "Electrical",
    compatibleMachines: ["Power Tiller", "Sprayer"],
    available: true,
    quantity: 20,
    estimatedPrice: 90,
  },
  {
    id: "part-005",
    nameHi: "बेल्ट",
    name: "Drive Belt",
    partCode: "BT-VEE-005",
    category: "Belt & Drive",
    compatibleMachines: ["Tractor", "Water Pump", "Power Tiller"],
    available: true,
    quantity: 6,
    estimatedPrice: 650,
  },
  {
    id: "part-006",
    nameHi: "पंप सील",
    name: "Pump Seal Kit",
    partCode: "PS-KIT-006",
    category: "Seals & Pipes",
    compatibleMachines: ["Water Pump", "Sprayer"],
    available: true,
    quantity: 4,
    estimatedPrice: 180,
  },
  {
    id: "part-007",
    nameHi: "नोज़ल",
    name: "Sprayer Nozzle",
    partCode: "NZ-FLT-007",
    category: "Sprayer",
    compatibleMachines: ["Sprayer"],
    available: true,
    quantity: 15,
    estimatedPrice: 75,
  },
  {
    id: "part-008",
    nameHi: "बैटरी",
    name: "Battery 12V",
    partCode: "BAT-12V-008",
    category: "Electrical",
    compatibleMachines: ["Tractor", "Power Tiller"],
    available: false, // intentionally unavailable for test D
    quantity: 0,
    estimatedPrice: 3200,
  },
  {
    id: "part-009",
    nameHi: "फ्यूज़",
    name: "Fuse Set",
    partCode: "FZ-SET-009",
    category: "Electrical",
    compatibleMachines: ["Tractor", "Sprayer", "Power Tiller"],
    available: true,
    quantity: 30,
    estimatedPrice: 35,
  },
  {
    id: "part-010",
    nameHi: "पाइप",
    name: "Rubber Pipe",
    partCode: "PP-RBR-010",
    category: "Seals & Pipes",
    compatibleMachines: ["Water Pump", "Sprayer", "All"],
    available: true,
    quantity: 10,
    estimatedPrice: 120,
  },
  {
    id: "part-011",
    nameHi: "रेडिएटर कैप",
    name: "Radiator Cap",
    partCode: "RC-STD-011",
    category: "Engine",
    compatibleMachines: ["Tractor"],
    available: true,
    quantity: 3,
    estimatedPrice: 95,
  },
  {
    id: "part-012",
    nameHi: "कूलेंट",
    name: "Engine Coolant",
    partCode: "CL-GRN-012",
    category: "Engine",
    compatibleMachines: ["Tractor", "Power Tiller"],
    available: false, // intentionally unavailable
    quantity: 0,
    estimatedPrice: 310,
  },
];

/** Quick lookup by part ID */
export function getSparePartById(id: string): SparePart | null {
  return mockSpareParts.find((p) => p.id === id) || null;
}
