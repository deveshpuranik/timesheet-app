import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { AUTH_COOKIE_NAME, authCookieOptions, signAuthToken } from "@/lib/auth";
import User from "@/models/User";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email?.trim() || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return NextResponse.json({ message: "Invalid login credentials." }, { status: 401 });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);

    if (!passwordMatches) {
      return NextResponse.json({ message: "Invalid login credentials." }, { status: 401 });
    }

    if (!user.status) {
      user.status = user.role === "admin" ? "approved" : "pending";
      await user.save();
    }
    const token = await signAuthToken(user);
    const response = NextResponse.json(
      {
        message: "Logged in successfully.",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        }
      },
      { status: 200 }
    );

    response.cookies.set(AUTH_COOKIE_NAME, token, authCookieOptions());
    return response;
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to login." },
      { status: 500 }
    );
  }
}
