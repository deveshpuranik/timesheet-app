import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { publicUser, requireUser, serverError } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { notifyUsers } from "@/lib/notify";
import { departments, roles } from "@/lib/timesheet";
import User from "@/models/User";

// Admin only: approve / deactivate an account, change role or department, reset password.
export async function PATCH(request, context) {
  try {
    const { user: admin, response } = await requireUser({ roles: ["admin"] });
    if (response) return response;

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Person not found." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const update = {};
    const isSelf = id === admin._id;

    if (body.status !== undefined) {
      if (!["approved", "rejected"].includes(body.status)) {
        return NextResponse.json(
          { message: "Status must be approved or rejected." },
          { status: 400 }
        );
      }
      if (isSelf && body.status === "rejected") {
        return NextResponse.json(
          { message: "You cannot deactivate your own account." },
          { status: 400 }
        );
      }
      update.status = body.status;
    }

    if (body.role !== undefined) {
      if (!roles.includes(body.role)) {
        return NextResponse.json({ message: "Please select a valid role." }, { status: 400 });
      }
      if (isSelf && body.role !== "admin") {
        return NextResponse.json(
          { message: "You cannot remove your own admin access." },
          { status: 400 }
        );
      }
      update.role = body.role;
    }

    if (body.department !== undefined) {
      if (!departments.includes(body.department)) {
        return NextResponse.json(
          { message: "Please select a valid department." },
          { status: 400 }
        );
      }
      update.department = body.department;
    }

    if (body.password !== undefined) {
      if (String(body.password).length < 6) {
        return NextResponse.json(
          { message: "Password must be at least 6 characters." },
          { status: 400 }
        );
      }
      update.password = await bcrypt.hash(String(body.password), 12);
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ message: "Nothing to update." }, { status: 400 });
    }

    await dbConnect();

    const before = await User.findById(id).select("status role").lean();
    if (!before) {
      return NextResponse.json({ message: "Person not found." }, { status: 404 });
    }

    // Admin accounts are always active, so deactivating one means changing the role first.
    const roleAfter = update.role || before.role;
    if (roleAfter === "admin") {
      if (update.status === "rejected") {
        return NextResponse.json(
          { message: "Change this person's role before deactivating an admin account." },
          { status: 400 }
        );
      }
      update.status = "approved";
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { $set: update },
      { returnDocument: "after", runValidators: true }
    ).lean(); // publicUser() below never includes the password

    if (update.status === "approved" && before.status !== "approved") {
      await notifyUsers([id], {
        type: "account_approved",
        title: "Your account is approved",
        message: "Welcome! You can now fill in your timesheet and request leave.",
        link: "/timesheet"
      });
    }

    let message = `${updated.name} has been updated.`;
    if (update.password) message = `Password reset for ${updated.name}.`;
    else if (update.status === "approved" && before.status !== "approved")
      message = `${updated.name} is approved.`;
    else if (update.status === "rejected") message = `${updated.name} is deactivated.`;

    return NextResponse.json({ message, user: publicUser(updated) }, { status: 200 });
  } catch (error) {
    return serverError(error, "Unable to update this person.");
  }
}
