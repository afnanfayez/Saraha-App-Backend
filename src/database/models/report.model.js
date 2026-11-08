import mongoose from "mongoose";

const { Schema, model } = mongoose;

const reportSchema = new Schema(
  {
    messageId: { type: Schema.Types.ObjectId, ref: "Message", required: true },
    reporterUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reason: { type: String, enum: ["HARASSMENT", "THREATS", "SPAM", "OTHER"], required: true },
    details: { type: String, trim: true, maxlength: 500, default: "" },
    status: { type: String, enum: ["OPEN", "REVIEWED", "DISMISSED"], default: "OPEN" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

reportSchema.index({ messageId: 1, reporterUserId: 1 }, { unique: true, name: "uniq_reporter_message" });
reportSchema.index({ status: 1, createdAt: -1 }, { name: "admin_report_queue" });

export const Report = model("Report", reportSchema, "reports");
