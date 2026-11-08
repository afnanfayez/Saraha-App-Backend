import { AppError } from "../../common/errors/app-error.js";
import { userRepository } from "./user.repository.js";
import { removeStoredAvatar } from "./avatar-storage.js";
import { removeUploadedAvatar } from "./avatar-upload.middleware.js";

function publicUser(user) {
  const data = typeof user.toJSON === "function" ? user.toJSON() : user;
  return {
    id: String(data._id || data.id),
    name: data.name,
    username: data.username,
    email: data.email,
    role: data.role,
    isVerified: data.isVerified,
    isActive: data.isActive,
    bio: data.bio || "",
    avatarUrl: data.avatarUrl || "",
    settings: data.settings,
    publicProfileUrl: data.publicProfileUrl || "/api/v1/public/users/" + data.username,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt
  };
}

export const userService = {
  async getMe(userId) {
    const user = await userRepository.findById(userId);
    if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");
    return publicUser(user);
  },

  async updateProfile(userId, changes) {
    const user = await userRepository.updateProfile(userId, changes);
    if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");
    return publicUser(user);
  },

  async updateAvatar(userId, uploadedAvatar) {
    if (!uploadedAvatar) throw new AppError(422, "An avatar image is required", "AVATAR_REQUIRED");
    const current = await userRepository.findById(userId);
    if (!current) {
      await removeUploadedAvatar(uploadedAvatar);
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    try {
      const updated = await userRepository.updateAvatar(userId, uploadedAvatar.url);
      if (!updated) throw new AppError(404, "User not found", "USER_NOT_FOUND");
      if (current.avatarUrl !== uploadedAvatar.url) await removeStoredAvatar(current.avatarUrl);
      return publicUser(updated);
    } catch (error) {
      await removeUploadedAvatar(uploadedAvatar);
      throw error;
    }
  },

  async updateSettings(userId, acceptMessages) {
    const user = await userRepository.updateMessageSettings(userId, acceptMessages);
    if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");
    return publicUser(user);
  },

  async getPublicProfile(username) {
    const user = await userRepository.findPublicByUsername(username);
    if (!user) throw new AppError(404, "User not found", "USER_NOT_FOUND");
    return {
      name: user.name,
      username: user.username,
      bio: user.bio || "",
      avatarUrl: user.avatarUrl || "",
      acceptMessages: user.settings?.acceptMessages ?? true
    };
  }
};
