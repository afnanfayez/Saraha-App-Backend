import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import { AppError } from "../../common/errors/app-error.js";
import {
  createOpaqueToken,
  createRefreshExpiry,
  getAccessTokenTtlSeconds,
  hashOpaqueToken,
  signAccessToken
} from "../../common/security/tokens.js";
import { env } from "../../config/env.js";
import { refreshSessionRepository } from "./refresh-session.repository.js";
import { userRepository } from "../users/user.repository.js";
import { emailTokenRepository } from "../email/email-token.repository.js";
import { emailService } from "../email/email.service.js";

const passwordOptions = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1
};

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    isActive: user.isActive,
    bio: user.bio || "",
    avatarUrl: user.avatarUrl || "",
    settings: user.settings,
    publicProfileUrl: "/api/v1/public/users/" + user.username
  };
}

async function createTokenPair(user, familyId = randomUUID()) {
  const refreshToken = createOpaqueToken();
  const session = await refreshSessionRepository.create({
    userId: user._id,
    tokenHash: hashOpaqueToken(refreshToken),
    familyId,
    jti: randomUUID(),
    expiresAt: createRefreshExpiry()
  });
  const accessToken = signAccessToken(user._id, user.role, session._id);

  return {
    sessionId: session._id,
    tokens: {
      accessToken,
      refreshToken,
      tokenType: "Bearer",
      expiresIn: getAccessTokenTtlSeconds(accessToken),
      user: publicUser(user)
    }
  };
}

async function revokeAllUserSessions(userId) {
  await refreshSessionRepository.revokeAllForUser(userId);
}

export const authService = {
  async signup(input) {
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim().toLowerCase();
    const existing = await userRepository.findExistingAccount(email, username);
    if (existing) {
      throw new AppError(409, "Email or username is already in use", "DUPLICATE_ACCOUNT");
    }

    const passwordHash = await argon2.hash(input.password, passwordOptions);
    const user = await userRepository.create({
      name: input.name.trim(),
      username,
      email,
      passwordHash,
      role: "USER"
    });

    await emailService.sendVerification(user);
    return { user: publicUser(user), emailVerificationRequired: env.requireEmailVerification };
  },

  async login(input) {
    const user = await userRepository.findByEmail(input.email, true);
    const passwordMatches = user
      ? await argon2.verify(user.passwordHash, input.password).catch(() => false)
      : false;
    if (!user || !passwordMatches) {
      throw new AppError(401, "Email or password is incorrect", "INVALID_CREDENTIALS");
    }
    if (!user.isActive) {
      throw new AppError(403, "This account is inactive", "ACCOUNT_INACTIVE");
    }
    if (env.requireEmailVerification && !user.isVerified) {
      throw new AppError(403, "Verify your email before logging in", "EMAIL_NOT_VERIFIED");
    }
    return (await createTokenPair(user)).tokens;
  },

  async refresh(refreshToken) {
    const tokenHash = hashOpaqueToken(refreshToken);
    const current = await refreshSessionRepository.findByHash(tokenHash);
    if (!current) {
      throw new AppError(401, "Refresh token is invalid or expired", "INVALID_REFRESH_TOKEN");
    }

    const now = new Date();
    if (current.revokedAt) {
      await refreshSessionRepository.revokeFamily(current.familyId, now);
      throw new AppError(
        401,
        "Refresh token reuse detected; the session family was revoked",
        "REFRESH_REUSE_DETECTED"
      );
    }
    if (current.expiresAt <= now) {
      await refreshSessionRepository.revokeActive(current._id, now);
      throw new AppError(401, "Refresh token is invalid or expired", "INVALID_REFRESH_TOKEN");
    }

    const user = await userRepository.findById(current.userId);
    if (!user || !user.isActive) {
      await refreshSessionRepository.revokeFamily(current.familyId, now);
      throw new AppError(401, "The account session is no longer active", "SESSION_REVOKED");
    }

    // Create the candidate replacement before revoking the old session. If two requests
    // race with the same token, both candidates already exist when the losing request
    // revokes the family, so no replacement can survive the replay response.
    const next = await createTokenPair(user, current.familyId);
    const rotated = await refreshSessionRepository.revokeActive(current._id, now);
    if (!rotated) {
      await refreshSessionRepository.revokeFamily(current.familyId, now);
      throw new AppError(401, "Refresh token has already been used", "REFRESH_REUSE_DETECTED");
    }

    await refreshSessionRepository.setReplacement(current._id, next.sessionId);
    return next.tokens;
  },

  async logout(sessionId, userId) {
    await refreshSessionRepository.revokeUserSession(sessionId, userId);
    return { loggedOut: true };
  },

  async verifyEmail(token) {
    const consumed = await emailTokenRepository.consume(hashOpaqueToken(token), "EMAIL_VERIFICATION");
    if (!consumed) {
      throw new AppError(
        400,
        "Verification token is invalid, expired, or already used",
        "INVALID_EMAIL_TOKEN"
      );
    }
    const user = await userRepository.setVerified(consumed.userId, true);
    if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");
    return { isVerified: user.isVerified };
  },

  async resendVerification(emailInput) {
    const user = await userRepository.findByEmail(emailInput);
    if (user && !user.isVerified && user.isActive) {
      try {
        await emailService.sendVerification(user);
      } catch (error) {
        console.error("Verification email delivery failed:", error.code || error.name);
      }
    }
    return { message: "If the account exists and needs verification, an email has been sent" };
  },

  async requestPasswordReset(emailInput) {
    const user = await userRepository.findByEmail(emailInput);
    if (user && user.isActive) {
      try {
        await emailService.sendPasswordReset(user);
      } catch (error) {
        console.error("Password reset email delivery failed:", error.code || error.name);
      }
    }
    return { message: "If the account exists, password reset instructions have been sent" };
  },

  async resetPassword(token, newPassword) {
    const consumed = await emailTokenRepository.consume(hashOpaqueToken(token), "PASSWORD_RESET");
    if (!consumed) {
      throw new AppError(
        400,
        "Password reset token is invalid, expired, or already used",
        "INVALID_RESET_TOKEN"
      );
    }
    const passwordHash = await argon2.hash(newPassword, passwordOptions);
    const user = await userRepository.updatePasswordHash(consumed.userId, passwordHash);
    if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");
    await revokeAllUserSessions(user._id);
    await emailTokenRepository.invalidateActiveForUser(user._id, "PASSWORD_RESET");
    return { passwordReset: true, sessionsRevoked: true };
  }
};
