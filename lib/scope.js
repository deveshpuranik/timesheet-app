import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { dateKeyToDate, departments, isValidDateKey } from "@/lib/timesheet";
import User from "@/models/User";

function bad(message, status = 400) {
  return { response: NextResponse.json({ message }, { status }) };
}

/**
 * Turns the query string of a timesheet / export request into a MongoDB filter that
 * can only ever match records the caller is allowed to see.
 *
 *   scope=mine    only the caller's own entries
 *   scope=team    everyone the caller may see, except the caller
 *   userId=<id>   one person (must be visible to the caller)
 *   from, to      inclusive date range as YYYY-MM-DD
 *   department    one department
 *
 * Employees see only themselves. Supervisors see themselves and employees.
 * Admins see everyone.
 */
export async function buildTimesheetFilter(currentUser, searchParams) {
  const scope = searchParams.get("scope") || "";
  const userId = searchParams.get("userId") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const department = searchParams.get("department") || "";
  const filter = {};
  const selfId = new mongoose.Types.ObjectId(currentUser._id);

  if (currentUser.role === "employee" || scope === "mine") {
    if (userId && userId !== currentUser._id) {
      return bad("You can only view your own timesheet.", 403);
    }
    filter.userId = selfId;
  } else if (userId) {
    if (!mongoose.Types.ObjectId.isValid(userId)) return bad("Person not found.", 404);

    if (currentUser.role === "supervisor" && userId !== currentUser._id) {
      const target = await User.findById(userId).select("role").lean();
      if (!target || target.role !== "employee") {
        return bad("Supervisors can only view employee timesheets.", 403);
      }
    }
    filter.userId = new mongoose.Types.ObjectId(userId);
  } else if (currentUser.role === "supervisor") {
    const employees = await User.find({ role: "employee" }).select("_id").lean();
    const ids = employees.map((employee) => employee._id);
    filter.userId = { $in: scope === "team" ? ids : [selfId, ...ids] };
  } else if (scope === "team") {
    filter.userId = { $ne: selfId };
  }

  if (from || to) {
    if ((from && !isValidDateKey(from)) || (to && !isValidDateKey(to))) {
      return bad("Please choose valid dates.");
    }
    if (from && to && from > to) {
      return bad("The From date must be on or before the To date.");
    }
    filter.date = {};
    if (from) filter.date.$gte = dateKeyToDate(from);
    if (to) filter.date.$lte = dateKeyToDate(to);
  }

  if (department) {
    if (!departments.includes(department)) return bad("Please select a valid department.");
    filter.department = department;
  }

  return { filter };
}
