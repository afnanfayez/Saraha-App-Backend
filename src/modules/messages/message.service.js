import { AppError } from "../../common/errors/app-error.js";
import { decryptMessage, encryptMessage } from "../../common/security/message-crypto.js";
import { pageInfo } from "../../common/utils/responses.js";
import { userRepository } from "../users/user.repository.js";
import { messageRepository } from "./message.repository.js";
import { reportRepository } from "../reports/report.repository.js";

function messageDto(message) {
  return {
    id: String(message._id),
    content: decryptMessage(message),
    isRead: message.isRead,
    readAt: message.readAt,
    createdAt: message.createdAt
  };
}

export const messageService = {
  async sendAnonymous(username, content) {
    const recipient = await userRepository.findMessagingRecipient(username);

    if (!recipient) throw new AppError(404, "Recipient not found", "RECIPIENT_NOT_FOUND");
    if (recipient.settings?.acceptMessages === false) {
      throw new AppError(403, "This user is not accepting messages", "MESSAGES_DISABLED");
    }

    const encrypted = encryptMessage(content);
    const message = await messageRepository.create({
      recipient: recipient._id,
      ...encrypted
    });

    return { id: String(message._id), createdAt: message.createdAt };
  },

  async listInbox(userId, options) {
    const { items, total } = await messageRepository.listInbox(userId, options);
    return {
      items: items.map(messageDto),
      pagination: pageInfo(options.page, options.limit, total)
    };
  },

  async getMessage(userId, messageId) {
    const message = await messageRepository.findOwnedById(messageId, userId);
    if (!message) throw new AppError(404, "Message not found", "MESSAGE_NOT_FOUND");
    return messageDto(message);
  },

  async markRead(userId, messageId) {
    const message = await messageRepository.markRead(messageId, userId);
    if (!message) throw new AppError(404, "Message not found", "MESSAGE_NOT_FOUND");
    return messageDto(message);
  },

  async deleteMessage(userId, messageId) {
    const message = await messageRepository.deleteOwnedById(messageId, userId);
    if (!message) throw new AppError(404, "Message not found", "MESSAGE_NOT_FOUND");
    return { deleted: true };
  },

  async reportMessage(userId, messageId, input) {
    const message = await messageRepository.findOwnedById(messageId, userId);
    if (!message) throw new AppError(404, "Message not found", "MESSAGE_NOT_FOUND");
    const report = await reportRepository.create({
      messageId: message._id,
      reporterUserId: userId,
      reason: input.reason,
      details: input.details || ""
    });
    return { id: String(report._id), status: report.status, createdAt: report.createdAt };
  }
};
