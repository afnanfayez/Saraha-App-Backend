import { AppError } from "../errors/app-error.js";
import { refreshSessionRepository } from "../../modules/auth/refresh-session.repository.js";
import { userRepository } from "../../modules/users/user.repository.js";
import { verifyAccessToken } from "../security/tokens.js";

export async function requireAuthentication(req, _res, next) {
  try {
    const header = req.get("authorization") || "";
    const match = /^Bearer\s+([^\s]+)$/i.exec(header);
    if (!match) {
      return next(new AppError(401, "A Bearer access token is required", "UNAUTHENTICATED"));
    }

    let claims;
    try {
      claims = verifyAccessToken(match[1]);
    } catch {
      return next(new AppError(401, "The access token is invalid or expired", "INVALID_TOKEN"));
    }

    if (!claims || claims.tokenType !== "access" || !claims.sub || !claims.sid) {
      return next(new AppError(401, "The access token is invalid", "INVALID_TOKEN"));
    }

    const [user, session] = await Promise.all([
      userRepository.findForAuthentication(claims.sub),
      refreshSessionRepository.findActive(claims.sid, claims.sub)
    ]);

    if (!user || !user.isActive || !session) {
      return next(new AppError(401, "The session is no longer active", "SESSION_REVOKED"));
    }

    req.user = user;
    req.auth = { userId: String(user._id), sessionId: String(session._id) };
    next();
  } catch (error) {
    next(error);
  }
}
