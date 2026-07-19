import { NextRequest, NextResponse } from "next/server";

import { verifySessionToken } from "@/lib/session";
import { SESSION_COOKIE_NAME } from "@/lib/sessionCookie";

const AUTH_ROUTES = ["/login"];
const AUTH_API_ROUTES = [
  "/api/auth/login",
  "/api/auth/logout",
];

function isAuthApiRoute(pathname: string) {
  return AUTH_API_ROUTES.some((route) => pathname.startsWith(route));
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("from", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function redirectByRole(request: NextRequest, role: "TEACHER" | "STUDENT") {
  const url = new URL(role === "TEACHER" ? "/teacher" : "/student", request.url);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isAuthApiRoute(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await verifySessionToken(token);

  if (pathname === "/") {
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return redirectByRole(request, user.role);
  }

  if (AUTH_ROUTES.includes(pathname)) {
    if (!user) {
      return NextResponse.next();
    }

    return redirectByRole(request, user.role);
  }

  if (pathname.startsWith("/teacher")) {
    if (!user) {
      return redirectToLogin(request);
    }

    if (user.role !== "TEACHER") {
      return NextResponse.redirect(new URL("/student", request.url));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/student")) {
    if (!user) {
      return redirectToLogin(request);
    }

    if (user.role !== "STUDENT") {
      return NextResponse.redirect(new URL("/teacher", request.url));
    }

    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    if (!user) {
      return NextResponse.json(
        { message: "Не авторизован" },
        { status: 401 }
      );
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};