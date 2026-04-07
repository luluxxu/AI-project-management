export function route(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, _req, res, _next) {
  console.error(error);

  if (res.headersSent) {
    return;
  }

  res.status(error.statusCode || 500).json({
    error: error.message || "Internal server error",
  });
}
