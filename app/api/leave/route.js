import { NextResponse } from "next/server";
import { requireUser, serverError } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { notifyRoles } from "@/lib/notify";
import {
  addDays,
  dateKeyToDate,
  daysBetween,
  formatDateForDisplay,
  isValidDateKey,
  leaveTypes,
  todayKey
} from "@/lib/timesheet";
import LeaveRequest from "@/models/LeaveRequest";
import User from "@/models/User";

const MAX_LEAVE_DAYS = 60;
const MAX_BACKDATE_DAYS = 30;

function invalid(message) {
  return NextResponse.json({ message }, { status: 400 });
}

/**
 * scope=mine (default)  the caller's own requests
 * scope=team            requests the caller may decide on:
 *                       admin → everyone's, supervisor → employees'
 * Optional: status, from, to (requests overlapping the date range).
 */
export async function GET(request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope") || "mine";
    const status = searchParams.get("status") || "";
    const from = searchParams.get("from") || "";
    const to = searchParams.get("to") || "";
    const filter = {};

    if (scope === "team") {
      if (user.role === "employee") {
        return NextResponse.json(
          { message: "You do not have permission to do this." },
          { status: 403 }
        );
      }
      if (user.role === "supervisor") {
        const employees = await User.find({ role: "employee" }).select("_id").lean();
        filter.userId = { $in: employees.map((employee) => employee._id) };
      }
    } else {
      filter.userId = user._id;
    }

    if (status) filter.status = status;

    if ((from && !isValidDateKey(from)) || (to && !isValidDateKey(to))) {
      return invalid("Please choose valid dates.");
    }
    if (to) filter.fromDate = { $lte: dateKeyToDate(to) };
    if (from) filter.toDate = { $gte: dateKeyToDate(from) };

    const requests = await LeaveRequest.find(filter)
      .sort({ createdAt: -1 })
      .limit(500)
      .lean();

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    return serverError(error, "Unable to load leave requests.");
  }
}

export async function POST(request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const leaveType = String(body.leaveType || "").trim();
    const fromDate = String(body.fromDate || "");
    const toDate = String(body.toDate || fromDate);
    const reason = String(body.reason || "").trim();
    const halfDay = Boolean(body.halfDay);

    if (!leaveTypes.includes(leaveType)) return invalid("Please select the type of leave.");
    if (!isValidDateKey(fromDate) || !isValidDateKey(toDate)) {
      return invalid("Please select the leave dates.");
    }
    if (fromDate > toDate) return invalid("The To date must be on or after the From date.");
    if (fromDate < addDays(todayKey(), -MAX_BACKDATE_DAYS)) {
      return invalid(`Leave cannot be requested more than ${MAX_BACKDATE_DAYS} days in the past.`);
    }

    const totalDays = daysBetween(fromDate, toDate);
    if (totalDays > MAX_LEAVE_DAYS) {
      return invalid(`A single request can cover at most ${MAX_LEAVE_DAYS} days.`);
    }
    if (halfDay && totalDays !== 1) {
      return invalid("Half day can only be chosen for a single date.");
    }
    if (reason.length < 3) return invalid("Please write the reason for your leave.");
    if (reason.length > 1000) return invalid("Please keep the reason under 1000 characters.");

    await dbConnect();

    const overlapping = await LeaveRequest.findOne({
      userId: user._id,
      status: { $in: ["pending", "approved"] },
      fromDate: { $lte: dateKeyToDate(toDate) },
      toDate: { $gte: dateKeyToDate(fromDate) }
    }).lean();

    if (overlapping) {
      return invalid(
        `You already have a ${overlapping.status} leave request for ` +
          `${formatDateForDisplay(overlapping.fromDate)} – ${formatDateForDisplay(overlapping.toDate)}.`
      );
    }

    const created = await LeaveRequest.create({
      userId: user._id,
      name: user.name,
      department: user.department || "",
      requesterRole: user.role,
      leaveType,
      fromDate: dateKeyToDate(fromDate),
      toDate: dateKeyToDate(toDate),
      halfDay,
      days: halfDay ? 0.5 : totalDays,
      reason
    });

    const dayLabel = created.days === 1 ? "1 day" : `${created.days} days`;
    const dates =
      fromDate === toDate
        ? formatDateForDisplay(fromDate)
        : `${formatDateForDisplay(fromDate)} – ${formatDateForDisplay(toDate)}`;

    // Employees' requests go to admins and supervisors; everyone else's to admins.
    await notifyRoles(
      user.role === "employee" ? ["admin", "supervisor"] : ["admin"],
      {
        type: "leave_request",
        title: `${user.name} requested leave`,
        message: `${leaveType} · ${dates} (${dayLabel})`,
        link: "/leave"
      },
      { excludeId: user._id }
    );

    return NextResponse.json(
      { message: "Leave request sent for approval.", request: created },
      { status: 201 }
    );
  } catch (error) {
    return serverError(error, "Unable to send your leave request. Please try again.");
  }
}
