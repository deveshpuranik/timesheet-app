import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireUser, serverError } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { notifyRoles, notifyUsers } from "@/lib/notify";
import { formatDateForDisplay, toDateKey, todayKey } from "@/lib/timesheet";
import LeaveRequest from "@/models/LeaveRequest";
import User from "@/models/User";

function reply(message, status) {
  return NextResponse.json({ message }, { status });
}

function describe(leave) {
  const from = formatDateForDisplay(leave.fromDate);
  const to = formatDateForDisplay(leave.toDate);
  return `${leave.leaveType} · ${from === to ? from : `${from} – ${to}`}`;
}

/**
 * action: "approve" | "reject"  (admin: anyone's; supervisor: employees', never their own)
 * action: "cancel"              (the requester, while pending or before approved leave starts)
 */
export async function PATCH(request, context) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    const { id } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return reply("Leave request not found.", 404);

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "");
    const note = String(body.note || "").trim().slice(0, 500);

    if (!["approve", "reject", "cancel"].includes(action)) {
      return reply("Unknown action.", 400);
    }

    await dbConnect();
    const leave = await LeaveRequest.findById(id);
    if (!leave) return reply("Leave request not found.", 404);

    const isOwner = String(leave.userId) === user._id;

    if (action === "cancel") {
      if (!isOwner) return reply("You can only cancel your own leave request.", 403);

      const wasApproved = leave.status === "approved";
      const notStarted = toDateKey(leave.fromDate) > todayKey();

      if (leave.status !== "pending" && !(wasApproved && notStarted)) {
        return reply("This leave request can no longer be cancelled.", 400);
      }

      leave.status = "cancelled";
      await leave.save();

      if (wasApproved) {
        await notifyRoles(
          ["admin"],
          {
            type: "leave_cancelled",
            title: `${user.name} cancelled approved leave`,
            message: describe(leave),
            link: "/leave"
          },
          { excludeId: user._id }
        );
      }

      return NextResponse.json(
        { message: "Leave request cancelled.", request: leave },
        { status: 200 }
      );
    }

    // approve / reject
    if (user.role === "employee") return reply("You do not have permission to do this.", 403);

    if (user.role === "supervisor") {
      const requester = await User.findById(leave.userId).select("role").lean();
      if (isOwner || !requester || requester.role !== "employee") {
        return reply("Only an admin can decide on this leave request.", 403);
      }
    }

    if (leave.status !== "pending") {
      return reply(`This request was already ${leave.status}.`, 409);
    }

    if (action === "reject" && !note) {
      return reply("Please write a short reason for rejecting this request.", 400);
    }

    leave.status = action === "approve" ? "approved" : "rejected";
    leave.decidedBy = user._id;
    leave.decidedByName = user.name;
    leave.decisionNote = note;
    leave.decidedAt = new Date();
    await leave.save();

    if (!isOwner) {
      await notifyUsers([leave.userId], {
        type: "leave_decision",
        title: `Your leave was ${leave.status}`,
        message: `${describe(leave)} · by ${user.name}${note ? ` — ${note}` : ""}`,
        link: "/leave"
      });
    }

    return NextResponse.json(
      { message: `Leave ${leave.status} for ${leave.name}.`, request: leave },
      { status: 200 }
    );
  } catch (error) {
    return serverError(error, "Unable to update the leave request.");
  }
}
