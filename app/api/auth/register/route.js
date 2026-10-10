import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { publicUser, serverError } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { notifyRoles } from "@/lib/notify";
import { departments } from "@/lib/timesheet";
import User from "@/models/User";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    const department = String(body.department || "").trim();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json(
        { message: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!departments.includes(department)) {
      return NextResponse.json(
        { message: "Please select your department." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    await dbConnect();

    const existingUser = await User.findOne({ email }).lean();

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // Public sign-ups are always employees waiting for approval; an admin sets roles.
    const user = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role: "employee",
      department,
      status: "pending"
    });

    await notifyRoles(["admin"], {
      type: "signup",
      title: "New signup waiting for approval",
      message: `${user.name} (${department}) has registered.`,
      link: "/people"
    });

    return NextResponse.json(
      {
        message:
          "Account created. You can log in as soon as the admin approves your account.",
        user: publicUser(user)
      },
      { status: 201 }
    );
  } catch (error) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      );
    }
    return serverError(error, "Unable to register right now. Please try again.");
  }
}
