import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

// First line of defence: pages and APIs below need a valid login cookie.
// Roles, approval status and data access are checked again inside every API route.

const AUTH_COOKIE_NAME = "mruda_token";
const protectedPages = ["/dashboard", "/timesheet", "/export", "/leave", "/people"];
const publicApiRoutes = ["/api/auth/login", "/api/auth/register", "/api/auth/logout", "/api/auth/me"];

function matches(pathname, routes) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  // Never fall back to a known secret on the live site.
  if (!secret && process.env.NODE_ENV === "production") return null;
  return new TextEncoder().encode(secret || "mruda-local-development-secret");
}

async function hasValidToken(request) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const secret = getJwtSecret();

  if (!token || !secret) return false;

  try {
    await jwtVerify(token, secret);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const isProtectedPage = matches(pathname, protectedPages);
  const isProtectedApi = pathname.startsWith("/api/") && !matches(pathname, publicApiRoutes);

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  if (await hasValidToken(request)) {
    return NextResponse.next();
  }

  if (isProtectedApi) {
    return NextResponse.json({ message: "Please log in again." }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/timesheet/:path*",
    "/export/:path*",
    "/leave/:path*",
    "/people/:path*",
    "/api/:path*"
  ]
};
