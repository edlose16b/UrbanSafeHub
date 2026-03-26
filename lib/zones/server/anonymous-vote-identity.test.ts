import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  buildAnonymousVoteIdentity,
  getClientIp,
} from "./anonymous-vote-identity";

describe("anonymous vote identity", () => {
  const originalEnv = process.env.ANONYMOUS_VOTE_FINGERPRINT_SALT;

  beforeEach(() => {
    process.env.ANONYMOUS_VOTE_FINGERPRINT_SALT = "test-salt";
  });

  afterEach(() => {
    process.env.ANONYMOUS_VOTE_FINGERPRINT_SALT = originalEnv;
    vi.restoreAllMocks();
  });

  it("builds a stable fingerprint for the same ip and user agent", () => {
    const first = buildAnonymousVoteIdentity({
      ip: "10.0.0.1",
      userAgent: "Mozilla/5.0 Test",
    });
    const second = buildAnonymousVoteIdentity({
      ip: "10.0.0.1",
      userAgent: "Mozilla/5.0 Test",
    });

    expect(first).toEqual(second);
  });

  it("changes the fingerprint when the ip changes", () => {
    const first = buildAnonymousVoteIdentity({
      ip: "10.0.0.1",
      userAgent: "Mozilla/5.0 Test",
    });
    const second = buildAnonymousVoteIdentity({
      ip: "10.0.0.2",
      userAgent: "Mozilla/5.0 Test",
    });

    expect(first.fingerprintHash).not.toBe(second.fingerprintHash);
    expect(first.ipHash).not.toBe(second.ipHash);
  });

  it("reads the first forwarded ip from request headers", () => {
    const request = new Request("https://example.com/api/test", {
      headers: {
        "x-forwarded-for": "200.1.1.1, 10.0.0.1",
      },
    });

    expect(getClientIp(request)).toBe("200.1.1.1");
  });
});
