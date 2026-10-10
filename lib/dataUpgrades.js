import { departments, legacyDepartmentNames, normalizeDepartment } from "@/lib/timesheet";
import LeaveRequest from "@/models/LeaveRequest";
import Timesheet from "@/models/Timesheet";
import User from "@/models/User";

/**
 * Brings records created by earlier versions of the app in line with the current one.
 * Every step is safe to repeat: once the data is up to date it changes nothing.
 */
export async function runDataUpgrades() {
  // 1. Renamed departments ("IT", "Finance") on existing timesheets, leave and users.
  for (const [oldName, newName] of Object.entries(legacyDepartmentNames)) {
    await Timesheet.updateMany({ department: oldName }, { $set: { department: newName } });
    await LeaveRequest.updateMany({ department: oldName }, { $set: { department: newName } });
    await User.updateMany({ department: oldName }, { $set: { department: newName } });
  }

  // 2. Admins must never be locked out by the approval check.
  await User.updateMany(
    { role: "admin", status: { $ne: "approved" } },
    { $set: { status: "approved" } }
  );

  // 3. People who registered before departments were fixed per person:
  //    use the department of their most recent timesheet entry.
  const withoutDepartment = await User.find({
    $or: [{ department: { $exists: false } }, { department: "" }, { department: null }]
  })
    .select("_id")
    .lean();

  for (const user of withoutDepartment) {
    const latest = await Timesheet.findOne({ userId: user._id })
      .sort({ date: -1, createdAt: -1 })
      .select("department")
      .lean();

    const department = normalizeDepartment(latest?.department);
    if (department && departments.includes(department)) {
      await User.updateOne({ _id: user._id }, { $set: { department } });
    }
  }
}
