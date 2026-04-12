/**
 * Parse pagination query params.
 *
 * @param {object} query  — req.query
 * @param {object} opts
 * @param {number} opts.defaultLimit — default items per page when paginated (default 20)
 * @param {number} opts.maxLimit     — hard cap (default 100)
 * @returns {{ paginate: boolean, page: number, limit: number, offset: number }}
 */
export function parsePagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const rawPage = query.page;
  const rawLimit = query.limit;

  // If neither page nor limit is provided, skip pagination (return all)
  if (rawPage === undefined && rawLimit === undefined) {
    return { paginate: false, page: 1, limit: 0, offset: 0 };
  }

  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(rawLimit, 10) || defaultLimit));
  const offset = (page - 1) * limit;

  return { paginate: true, page, limit, offset };
}

/**
 * Set pagination headers and return paginated response.
 */
export function paginatedResponse(res, { rows, total, page, limit }) {
  res.setHeader("X-Total-Count", total);
  res.setHeader("X-Page", page);
  res.setHeader("X-Limit", limit);
  res.setHeader("X-Total-Pages", Math.ceil(total / limit) || 1);
  return res.json(rows);
}
