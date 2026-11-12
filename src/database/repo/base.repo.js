const baseRepo = (model) => ({
  findOne: async ({ filter = {}, projection = {}, options = {}, populate } = {}) => {
    const query = model.findOne(filter, projection, options)
    if (populate) query.populate(populate)
    return await query.exec()
  },

  findById: async ({ id, projection = {}, options = {}, populate } = {}) => {
    const query = model.findById(id, projection, options)
    if (populate) query.populate(populate)
    return await query.exec()
  },

  create: async ({ data, options = {} }) => {
    const [document] = await model.create([data], options)
    return document
  },

  updateOne: async ({ filter = {}, update = {}, options = {} }) => {
    return await model.updateOne(filter, update, options)
  },

  updateMany: async ({ filter = {}, update = {}, options = {} }) => {
    return await model.updateMany(filter, update, options)
  },

  deleteOne: async ({ filter = {}, options = {} }) => {
    return await model.deleteOne(filter, options)
  },

  deleteMany: async ({ filter = {}, options = {} }) => {
    return await model.deleteMany(filter, options)
  },

  findOneAndUpdate: async ({
    filter = {},
    update = {},
    projection = {},
    options = {},
    populate
  } = {}) => {
    const queryOptions = { ...options, returnDocument: 'after' }
    if (Object.keys(projection).length > 0) queryOptions.projection = projection

    const query = model.findOneAndUpdate(filter, update, queryOptions)
    if (populate) query.populate(populate)
    return await query.exec()
  },

  findByIdAndUpdate: async ({
    id,
    update = {},
    projection = {},
    options = {},
    populate
  } = {}) => {
    const queryOptions = { ...options, returnDocument: 'after' }
    if (Object.keys(projection).length > 0) queryOptions.projection = projection

    const query = model.findByIdAndUpdate(id, update, queryOptions)
    if (populate) query.populate(populate)
    return await query.exec()
  },

  findOneAndDelete: async ({
    filter = {},
    projection = {},
    options = {},
    populate
  } = {}) => {
    const queryOptions = { ...options }
    if (Object.keys(projection).length > 0) queryOptions.projection = projection
    const query = model.findOneAndDelete(filter, queryOptions)
    if (populate) query.populate(populate)
    return await query.exec()
  },

  findByIdAndDelete: async ({
    id,
    projection = {},
    options = {},
    populate
  } = {}) => {
    const queryOptions = { ...options }
    if (Object.keys(projection).length > 0) queryOptions.projection = projection
    const query = model.findByIdAndDelete(id, queryOptions)
    if (populate) query.populate(populate)
    return await query.exec()
  },

  find: async ({
    filter = {},
    projection = {},
    options = {},
    page = 1,
    limit = 10,
    sort,
    populate
  } = {}) => {
    page = Number(page) || 1
    limit = Number(limit) || 10
    const skip = (page - 1) * limit
    const query = model.find(filter, projection, options).skip(skip).limit(limit)
    if (sort) query.sort(sort)
    if (populate) query.populate(populate)
    return await query.exec()
  }
})

export default baseRepo
