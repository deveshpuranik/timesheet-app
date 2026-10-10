import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema(
  {
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: [
        "signup",
        "account_approved",
        "leave_request",
        "leave_decision",
        "leave_cancelled",
        "remark"
      ],
      required: true
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, trim: true, default: "" },
    link: { type: String, trim: true, default: "" },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
);

NotificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });

export default mongoose.models.Notification ||
  mongoose.model("Notification", NotificationSchema);
