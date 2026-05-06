import mongoose from "mongoose";

const TimesheetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true
    },
    name: {
      type: String,
      required: [true, "Employee name is required"],
      trim: true
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      enum: ["Housekeeping", "HR", "IT", "Finance", "Operations"]
    },
    date: {
      type: Date,
      required: [true, "Date is required"]
    },
    fromTime: {
      type: String,
      required: [true, "From time is required"]
    },
    toTime: {
      type: String,
      required: [true, "To time is required"]
    },
    hours: {
      type: Number,
      required: true,
      min: 0
    },
    workType: {
      type: String,
      required: [true, "Work type is required"],
      trim: true
    },
    workDetails: {
      type: String,
      trim: true,
      default: ""
    },
    remark: {
      type: String,
      trim: true,
      default: ""
    },
    remarkBy: {
      type: String,  // stores "Supervisor · John" or "Admin · Sarah"
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

export default mongoose.models.Timesheet ||
  mongoose.model("Timesheet", TimesheetSchema);
