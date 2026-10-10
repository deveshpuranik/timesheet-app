import mongoose from "mongoose";

const LeaveRequestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    name: { type: String, required: true, trim: true },
    department: { type: String, trim: true, default: "" },
    // Role of the requester when they applied; decides who may approve it.
    requesterRole: { type: String, default: "employee" },
    leaveType: { type: String, required: true, trim: true },
    // Midnight UTC of the first and last calendar day of leave (inclusive).
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    halfDay: { type: Boolean, default: false },
    days: { type: Number, required: true, min: 0.5 },
    reason: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true
    },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    decidedByName: { type: String, trim: true, default: "" },
    decisionNote: { type: String, trim: true, default: "" },
    decidedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

LeaveRequestSchema.index({ status: 1, fromDate: -1 });

export default mongoose.models.LeaveRequest ||
  mongoose.model("LeaveRequest", LeaveRequestSchema);
