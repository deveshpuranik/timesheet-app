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
      .select("name email role status createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json(
      {
        users: users.map((user) => ({
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status || "pending",
          createdAt: user.createdAt
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
