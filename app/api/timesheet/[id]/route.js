import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireUser, serverError } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { notifyUsers } from "@/lib/notify";
import { addDays, formatDateForDisplay, toDateKey, todayKey } from "@/lib/timesheet";
import Timesheet from "@/models/Timesheet";
import User from "@/models/User";

// How many days back a person may still delete their own entry to correct a mistake.
const SELF_DELETE_WINDOW_DAYS = 7;

async function loadEntry(context) {
  const { id } = await context.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  await dbConnect();
  return Timesheet.findById(id);
}

function notFound() {
  return NextResponse.json({ message: "Entry not found." }, { status: 404 });
}

// Admin or supervisor leaves a remark on someone's entry.
export async function PATCH(request, context) {
  try {
    const { user, response } = await requireUser({ roles: ["admin", "supervisor"] });
    if (response) return response;

    const entry = await loadEntry(context);
    if (!entry) return notFound();

    if (user.role === "supervisor") {
      const owner = await User.findById(entry.userId).select("role").lean();
      if (!owner || owner.role !== "employee") {
        return NextResponse.json(
          { message: "Supervisors can only remark on employee entries." },
          { status: 403 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const remark = String(body.remark || "").trim().slice(0, 1000);
    const roleLabel = user.role === "admin" ? "Admin" : "Supervisor";

    entry.remark = remark;
    entry.remarkBy = remark ? `${roleLabel} · ${user.name}` : "";
    await entry.save();

    if (remark && String(entry.userId) !== user._id) {
      await notifyUsers([entry.userId], {
        type: "remark",
        title: `${user.name} left a remark on your timesheet`,
        message: `${formatDateForDisplay(entry.date)} · ${entry.workType}: ${remark}`,
        link: "/dashboard"
      });
    }

    return NextResponse.json({ message: "Remark saved.", entry }, { status: 200 });
  } catch (error) {
    return serverError(error, "Unable to save the remark.");
  }
}

// A person removes their own recent entry (to correct a mistake); an admin removes any.
export async function DELETE(_request, context) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    const entry = await loadEntry(context);
    if (!entry) return notFound();

    if (user.role !== "admin") {
      if (String(entry.userId) !== user._id) {
        return NextResponse.json(
          { message: "You can only delete your own entries." },
          { status: 403 }
        );
      }

      const oldestAllowed = addDays(todayKey(), -SELF_DELETE_WINDOW_DAYS);
      if (toDateKey(entry.date) < oldestAllowed) {
        return NextResponse.json(
          {
            message: `Entries older than ${SELF_DELETE_WINDOW_DAYS} days can only be removed by the admin.`
          },
          { status: 403 }
        );
      }
    }

    await entry.deleteOne();
    return NextResponse.json({ message: "Entry deleted." }, { status: 200 });
  } catch (error) {
    return serverError(error, "Unable to delete the entry.");
  }
}
