import { jwtVerify, SignJWT } from "jose";

import { env } from "@/lib/env";
import { SESSION_TTL_SECONDS } from "@/lib/sessionCookie";

export type SessionUserRole = "TEACHER" | "STUDENT";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: SessionUserRole;
};

export type SessionTokenUser = SessionUser & {
  sessionVersion: number;
};

function getJwtSecret() {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function createSessionToken(user: SessionTokenUser) {
  const issuedAt = Math.floor(Date.now() / 1000);

  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sessionVersion: user.sessionVersion,
  })
    .setProtectedHeader({
      alg: "HS256",
      typ: "JWT",
    })
    .setIssuedAt(issuedAt)
    .setExpirationTime(issuedAt + SESSION_TTL_SECONDS)
    .sign(getJwtSecret());
}

export async function verifySessionToken(
  token: string | undefined
): Promise<SessionTokenUser | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });

    const id = payload.id;
    const email = payload.email;
    const name = payload.name;
    const role = payload.role;
    const sessionVersion = payload.sessionVersion;

    if (
      typeof id !== "string" ||
      typeof email !== "string" ||
      typeof name !== "string" ||
      typeof sessionVersion !== "number" ||
      !Number.isInteger(sessionVersion) ||
      sessionVersion < 0 ||
      (role !== "TEACHER" && role !== "STUDENT")
    ) {
      return null;
    }

    return {
      id,
      email,
      name,
      role,
      sessionVersion,
    };
  } catch {
    return null;
  }
}
