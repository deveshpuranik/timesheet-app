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
    const { department, date, fromTime, toTime, workType, workDetails } = body;

    if (!department || !date || !fromTime || !toTime || !workType) {
      return NextResponse.json(
        { message: "Please fill all required fields." },
        { status: 400 }
      );
    }

    if (!departments.includes(department)) {
      return NextResponse.json(
        { message: "Please select a valid department." },
        { status: 400 }
      );
    }

    if (!getWorkTypes(department).includes(workType)) {
      return NextResponse.json(
        { message: "Please select a valid work type for this department." },
        { status: 400 }
      );
    }

    const hours = calculateHours(fromTime, toTime);

    if (hours <= 0) {
      return NextResponse.json(
        { message: "To Time must be later than From Time." },
        { status: 400 }
      );
    }

    await dbConnect();

    const entry = await Timesheet.create({
      userId: currentUser._id,
      name: currentUser.name,
      department,
      date,
      fromTime,
      toTime,
      hours,
      workType,
      workDetails: workDetails || ""
    });

    return NextResponse.json(
      { message: "Timesheet saved successfully.", entry },
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
      query.userId = currentUser._id;
    }

    if (currentUser.role === "admin" && userId) {
      query.userId = userId;
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
