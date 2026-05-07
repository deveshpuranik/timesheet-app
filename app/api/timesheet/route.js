import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import { calculateHours, departments, getWorkTypes } from "@/lib/timesheet";
import Timesheet from "@/models/Timesheet";
import User from "@/models/User";
export async function GET(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const query = {};

    if (currentUser.role === "employee") {
      // Employee sees only their own entries
      query.userId = currentUser._id;

    } else if (currentUser.role === "supervisor") {
      if (userId) {
        // Filtering by a specific employee — verify they are actually an employee
        const targetUser = await User.findById(userId).select("role").lean();
        if (!targetUser || targetUser.role !== "employee") {
          return NextResponse.json(
            { message: "Supervisors can only view employee timesheets." },
            { status: 403 }
          );
        }
        query.userId = userId;
      } else {
        // No filter — show supervisor's OWN entries + all employee entries
        const employeeIds = await User.find({ role: "employee" })
          .select("_id")
          .lean();
        query.userId = {
          $in: [
            currentUser._id,                    // ✅ supervisor's own entries
            ...employeeIds.map((u) => u._id)    // ✅ all employee entries
          ]
        };
      }

    } else if (currentUser.role === "admin") {
      // Admin sees everything, optionally filtered
      if (userId) query.userId = userId;
    }

    const entries = await Timesheet.find(query)
      .populate({ path: "userId", model: User, select: "name email role" })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({ entries }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to fetch timesheets." },
      { status: 500 }
    );
  }
}