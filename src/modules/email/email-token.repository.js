import mongoose from "mongoose";
import { EmailToken } from "../../database/models/email-token.model.js";
import { BaseRepository } from "../../database/repositories/base.repository.js";

class EmailTokenRepository extends BaseRepository {
  constructor() {
    super(EmailToken);
  }

  invalidateActiveForUser(userId, purpose, now = new Date()) {
    return EmailToken.updateMany({ userId, purpose, consumedAt: null }, { $set: { consumedAt: now } });
  }

  consume(tokenHash, purpose, now = new Date()) {
    return EmailToken.findOneAndUpdate(
      {
        tokenHash,
        purpose,
        consumedAt: null,
        expiresAt: mongoose.trusted({ $gt: now })
      },
      { $set: { consumedAt: now } },
      { returnDocument: "after" }
    )
      .select("userId purpose")
      .lean();
  }
}

export const emailTokenRepository = new EmailTokenRepository();
