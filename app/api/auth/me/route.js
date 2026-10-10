import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  getCurrentUser,
  isApproved,
  publicUser,
  requireUser,
  serverError
} from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { departments } from "@/lib/timesheet";
import User from "@/models/User";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthenticated" }, { status: 401 });
    }

    // An account that was deactivated while logged in is signed out straight away.
    if (!isApproved(user)) {
      const response = NextResponse.json(
        { message: "Your account is not active. Please contact the admin." },
        { status: 401 }
      );
      response.cookies.set(AUTH_COOKIE_NAME, "", { path: "/", maxAge: 0 });
      return response;
    }

    return NextResponse.json({ user: publicUser(user) }, { status: 200 });
  } catch (error) {
    return serverError(error, "Unable to load your account.");
  }
}

// Lets a person who has no department yet (older accounts) choose it once.
// After that only an admin can change it, from the People page.
export async function PATCH(request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const department = String(body.department || "").trim();

    if (!departments.includes(department)) {
      return NextResponse.json(
        { message: "Please select a valid department." },
        { status: 400 }
      );
    }

    if (user.department) {
      return NextResponse.json(
        { message: "Your department is already set. Ask the admin to change it." },
        { status: 403 }
      );
    }

    await dbConnect();
    const updated = await User.findByIdAndUpdate(
      user._id,
      { $set: { department } },
      { returnDocument: "after" }
    ).lean(); // publicUser() below never includes the password

    return NextResponse.json(
      { message: "Department saved.", user: publicUser(updated) },
      { status: 200 }
    );
  } catch (error) {
    return serverError(error, "Unable to save your department.");
  }
}
