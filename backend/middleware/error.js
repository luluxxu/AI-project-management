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

  if (typeof error?.message === "string") {
    const validationErrors = [
      "Invalid project status or priority",
      "Invalid task status or priority",
      "Invalid member role",
      "Task project must belong to the same workspace",
      "User name and email are required",
      "Workspace name is required",
      "Project name is required and end date must not be before start date",
      "Task title is required, effort must be between 1 and 8, and planned end must not be before planned start",
      "Workspace member role is invalid",
      "Join request status is invalid",
    ];

    if (validationErrors.includes(error.message)) {
      res.status(400).json({ error: error.message });
      return;
    }
  }

  res.status(error.statusCode || 500).json({
    error: error.message || "Internal server error",
  });
}
