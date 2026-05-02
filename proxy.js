import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const AUTH_COOKIE_NAME = "mruda_token";
const protectedRoutes = ["/dashboard", "/timesheet", "/export"];
const protectedApiRoutes = ["/api/timesheet", "/api/export", "/api/users", "/api/admin"];
const adminApiRoutes = ["/api/admin"];

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || "mruda-local-development-secret";
  return new TextEncoder().encode(secret);
}

async function hasValidToken(request) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) return false;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload;
  } catch {
    return null;
  }
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const isProtectedPage = protectedRoutes.some((route) => pathname.startsWith(route));
  const isProtectedApi = protectedApiRoutes.some((route) => pathname.startsWith(route));

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  const user = await hasValidToken(request);

  if (user && adminApiRoutes.some((route) => pathname.startsWith(route)) && user.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (user) {
    return NextResponse.next();
  }

  if (isProtectedApi) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/dashboard/:path*", "/timesheet/:path*", "/export/:path*", "/api/:path*"]
};
