import { describe, expect, it } from "vitest";
import { canStartDubbing, getDubbingGate } from "../dubbing";

describe("getDubbingGate", () => {
  it("allows public-domain archive items", () => {
    const gate = getDubbingGate({ kind: "archive", identifier: "x", license: "public-domain" });
    expect(gate.eligibility).toBe("allowed");
    expect(canStartDubbing(gate, false)).toBe(true);
  });

  it("requires permission for cc-by", () => {
    const gate = getDubbingGate({ kind: "archive", identifier: "x", license: "cc-by" });
    expect(gate.eligibility).toBe("permission_required");
    expect(canStartDubbing(gate, false)).toBe(false);
    expect(canStartDubbing(gate, true)).toBe(true);
  });

  it("blocks YouTube", () => {
    const gate = getDubbingGate({ kind: "youtube", videoId: "abc", channelTitle: "Ch" });
    expect(gate.eligibility).toBe("blocked");
  });
});
