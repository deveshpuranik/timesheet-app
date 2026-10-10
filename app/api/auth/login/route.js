import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  publicUser,
  serverError,
  signAuthToken
} from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json(
        { message: "Incorrect email or password." },
        { status: 401 }
      );
    }

    // Accounts created before approvals existed have no status yet.
    if (!user.status || (user.role === "admin" && user.status !== "approved")) {
      user.status = user.role === "admin" ? "approved" : "pending";
      await user.save();
    }

    // Only approved accounts may enter. (Checked after the password so that
    // nobody can discover an account's status without knowing its password.)
    if (user.status === "pending") {
      return NextResponse.json(
        { message: "Your account is waiting for admin approval. Please try again later." },
        { status: 403 }
      );
    }

    if (user.status === "rejected") {
      return NextResponse.json(
        { message: "Your account is not active. Please contact the admin." },
        { status: 403 }
      );
    }

    const token = await signAuthToken(user);
    const response = NextResponse.json(
      { message: "Logged in successfully.", user: publicUser(user) },
      { status: 200 }
    );

    response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions());
    return response;
  } catch (error) {
    return serverError(error, "Unable to log in right now. Please try again.");
  }
}
