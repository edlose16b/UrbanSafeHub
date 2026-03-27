import { describe, expect, it } from "vitest";
import { getContributionBadge } from "./points";

describe("getContributionBadge", () => {
  it("maps totals to the expected badge thresholds", () => {
    expect(getContributionBadge(0)).toBe("neighbor");
    expect(getContributionBadge(24)).toBe("neighbor");
    expect(getContributionBadge(25)).toBe("guardian");
    expect(getContributionBadge(74)).toBe("guardian");
    expect(getContributionBadge(75)).toBe("sentinel");
    expect(getContributionBadge(149)).toBe("sentinel");
    expect(getContributionBadge(150)).toBe("city_shaper");
  });
});
