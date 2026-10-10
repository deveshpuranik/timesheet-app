import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { normalizeDepartment } from "@/lib/timesheet";
import User from "@/models/User";

export const AUTH_COOKIE_NAME = "mruda_token";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("Please define JWT_SECRET in your environment variables.");
  }

  return new TextEncoder().encode(secret || "mruda-local-development-secret");
}

export async function signAuthToken(user) {
  return new SignJWT({
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyAuthToken(token) {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload;
  } catch {
    return null;
  }
}

// Admins are always treated as approved so they can never lock themselves out.
export function isApproved(user) {
  return Boolean(user) && (user.role === "admin" || user.status === "approved");
}

export function publicUser(user) {
  return {
    id: String(user._id || user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    department: normalizeDepartment(user.department),
    status: user.role === "admin" ? "approved" : user.status || "pending",
    createdAt: user.createdAt
  };
}

// The logged-in user, read fresh from the database on every request so that a
// rejected account or a changed role takes effect immediately.
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const payload = await verifyAuthToken(token);

  if (!payload?.id) return null;

  await dbConnect();
  const user = await User.findById(payload.id).select("-password").lean();

  if (!user) return null;

  return {
    ...user,
    _id: user._id.toString(),
    department: normalizeDepartment(user.department)
  };
}

/**
 * Guard for API routes. Returns `{ user }` when the caller is logged in, approved and
 * (optionally) has one of the given roles; otherwise `{ response }` to send back.
 */
export async function requireUser({ roles } = {}) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      response: NextResponse.json({ message: "Please log in again." }, { status: 401 })
    };
  }

  if (!isApproved(user)) {
    const message =
      user.status === "rejected"
        ? "Your account has been deactivated. Please contact the admin."
        : "Your account is waiting for admin approval.";
    return { response: NextResponse.json({ message }, { status: 403 }) };
  }

  if (roles && !roles.includes(user.role)) {
    return {
      response: NextResponse.json(
        { message: "You do not have permission to do this." },
        { status: 403 }
      )
    };
  }

  return { user };
}

export function serverError(error, fallback) {
  console.error(fallback, error);
  return NextResponse.json({ message: fallback }, { status: 500 });
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  };
}
