import mongoose from "mongoose";
import { RefreshSession } from "../../database/models/refresh-session.model.js";
import { BaseRepository } from "../../database/repositories/base.repository.js";

class RefreshSessionRepository extends BaseRepository {
  constructor() {
    super(RefreshSession);
  }

  findByHash(tokenHash) {
    return RefreshSession.findOne({ tokenHash }).select("+tokenHash").lean();
  }

  findActive(id, userId, now = new Date()) {
    return RefreshSession.findOne({
      _id: id,
      userId,
      revokedAt: null,
      expiresAt: mongoose.trusted({ $gt: now })
    }).lean();
  }

  revokeActive(id, now = new Date()) {
    return RefreshSession.findOneAndUpdate(
      { _id: id, revokedAt: null, expiresAt: mongoose.trusted({ $gt: now }) },
      { $set: { revokedAt: now } },
      { returnDocument: "before" }
    ).lean();
  }

  revokeAllForUser(userId, now = new Date()) {
    return RefreshSession.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: now } });
  }

  setReplacement(id, replacedBy) {
    return RefreshSession.updateOne({ _id: id }, { $set: { replacedBy } });
  }

  revokeFamily(familyId, now = new Date()) {
    return RefreshSession.updateMany({ familyId, revokedAt: null }, { $set: { revokedAt: now } });
  }

  revokeUserSession(id, userId, now = new Date()) {
    return RefreshSession.findOneAndUpdate(
      { _id: id, userId, revokedAt: null },
      { $set: { revokedAt: now } },
      { returnDocument: "after" }
    ).lean();
  }
}

export const refreshSessionRepository = new RefreshSessionRepository();
