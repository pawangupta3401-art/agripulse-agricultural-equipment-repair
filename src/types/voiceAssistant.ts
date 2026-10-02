import { LanguageCode } from "@/i18n";
import { UserRole } from "@/services/authService";

export type VoiceAssistantStatus =
  | "idle"
  | "requesting_mic"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

export interface VoiceHelpScreenContext {
  currentPage: string;
  selectedRole?: UserRole;
  authMode?: "login" | "register";
  currentStep?: "role_selection" | "details_input" | "otp_verification";
  language: LanguageCode;
  hasError?: boolean;
  errorMessage?: string | null;
  infoMessage?: string | null;
}

export interface VoiceHelpRequest {
  userQuery: string;
  context: VoiceHelpScreenContext;
}

export type FarmerHelpType = "machine" | "technician" | "app";

export interface VoiceHelpResponse {
  success: boolean;
  spokenText: string;
  isMachineBreakdownQuery?: boolean;
  isOffTopic?: boolean;
  fallbackUsed?: boolean;
  matchedTopic?: string;
  categoryHi?: string;
  steps?: string[];
  warning?: string;
  mechanicRequired?: boolean;
  technicianRequired?: boolean;
  helpType?: FarmerHelpType;
  clarificationNeeded?: boolean;
  recommendedMachine?: string;
  problemSummary?: string;
}
