/**
 * Small reusable Mongoose repository base.
 * Feature repositories inherit the generic operations and add domain-specific queries.
 */
export class BaseRepository {
  constructor(model) {
    if (!model) throw new TypeError("A Mongoose model is required");
    this.model = model;
  }

  create(data) {
    return this.model.create(data);
  }

  findById(id, projection) {
    const query = this.model.findById(id);
    return projection ? query.select(projection) : query;
  }

  findOne(filter, projection) {
    const query = this.model.findOne(filter);
    return projection ? query.select(projection) : query;
  }

  countDocuments(filter = {}) {
    return this.model.countDocuments(filter);
  }

  deleteById(id) {
    return this.model.findByIdAndDelete(id);
  }
}
