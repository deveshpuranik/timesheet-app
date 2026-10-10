import { NextResponse } from "next/server";
import { requireUser, serverError } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { buildTimesheetFilter } from "@/lib/scope";
import {
  calculateHours,
  dateKeyToDate,
  formatTime12h,
  getWorkTypes,
  isValidDateKey,
  isValidTime,
  normalizeDepartment,
  timesOverlap,
  todayKey
} from "@/lib/timesheet";
import Timesheet from "@/models/Timesheet";
import User from "@/models/User";

const MAX_ENTRIES_PER_REQUEST = 20;
const MAX_DETAILS_LENGTH = 1000;

function invalid(message) {
  return NextResponse.json({ message }, { status: 400 });
}

export async function POST(request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    if (!user.department) {
      return invalid("Please choose your department before filling in a timesheet.");
    }

    const body = await request.json().catch(() => ({}));
    const { date, entries } = body;

    if (!isValidDateKey(date)) {
      return invalid("Please select a valid date.");
    }

    if (date > todayKey()) {
      return invalid("You cannot fill in a timesheet for a future date.");
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      return invalid("Please add at least one work entry.");
    }

    if (entries.length > MAX_ENTRIES_PER_REQUEST) {
      return invalid(`Please submit at most ${MAX_ENTRIES_PER_REQUEST} entries at a time.`);
    }

    const workTypes = getWorkTypes(user.department);
    const cleaned = [];

    for (let i = 0; i < entries.length; i++) {
      const label = `Entry ${i + 1}`;
      const fromTime = entries[i]?.fromTime;
      const toTime = entries[i]?.toTime;
      const workType = String(entries[i]?.workType || "").trim();
      const workDetails = String(entries[i]?.workDetails || "").trim();

      if (!isValidTime(fromTime) || !isValidTime(toTime)) {
        return invalid(`${label}: please select both the From and To time.`);
      }
      if (calculateHours(fromTime, toTime) <= 0) {
        return invalid(`${label}: the To time must be later than the From time.`);
      }
      if (!workTypes.includes(workType)) {
        return invalid(`${label}: please select a work type for ${user.department}.`);
      }
      if (workDetails.length > MAX_DETAILS_LENGTH) {
        return invalid(`${label}: work details must be under ${MAX_DETAILS_LENGTH} characters.`);
      }

      const clash = cleaned.findIndex((other) =>
        timesOverlap(fromTime, toTime, other.fromTime, other.toTime)
      );
      if (clash !== -1) {
        return invalid(`${label} overlaps with Entry ${clash + 1}. Please correct the times.`);
      }

      cleaned.push({ fromTime, toTime, workType, workDetails });
    }

    await dbConnect();

    // The same person cannot log two pieces of work for the same time of day.
    const workDate = dateKeyToDate(date);
    const existing = await Timesheet.find({ userId: user._id, date: workDate })
      .select("fromTime toTime workType")
      .lean();

    for (let i = 0; i < cleaned.length; i++) {
      const clash = existing.find((saved) =>
        timesOverlap(cleaned[i].fromTime, cleaned[i].toTime, saved.fromTime, saved.toTime)
      );
      if (clash) {
        return invalid(
          `Entry ${i + 1} overlaps with work you already saved for this day ` +
            `(${clash.workType}, ${formatTime12h(clash.fromTime)} – ${formatTime12h(clash.toTime)}).`
        );
      }
    }

    const saved = await Timesheet.insertMany(
      cleaned.map((entry) => ({
        userId: user._id,
        name: user.name,
        department: user.department,
        date: workDate,
        fromTime: entry.fromTime,
        toTime: entry.toTime,
        hours: calculateHours(entry.fromTime, entry.toTime),
        workType: entry.workType,
        workDetails: entry.workDetails
      }))
    );

    return NextResponse.json(
      {
        message: `${saved.length} timesheet ${saved.length === 1 ? "entry" : "entries"} saved.`,
        entries: saved
      },
      { status: 201 }
    );
  } catch (error) {
    return serverError(error, "Unable to save your timesheet. Please try again.");
  }
}

export async function GET(request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const { filter, response: filterError } = await buildTimesheetFilter(user, searchParams);
    if (filterError) return filterError;

    const entries = await Timesheet.find(filter)
      .populate({ path: "userId", model: User, select: "name email role department" })
      .sort({ date: -1, fromTime: 1 })
      .lean();

    return NextResponse.json(
      {
        entries: entries.map((entry) => ({
          ...entry,
          department: normalizeDepartment(entry.department)
        }))
      },
      { status: 200 }
    );
  } catch (error) {
    return serverError(error, "Unable to load timesheets.");
  }
}
