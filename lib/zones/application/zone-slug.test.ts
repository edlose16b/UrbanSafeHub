import { describe, expect, it } from "vitest";
import {
  buildZonePath,
  buildZoneSlug,
  parseZoneSlug,
  resolveZonePathSelection,
  slugifyZoneName,
} from "./zone-slug";

describe("zone-slug", () => {
  it("slugifies names with accents and punctuation", () => {
    expect(slugifyZoneName("Paradero Universitaria, Lima!")).toBe(
      "paradero-universitaria-lima",
    );
    expect(slugifyZoneName("Ñ")).toBe("n");
  });

  it("builds a stable slug with the zone id suffix", () => {
    expect(
      buildZoneSlug({
        id: "zone-123",
        name: "Cruce Av. Perú / Túpac Amaru",
      }),
    ).toBe("cruce-av-peru-tupac-amaru--zone-123");
  });

  it("parses the generated slug back to zone id and name slug", () => {
    expect(parseZoneSlug("paradero-universitaria--zone-123")).toEqual({
      zoneId: "zone-123",
      nameSlug: "paradero-universitaria",
    });
  });

  it("builds a path with locale and stable slug", () => {
    expect(
      buildZonePath("es", {
        id: "zone-123",
        name: "Paradero Universitaria",
      }),
    ).toBe("/es/paradero-universitaria--zone-123");
  });

  it("resolves a zone selection from pathname", () => {
    expect(
      resolveZonePathSelection("/es/paradero-universitaria--zone-123", "es"),
    ).toEqual({
      zoneId: "zone-123",
      zoneSlug: "paradero-universitaria--zone-123",
    });
    expect(resolveZonePathSelection("/es", "es")).toBeNull();
  });

  it("rejects invalid slug values", () => {
    expect(parseZoneSlug("")).toBeNull();
    expect(parseZoneSlug("zone-123")).toBeNull();
    expect(parseZoneSlug("--zone-123")).toBeNull();
    expect(parseZoneSlug("paradero-universitaria--")).toBeNull();
    expect(resolveZonePathSelection("/es/slug-invalido", "es")).toBeNull();
  });
});
