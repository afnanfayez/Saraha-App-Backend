import mongoose from "mongoose";

const { Schema, model } = mongoose;

const messageSchema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
    encryptedContent: { type: String, required: true, select: false },
    iv: { type: String, required: true, select: false },
    authTag: { type: String, required: true, select: false },
    encryptionKeyVersion: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null }
  },
  { timestamps: true, strict: "throw" }
);

messageSchema.index({ recipient: 1, createdAt: -1, _id: -1 }, { name: "inbox_recipient_created" });
messageSchema.index({ recipient: 1, isRead: 1, createdAt: -1 }, { name: "inbox_unread" });

export const Message = model("Message", messageSchema, "messages");
