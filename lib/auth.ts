import { cookies } from "next/headers";

import { verifySessionToken } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/sessionCookie";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  return verifySessionToken(token);
}