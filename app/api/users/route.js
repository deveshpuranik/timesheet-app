import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { publicUser, requireUser, serverError } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import { departments, roles } from "@/lib/timesheet";
import User from "@/models/User";

// Admin: everyone. Supervisor: employees only (the people they supervise).
export async function GET() {
  try {
    const { user, response } = await requireUser({ roles: ["admin", "supervisor"] });
    if (response) return response;

    await dbConnect();

    const filter = user.role === "supervisor" ? { role: "employee" } : {};
    const users = await User.find(filter).select("-password").sort({ name: 1 }).lean();

    return NextResponse.json({ users: users.map(publicUser) }, { status: 200 });
  } catch (error) {
    return serverError(error, "Unable to load people.");
  }
}

// Admin adds a staff member directly; the account is approved from the start.
export async function POST(request) {
  try {
    const { response } = await requireUser({ roles: ["admin"] });
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    const role = String(body.role || "employee");
    const department = String(body.department || "").trim();

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email, and password are required." },
        { status: 400 }
      );
    }

    if (!roles.includes(role)) {
      return NextResponse.json({ message: "Please select a valid role." }, { status: 400 });
    }

    if (!departments.includes(department)) {
      return NextResponse.json(
        { message: "Please select a department." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    await dbConnect();

    if (await User.findOne({ email }).lean()) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const created = await User.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role,
      department,
      status: "approved"
    });

    return NextResponse.json(
      { message: `${created.name} has been added.`, user: publicUser(created) },
      { status: 201 }
    );
  } catch (error) {
    return serverError(error, "Unable to add this person.");
  }
}
