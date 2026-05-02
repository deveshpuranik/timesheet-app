import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import { formatDateForDisplay } from "@/lib/timesheet";
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
      query.userId = currentUser._id;
    }

    if (currentUser.role === "admin" && userId) {
      query.userId = userId;
    }

    const entries = await Timesheet.find(query)
      .populate({ path: "userId", model: User, select: "name email role" })
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const rows = entries.map((entry) => ({
      Name: entry.userId?.name || entry.name,
      Department: entry.department,
      Date: formatDateForDisplay(entry.date),
      "From Time": entry.fromTime,
      "To Time": entry.toTime,
      Hours: entry.hours,
      "Work Type": entry.workType,
      "Work Details": entry.workDetails || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Timesheet");

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx"
    });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": "attachment; filename=\"timesheet.xlsx\"",
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to export timesheet data." },
      { status: 500 }
    );
  }
}
