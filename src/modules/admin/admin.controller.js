import { success } from "../../common/utils/responses.js";
import { adminService } from "./admin.service.js";

export const adminController = {
  async listUsers(req, res) {
    return success(res, await adminService.listUsers(req.validated.query));
  },
  async setUserStatus(req, res) {
    return success(
      res,
      await adminService.setUserStatus(req.validated.params.id, req.validated.body.isActive, req.auth.userId),
      "User status updated"
    );
  },
  async listReports(req, res) {
    return success(res, await adminService.listReports(req.validated.query));
  },
  async reviewReport(req, res) {
    const data = await adminService.reviewReport(
      req.validated.params.id,
      req.auth.userId,
      req.validated.body.status
    );
    return success(res, data, "Report reviewed");
  }
};
