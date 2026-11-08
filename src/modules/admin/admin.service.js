import { AppError } from "../../common/errors/app-error.js";
import { pageInfo } from "../../common/utils/responses.js";
import { reportRepository } from "../reports/report.repository.js";
import { refreshSessionRepository } from "../auth/refresh-session.repository.js";
import { userRepository } from "../users/user.repository.js";

export const adminService = {
  async listUsers(options) {
    const { items, total } = await userRepository.list(options);
    return {
      items: items.map((user) => ({
        id: String(user._id),
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      })),
      pagination: pageInfo(options.page, options.limit, total)
    };
  },

  async setUserStatus(id, isActive, actorId) {
    const target = await userRepository.findById(id);
    if (!target) throw new AppError(404, "User not found", "USER_NOT_FOUND");

    if (!isActive && String(target._id) === String(actorId)) {
      throw new AppError(
        409,
        "An administrator cannot deactivate their own account",
        "SELF_DEACTIVATION_DENIED"
      );
    }
    if (!isActive && target.role === "ADMIN") {
      throw new AppError(
        409,
        "Administrator accounts must be managed through a controlled maintenance process",
        "ADMIN_DEACTIVATION_DENIED"
      );
    }

    const user = await userRepository.setActiveStatus(id, isActive);
    if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");

    // The authentication middleware checks isActive on every request. Revoking refresh sessions
    // also prevents old sessions from becoming usable if the account is reactivated later.
    if (!isActive) await refreshSessionRepository.revokeAllForUser(user._id);

    return {
      id: String(user._id),
      username: user.username,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    };
  },

  async listReports(options) {
    const { items, total } = await reportRepository.list(options);
    return {
      items: items.map((report) => ({
        id: String(report._id),
        reporter: report.reporterUserId
          ? {
              username: report.reporterUserId.username,
              email: report.reporterUserId.email
            }
          : null,
        message: report.messageId
          ? {
              id: String(report.messageId._id),
              isRead: report.messageId.isRead,
              createdAt: report.messageId.createdAt,
              recipient: report.messageId.recipient ? { username: report.messageId.recipient.username } : null
            }
          : null,
        reason: report.reason,
        details: report.details,
        status: report.status,
        reviewedBy: report.reviewedBy ? { username: report.reviewedBy.username } : null,
        reviewedAt: report.reviewedAt,
        createdAt: report.createdAt
      })),
      pagination: pageInfo(options.page, options.limit, total)
    };
  },

  async reviewReport(id, reviewerId, status) {
    const report = await reportRepository.review(id, reviewerId, status);
    if (!report) throw new AppError(404, "Report not found", "REPORT_NOT_FOUND");
    return {
      id: String(report._id),
      status: report.status,
      reviewedBy: String(report.reviewedBy),
      reviewedAt: report.reviewedAt
    };
  }
};
