export function success(res, data, message = "Operation completed successfully", statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

export function pageInfo(page, limit, total) {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit)
  };
}
