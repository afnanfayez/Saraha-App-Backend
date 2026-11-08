import { Message } from "../../database/models/message.model.js";
import { BaseRepository } from "../../database/repositories/base.repository.js";

const sensitiveFields = "+encryptedContent +iv +authTag";

class MessageRepository extends BaseRepository {
  constructor() {
    super(Message);
  }

  async listInbox(userId, { page, limit, read }) {
    const filter = { recipient: userId };
    if (typeof read === "boolean") filter.isRead = read;
    const [items, total] = await Promise.all([
      Message.find(filter)
        .select("recipient encryptionKeyVersion isRead readAt createdAt updatedAt " + sensitiveFields)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Message.countDocuments(filter)
    ]);
    return { items, total };
  }

  findOwnedById(id, userId) {
    return Message.findOne({ _id: id, recipient: userId }).select(sensitiveFields);
  }

  async markRead(id, userId) {
    const now = new Date();
    const updated = await Message.findOneAndUpdate(
      { _id: id, recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: now } },
      { returnDocument: "after", runValidators: true }
    ).select(sensitiveFields);
    if (updated) return updated;
    return Message.findOne({ _id: id, recipient: userId }).select(sensitiveFields);
  }

  deleteOwnedById(id, userId) {
    return Message.findOneAndDelete({ _id: id, recipient: userId });
  }
}

export const messageRepository = new MessageRepository();
