import { afterEach, describe, expect, it, vi } from "vitest";
import { getAuthRedirectBaseUrl } from "./get-auth-redirect-base-url";

describe("getAuthRedirectBaseUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers the configured public site URL when it is available", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://urbansafehub.app/");

    expect(getAuthRedirectBaseUrl("https://staging.urbansafehub.app/")).toBe(
      "https://urbansafehub.app",
    );
  });

  it("falls back to the configured public site URL when the browser origin is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://urbansafehub.app/");

    expect(getAuthRedirectBaseUrl()).toBe("https://urbansafehub.app");
  });
});
