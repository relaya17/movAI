import { describe, expect, it } from "vitest";
import { isDueForLinkCheck } from "../workers/link-check.worker";

describe("isDueForLinkCheck", () => {
  const now = new Date("2026-07-08T00:00:00Z");

  it("is due when never checked before", () => {
    expect(isDueForLinkCheck(null, 7, now)).toBe(true);
  });

  it("is not due when checked recently", () => {
    const lastChecked = new Date("2026-07-05T00:00:00Z"); // 3 days ago
    expect(isDueForLinkCheck(lastChecked, 7, now)).toBe(false);
  });

  it("is due once the threshold has passed", () => {
    const lastChecked = new Date("2026-06-28T00:00:00Z"); // 10 days ago
    expect(isDueForLinkCheck(lastChecked, 7, now)).toBe(true);
  });

  it("is due exactly at the threshold boundary", () => {
    const lastChecked = new Date("2026-07-01T00:00:00Z"); // exactly 7 days ago
    expect(isDueForLinkCheck(lastChecked, 7, now)).toBe(true);
  });
});
