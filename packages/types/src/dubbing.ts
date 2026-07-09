import type { WatchSource } from "./watch-source";

export type DubbingEligibility = "allowed" | "permission_required" | "blocked";

export interface DubbingGateResult {
  eligibility: DubbingEligibility;
  /** Human-readable reason for UI (Hebrew-first copy lives in i18n; this is a machine key). */
  reasonKey: string;
}

/**
 * Legal gate before any AI dubbing. Only clearly licensed catalog items may be
 * dubbed automatically; CC-BY and unknown licenses require an explicit
 * permission request reviewed by MoVAI.
 */
export function getDubbingGate(watchSource: WatchSource): DubbingGateResult {
  if (watchSource.kind === "archive") {
    switch (watchSource.license) {
      case "public-domain":
      case "cc0":
        return { eligibility: "allowed", reasonKey: "publicDomain" };
      case "cc-by":
      case "cc-by-sa":
        return { eligibility: "permission_required", reasonKey: "ccLicense" };
      case "unknown":
        return { eligibility: "permission_required", reasonKey: "unknownLicense" };
    }
  }

  if (watchSource.kind === "youtube") {
    return { eligibility: "blocked", reasonKey: "youtubeNoRights" };
  }

  if (watchSource.kind === "instagram") {
    return { eligibility: "blocked", reasonKey: "instagramNoRights" };
  }

  return { eligibility: "blocked", reasonKey: "externalNoRights" };
}

export function canStartDubbing(gate: DubbingGateResult, hasApprovedPermission: boolean): boolean {
  if (gate.eligibility === "allowed") return true;
  if (gate.eligibility === "permission_required" && hasApprovedPermission) return true;
  return false;
}
