import { success } from "../../common/utils/responses.js";
import { authService } from "./auth.service.js";

export const authController = {
  async signup(req, res) {
    return success(res, await authService.signup(req.validated.body), "Account created", 201);
  },
  async login(req, res) {
    return success(res, await authService.login(req.validated.body), "Login successful");
  },
  async refresh(req, res) {
    return success(res, await authService.refresh(req.validated.body.refreshToken), "Tokens rotated");
  },
  async logout(req, res) {
    return success(res, await authService.logout(req.auth.sessionId, req.auth.userId), "Logged out");
  },
  async verifyEmail(req, res) {
    return success(res, await authService.verifyEmail(req.validated.body.token), "Email verified");
  },
  async resendVerification(req, res) {
    return success(
      res,
      await authService.resendVerification(req.validated.body.email),
      "If the account exists and needs verification, an email has been sent"
    );
  },
  async requestPasswordReset(req, res) {
    return success(
      res,
      await authService.requestPasswordReset(req.validated.body.email),
      "If the account exists, password reset instructions have been sent"
    );
  },
  async resetPassword(req, res) {
    return success(
      res,
      await authService.resetPassword(req.validated.body.token, req.validated.body.password),
      "Password reset successfully"
    );
  }
};
