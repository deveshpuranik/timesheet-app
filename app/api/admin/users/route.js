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

    const isPrivileged = ["admin", "supervisor"].includes(currentUser.role);
    if (!isPrivileged) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await dbConnect();

    // ✅ Supervisor sees ONLY employees in the dropdown
    // ✅ Admin sees everyone
    const roleFilter = currentUser.role === "supervisor"
      ? { role: "employee" }
      : {};

    const users = await User.find(roleFilter)
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