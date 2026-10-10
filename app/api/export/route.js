import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireUser, serverError } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { buildTimesheetFilter } from "@/lib/scope";
import { formatTime12h, normalizeDepartment, toDateKey } from "@/lib/timesheet";
import LeaveRequest from "@/models/LeaveRequest";
import Timesheet from "@/models/Timesheet";
import User from "@/models/User";

const DATE_FORMAT = "dd-mmm-yyyy";

// A real Excel date (so it sorts and filters properly), independent of server timezone.
function excelDate(value) {
  const key = toDateKey(value);
  if (!key) return { t: "s", v: "" };
  const serial = Date.parse(`${key}T00:00:00.000Z`) / 86400000 + 25569;
  return { t: "n", v: serial, z: DATE_FORMAT };
}

function weekday(value) {
  const key = toDateKey(value);
  if (!key) return "";
  return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long" }).format(
    new Date(`${key}T00:00:00.000Z`)
  );
}

function hoursCell(value) {
  return { t: "n", v: Number(Number(value || 0).toFixed(2)), z: "0.00" };
}

function buildSheet(header, rows, widths) {
  const sheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  sheet["!cols"] = widths.map((wch) => ({ wch }));
  if (rows.length > 0) {
    sheet["!autofilter"] = {
      ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length, c: header.length - 1 } })
    };
  }
  return sheet;
}

function safeFilePart(value) {
  return String(value || "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Downloads an Excel workbook of the timesheets matching the filters
// (userId, from, to, department, scope) that the caller is allowed to see.
export async function GET(request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const { filter, response: filterError } = await buildTimesheetFilter(user, searchParams);
    if (filterError) return filterError;

    const entries = await Timesheet.find(filter)
      .populate({ path: "userId", model: User, select: "name" })
      .sort({ date: 1, fromTime: 1 })
      .lean();

    const nameOf = (entry) => entry.userId?.name || entry.name;
    entries.sort(
      (a, b) =>
        nameOf(a).localeCompare(nameOf(b)) ||
        new Date(a.date) - new Date(b.date) ||
        String(a.fromTime).localeCompare(String(b.fromTime))
    );

    // ── Sheet 1: every entry ────────────────────────────────────────────────
    const entryRows = entries.map((entry) => [
      nameOf(entry),
      normalizeDepartment(entry.department),
      excelDate(entry.date),
      weekday(entry.date),
      formatTime12h(entry.fromTime),
      formatTime12h(entry.toTime),
      hoursCell(entry.hours),
      entry.workType,
      entry.workDetails || "",
      entry.remark || "",
      entry.remarkBy || ""
    ]);

    const totalHours = entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
    if (entryRows.length > 0) {
      entryRows.push(["", "", "", "", "", "Total", hoursCell(totalHours), "", "", "", ""]);
    }

    // ── Sheet 2: hours per person per day ───────────────────────────────────
    const daily = new Map();
    const people = new Map();

    for (const entry of entries) {
      const name = nameOf(entry);
      const dateKey = toDateKey(entry.date);
      const dayKey = `${name}|${dateKey}`;

      if (!daily.has(dayKey)) {
        daily.set(dayKey, {
          name,
          department: normalizeDepartment(entry.department),
          date: entry.date,
          first: entry.fromTime,
          last: entry.toTime,
          entries: 0,
          hours: 0
        });
      }
      const day = daily.get(dayKey);
      day.entries += 1;
      day.hours += Number(entry.hours || 0);
      if (entry.fromTime < day.first) day.first = entry.fromTime;
      if (entry.toTime > day.last) day.last = entry.toTime;

      if (!people.has(name)) {
        people.set(name, {
          name,
          department: normalizeDepartment(entry.department),
          days: new Set(),
          entries: 0,
          hours: 0
        });
      }
      const person = people.get(name);
      person.days.add(dateKey);
      person.entries += 1;
      person.hours += Number(entry.hours || 0);
    }

    const dailyRows = [...daily.values()].map((day) => [
      day.name,
      day.department,
      excelDate(day.date),
      weekday(day.date),
      formatTime12h(day.first),
      formatTime12h(day.last),
      day.entries,
      hoursCell(day.hours)
    ]);

    // ── Sheet 3: totals per person ──────────────────────────────────────────
    const personRows = [...people.values()].map((person) => [
      person.name,
      person.department,
      person.days.size,
      person.entries,
      hoursCell(person.hours),
      hoursCell(person.days.size ? person.hours / person.days.size : 0)
    ]);

    // ── Sheet 4: approved leave in the same period, for the same people ─────
    const leaveFilter = { status: "approved" };
    if (filter.userId) leaveFilter.userId = filter.userId;
    if (filter.department) leaveFilter.department = filter.department;
    if (filter.date?.$lte) leaveFilter.fromDate = { $lte: filter.date.$lte };
    if (filter.date?.$gte) leaveFilter.toDate = { $gte: filter.date.$gte };

    const leave = await LeaveRequest.find(leaveFilter).sort({ name: 1, fromDate: 1 }).lean();
    const leaveRows = leave.map((item) => [
      item.name,
      normalizeDepartment(item.department),
      item.leaveType,
      excelDate(item.fromDate),
      excelDate(item.toDate),
      { t: "n", v: item.days },
      item.reason,
      item.decidedByName || ""
    ]);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      buildSheet(
        ["Name", "Department", "Date", "Day", "From", "To", "Hours", "Work Type", "Work Details", "Remark", "Remark By"],
        entryRows,
        [22, 32, 13, 12, 10, 10, 8, 34, 50, 34, 22]
      ),
      "Timesheet"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      buildSheet(
        ["Name", "Department", "Date", "Day", "First In", "Last Out", "Entries", "Hours"],
        dailyRows,
        [22, 32, 13, 12, 10, 10, 9, 8]
      ),
      "Daily Summary"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      buildSheet(
        ["Name", "Department", "Days Worked", "Entries", "Total Hours", "Avg Hours / Day"],
        personRows,
        [22, 32, 12, 9, 12, 15]
      ),
      "Person Summary"
    );
    XLSX.utils.book_append_sheet(
      workbook,
      buildSheet(
        ["Name", "Department", "Leave Type", "From", "To", "Days", "Reason", "Approved By"],
        leaveRows,
        [22, 32, 16, 13, 13, 7, 44, 20]
      ),
      "Approved Leave"
    );

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // File name says whose data and which dates it contains.
    let who = "all";
    if (people.size === 1) who = [...people.keys()][0];
    else if (searchParams.get("userId") || user.role === "employee" || searchParams.get("scope") === "mine") {
      const target = await User.findById(searchParams.get("userId") || user._id).select("name").lean();
      who = target?.name || who;
    }
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const period = from || to ? `${from || "start"}_to_${to || "today"}` : "all-dates";
    const fileName = `timesheet_${safeFilePart(who) || "all"}_${period}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return serverError(error, "Unable to export timesheet data.");
  }
}
