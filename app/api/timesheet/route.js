import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import { calculateHours, departments, getWorkTypes } from "@/lib/timesheet";
import Timesheet from "@/models/Timesheet";
import User from "@/models/User";

export async function POST(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { entries } = body;

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ message: "No entries provided." }, { status: 400 });
    }

    for (let i = 0; i < entries.length; i++) {
      const { department, date, fromTime, toTime, workType } = entries[i];
      const label = `Entry ${i + 1}`;

      if (!department || !date || !fromTime || !toTime || !workType) {
        return NextResponse.json(
          { message: `${label}: Please fill all required fields.` },
          { status: 400 }
        );
      }
      if (!departments.includes(department)) {
        return NextResponse.json(
          { message: `${label}: Please select a valid department.` },
          { status: 400 }
        );
      }
      if (!getWorkTypes(department).includes(workType)) {
        return NextResponse.json(
          { message: `${label}: Please select a valid work type for this department.` },
          { status: 400 }
        );
      }
      if (calculateHours(fromTime, toTime) <= 0) {
        return NextResponse.json(
          { message: `${label}: "To" time must be later than "From" time.` },
          { status: 400 }
        );
      }
    }

    await dbConnect();

    const docs = entries.map((e) => ({
      userId: currentUser._id,
      name: currentUser.name,
      department: e.department,
      date: e.date,
      fromTime: e.fromTime,
      toTime: e.toTime,
      hours: calculateHours(e.fromTime, e.toTime),
      workType: e.workType,
      workDetails: e.workDetails || ""
    }));

    const saved = await Timesheet.insertMany(docs);

    return NextResponse.json(
      {
        message: `${saved.length} timesheet ${saved.length === 1 ? "entry" : "entries"} saved successfully.`,
        entries: saved
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to save timesheet." },
      { status: 500 }
    );
  }
}

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
      // Supervisor sees only employee entries, optionally filtered by userId
      const employeeIds = await User.find({ role: "employee" }).select("_id").lean();
      const ids = employeeIds.map((u) => u._id);
      query.userId = userId ? userId : { $in: ids };
      // If filtering by userId, verify that user is actually an employee
      if (userId) {
        const targetUser = await User.findById(userId).select("role").lean();
        if (!targetUser || targetUser.role !== "employee") {
          return NextResponse.json(
            { message: "Supervisors can only view employee timesheets." },
            { status: 403 }
          );
        }
      }
    } else if (currentUser.role === "admin") {
      // Admin sees all, optionally filtered by userId
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