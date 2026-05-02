import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import User from "@/models/User";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const users = await User.find({})
      .select("name email role status")
      .sort({ name: 1 })
      .lean();

    return NextResponse.json(
      {
        users: users.map((user) => ({
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status || "pending"
        }))
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to fetch users." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { name, email, password, role = "employee" } = await request.json();

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json(
        { message: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (!["admin", "employee"].includes(role)) {
      return NextResponse.json({ message: "Invalid user role." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    await dbConnect();

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail }).lean();

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 12),
      role,
      status: "approved"
    });

    return NextResponse.json(
      {
        message: "User created successfully.",
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status
        }
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to create user." },
      { status: 500 }
    );
  }
}
