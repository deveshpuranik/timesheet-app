import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getCurrentUser } from "@/lib/auth";
import Timesheet from "@/models/Timesheet";

export async function PATCH(request, { params }) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!["admin", "supervisor"].includes(currentUser.role)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const { remark } = await request.json();

    await dbConnect();

    // Build the "Supervisor · John" style label
    const roleLabel =
      currentUser.role === "admin"
        ? "Admin"
        : currentUser.role === "supervisor"
        ? "Supervisor"
        : "Manager";

    const remarkBy = remark ? `${roleLabel} · ${currentUser.name}` : "";

    const entry = await Timesheet.findByIdAndUpdate(
      id,
      { remark: remark || "", remarkBy },
      { returnDocument: "after" }
    );

    if (!entry) {
      return NextResponse.json({ message: "Entry not found." }, { status: 404 });
    }

    return NextResponse.json({ message: "Remark saved.", entry }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Unable to save remark." },
      { status: 500 }
    );
  }
}