import { success } from "../../common/utils/responses.js";
import { userService } from "./user.service.js";

export const userController = {
  async getMe(req, res) {
    return success(res, await userService.getMe(req.auth.userId));
  },
  async updateProfile(req, res) {
    return success(
      res,
      await userService.updateProfile(req.auth.userId, req.validated.body),
      "Profile updated"
    );
  },
  async uploadAvatar(req, res) {
    return success(
      res,
      await userService.updateAvatar(req.auth.userId, req.uploadedAvatar),
      "Avatar uploaded"
    );
  },
  async updateSettings(req, res) {
    return success(
      res,
      await userService.updateSettings(req.auth.userId, req.validated.body.acceptMessages),
      "Settings updated"
    );
  },
  async getPublicProfile(req, res) {
    return success(res, await userService.getPublicProfile(req.validated.params.username));
  }
};
