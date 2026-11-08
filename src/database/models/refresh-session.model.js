import mongoose from "mongoose";

const { Schema, model } = mongoose;

const refreshSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    familyId: { type: String, required: true, index: true },
    jti: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date, default: null },
    replacedBy: { type: Schema.Types.ObjectId, ref: "RefreshSession", default: null }
  },
  { timestamps: true }
);

refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "refresh_expiry_ttl" });
refreshSessionSchema.index({ userId: 1, familyId: 1, revokedAt: 1 }, { name: "refresh_user_family" });

export const RefreshSession = model("RefreshSession", refreshSessionSchema, "refresh_sessions");
