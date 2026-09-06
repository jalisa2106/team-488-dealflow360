import { SignJWT, jwtVerify } from "jose";

export interface SessionPayload {
  sub: string; // user id
  email: string;
  role: string;
  name?: string;
  [key: string]: unknown;
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is missing");
  }
  return new TextEncoder().encode(secret);
}

/**
 * Signs a JWT session token containing user identity and role.
 * Valid for 7 days by default.
 */
export async function signSession(payload: SessionPayload, expiresIn = "7d"): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({ role: payload.role, email: payload.email, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Verifies a JWT session token and returns decoded payload, or null if invalid/expired.
 */
export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return {
      sub: payload.sub as string,
      role: payload.role as string,
      email: payload.email as string,
      name: payload.name as string | undefined,
    };
  } catch {
    return null;
  }
}
