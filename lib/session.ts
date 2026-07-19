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

function getJwtSecret() {
  return new TextEncoder().encode(env.JWT_SECRET);
}

export async function createSessionToken(user: SessionUser) {
  const issuedAt = Math.floor(Date.now() / 1000);

  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
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
): Promise<SessionUser | null> {
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

    if (
      typeof id !== "string" ||
      typeof email !== "string" ||
      typeof name !== "string" ||
      (role !== "TEACHER" && role !== "STUDENT")
    ) {
      return null;
    }

    return {
      id,
      email,
      name,
      role,
    };
  } catch {
    return null;
  }
}