import { User } from "../../database/models/user.model.js";
import { BaseRepository } from "../../database/repositories/base.repository.js";

class UserRepository extends BaseRepository {
  constructor() {
    super(User);
  }

  findById(id) {
    return User.findById(id).select(
      "name username email role isVerified isActive bio avatarUrl settings createdAt updatedAt"
    );
  }

  findByEmail(email, includePasswordHash = false) {
    let query = User.findOne({ email: email.trim().toLowerCase() });
    if (includePasswordHash) query = query.select("+passwordHash");
    return query;
  }

  findExistingAccount(email, username) {
    return User.exists({ $or: [{ email }, { username }] });
  }

  findMessagingRecipient(username) {
    return User.findOne({ username: username.trim().toLowerCase(), isActive: true })
      .select("_id settings.acceptMessages")
      .lean();
  }

  findForAuthentication(id) {
    return User.findById(id).select("name username email role isActive");
  }

  findPublicByUsername(username) {
    return User.findOne({ username: username.trim().toLowerCase(), isActive: true })
      .select("name username bio avatarUrl settings.acceptMessages")
      .lean();
  }

  async updateProfile(id, changes) {
    const user = await User.findById(id);
    if (!user) return null;
    for (const key of ["name", "bio"]) {
      if (Object.hasOwn(changes, key)) user[key] = changes[key];
    }
    await user.save();
    return user;
  }

  async updateAvatar(id, avatarUrl) {
    const user = await User.findById(id);
    if (!user) return null;
    user.avatarUrl = avatarUrl;
    await user.save();
    return user;
  }

  async updateMessageSettings(id, acceptMessages) {
    const user = await User.findById(id);
    if (!user) return null;
    user.settings.acceptMessages = acceptMessages;
    await user.save();
    return user;
  }

  setVerified(id, isVerified) {
    return User.findByIdAndUpdate(
      id,
      { $set: { isVerified } },
      { returnDocument: "after", runValidators: true }
    );
  }

  async updatePasswordHash(id, passwordHash) {
    const user = await User.findById(id).select("+passwordHash");
    if (!user) return null;
    user.passwordHash = passwordHash;
    await user.save();
    return user;
  }

  setActiveStatus(id, isActive) {
    return User.findByIdAndUpdate(
      id,
      { $set: { isActive } },
      { returnDocument: "after", runValidators: true }
    ).select("name username email role isActive createdAt updatedAt");
  }

  async list({ page, limit, search }) {
    const filter = {};
    if (search) {
      const escaped = search.replace(/[.*+?^|()[\]\\]/g, "\\$&").replace(/\$/g, "\\$");
      filter.$or = [{ username: new RegExp(escaped, "i") }, { email: new RegExp(escaped, "i") }];
    }
    const [items, total] = await Promise.all([
      User.find(filter)
        .select("name username email role isActive createdAt")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);
    return { items, total };
  }
}

export const userRepository = new UserRepository();
