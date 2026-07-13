import { jwtVerify, SignJWT } from "jose";

export const AUTH_COOKIE_NAME = "exam_platform_token";

export type SessionUserRole = "TEACHER" | "STUDENT";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: SessionUserRole;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is not defined");
  }

  return new TextEncoder().encode(secret);
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifySessionToken(
  token: string | undefined
): Promise<SessionUser | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());

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