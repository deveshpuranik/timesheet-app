import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import User from "@/models/User";

export async function PATCH(request, context) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (currentUser.role !== "admin") {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const { status } = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid user id." }, { status: 400 });
    }

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        { message: "Status must be approved or rejected." },
        { status: 400 }
      );
    }

    if (id === currentUser._id && status === "rejected") {
      return NextResponse.json(
        { message: "You cannot reject your own admin account." },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    )
      .select("name email role status createdAt")
      .lean();

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        message: `User ${status} successfully.`,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          createdAt: user.createdAt
        }
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to update user status." },
      { status: 500 }
    );
  }
}
