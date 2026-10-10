import Notification from "@/models/Notification";
import User from "@/models/User";

/**
 * Creates one in-app notification per recipient. Notifications are a convenience,
 * so a failure here is logged and never breaks the action that triggered it.
 */
export async function notifyUsers(recipientIds, { type, title, message = "", link = "" }) {
  try {
    const unique = [...new Set((recipientIds || []).filter(Boolean).map(String))];
    if (unique.length === 0) return;

    await Notification.insertMany(
      unique.map((recipientId) => ({ recipientId, type, title, message, link }))
    );
  } catch (error) {
    console.error("Unable to create notification:", error);
  }
}

// Everyone holding one of the given roles (approved accounts only), minus `excludeId`.
export async function notifyRoles(rolesToNotify, payload, { excludeId } = {}) {
  try {
    const recipients = await User.find({
      role: { $in: rolesToNotify },
      $or: [{ status: "approved" }, { role: "admin" }]
    })
      .select("_id")
      .lean();

    const ids = recipients
      .map((user) => String(user._id))
      .filter((id) => id !== String(excludeId || ""));

    await notifyUsers(ids, payload);
  } catch (error) {
    console.error("Unable to create notification:", error);
  }
}
