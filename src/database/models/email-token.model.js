import mongoose from "mongoose";

const { Schema, model } = mongoose;

const emailTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true, unique: true, select: false },
    purpose: { type: String, enum: ["EMAIL_VERIFICATION", "PASSWORD_RESET"], required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

emailTokenSchema.index({ userId: 1, purpose: 1, consumedAt: 1 }, { name: "email_token_user_purpose" });
emailTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, name: "email_token_expiry_ttl" });

export const EmailToken = model("EmailToken", emailTokenSchema, "email_tokens");
