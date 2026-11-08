import { Report } from "../../database/models/report.model.js";
import { BaseRepository } from "../../database/repositories/base.repository.js";

class ReportRepository extends BaseRepository {
  constructor() {
    super(Report);
  }

  async list({ page, limit, status }) {
    const filter = status ? { status } : {};
    const [items, total] = await Promise.all([
      Report.find(filter)
        .populate("reporterUserId", "username email")
        .populate({
          path: "messageId",
          select: "recipient isRead createdAt",
          populate: { path: "recipient", select: "username" }
        })
        .populate("reviewedBy", "username")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Report.countDocuments(filter)
    ]);
    return { items, total };
  }

  review(id, reviewedBy, status) {
    return Report.findByIdAndUpdate(
      id,
      { $set: { status, reviewedBy, reviewedAt: new Date() } },
      { returnDocument: "after", runValidators: true }
    );
  }
}

export const reportRepository = new ReportRepository();
