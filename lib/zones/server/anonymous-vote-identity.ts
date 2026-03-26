import { createHash } from "node:crypto";

type AnonymousVoteIdentity = {
  fingerprintHash: string;
  ipHash: string | null;
  userAgentHash: string | null;
};

const FALLBACK_SALT = "urban-safehub-anonymous-vote-dev-salt";

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function getFingerprintSalt(): string {
  const explicitSalt = process.env.ANONYMOUS_VOTE_FINGERPRINT_SALT?.trim();

  if (explicitSalt) {
    return explicitSalt;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing ANONYMOUS_VOTE_FINGERPRINT_SALT for anonymous vote identity hashing.",
    );
  }

  return FALLBACK_SALT;
}

export function getClientIp(request: Request): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const [firstIp] = forwardedFor.split(",");
    const candidate = firstIp?.trim();

    if (candidate) {
      return candidate;
    }
  }

  const realIp = request.headers.get("x-real-ip")?.trim();

  return realIp || null;
}

export function buildAnonymousVoteIdentity(
  input: {
    ip: string | null;
    userAgent: string | null;
  },
): AnonymousVoteIdentity {
  const salt = getFingerprintSalt();
  const normalizedIp = input.ip?.trim() || "";
  const normalizedUserAgent = input.userAgent?.trim() || "";

  const ipHash = normalizedIp ? hashValue(`${salt}:ip:${normalizedIp}`) : null;
  const userAgentHash = normalizedUserAgent
    ? hashValue(`${salt}:ua:${normalizedUserAgent}`)
    : null;
  const fingerprintHash = hashValue(
    `${salt}:fingerprint:${normalizedIp}::${normalizedUserAgent}`,
  );

  return {
    fingerprintHash,
    ipHash,
    userAgentHash,
  };
}
