import { success } from "../../common/utils/responses.js";
import { messageService } from "./message.service.js";

export const messageController = {
  async sendAnonymous(req, res) {
    const result = await messageService.sendAnonymous(
      req.validated.params.username,
      req.validated.body.content
    );
    return success(res, result, "Anonymous message sent", 201);
  },
  async listInbox(req, res) {
    return success(res, await messageService.listInbox(req.auth.userId, req.validated.query));
  },
  async getMessage(req, res) {
    return success(res, await messageService.getMessage(req.auth.userId, req.validated.params.id));
  },
  async markRead(req, res) {
    return success(
      res,
      await messageService.markRead(req.auth.userId, req.validated.params.id),
      "Message marked as read"
    );
  },
  async deleteMessage(req, res) {
    return success(
      res,
      await messageService.deleteMessage(req.auth.userId, req.validated.params.id),
      "Message deleted"
    );
  },
  async reportMessage(req, res) {
    const result = await messageService.reportMessage(
      req.auth.userId,
      req.validated.params.id,
      req.validated.body
    );
    return success(res, result, "Report submitted", 201);
  }
};
