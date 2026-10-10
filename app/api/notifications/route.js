import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireUser, serverError } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import Notification from "@/models/Notification";

// The caller's latest notifications and how many are unread.
export async function GET() {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    await dbConnect();

    const [notifications, unread] = await Promise.all([
      Notification.find({ recipientId: user._id }).sort({ createdAt: -1 }).limit(30).lean(),
      Notification.countDocuments({ recipientId: user._id, read: false })
    ]);

    return NextResponse.json({ notifications, unread }, { status: 200 });
  } catch (error) {
    return serverError(error, "Unable to load notifications.");
  }
}

// Mark one notification ({ id }) or all of them ({ all: true }) as read.
export async function PATCH(request) {
  try {
    const { user, response } = await requireUser();
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const filter = { recipientId: user._id, read: false };

    if (!body.all) {
      if (!mongoose.Types.ObjectId.isValid(body.id)) {
        return NextResponse.json({ message: "Notification not found." }, { status: 404 });
      }
      filter._id = body.id;
    }

    await dbConnect();
    await Notification.updateMany(filter, { $set: { read: true } });

    const unread = await Notification.countDocuments({ recipientId: user._id, read: false });
    return NextResponse.json({ unread }, { status: 200 });
  } catch (error) {
    return serverError(error, "Unable to update notifications.");
  }
}
