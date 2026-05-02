import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import dbConnect from "@/lib/dbConnect";
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
    _id: user._id.toString()
  };
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
