import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 1, maxlength: 80 },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_]+$/
    },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["USER", "ADMIN"], default: "USER", immutable: true },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    bio: { type: String, trim: true, maxlength: 280, default: "" },
    avatarUrl: { type: String, trim: true, maxlength: 2048, default: "" },
    settings: {
      acceptMessages: { type: Boolean, default: true }
    }
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      }
    },
    toObject: { virtuals: true }
  }
);

userSchema.virtual("publicProfileUrl").get(function publicProfileUrl() {
  return "/api/v1/public/users/" + this.username;
});

userSchema.index({ email: 1 }, { unique: true, name: "uniq_users_email" });
userSchema.index({ username: 1 }, { unique: true, name: "uniq_users_username" });
userSchema.index({ createdAt: -1 }, { name: "users_created_at" });

export const User = model("User", userSchema, "users");
