const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validationError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

export function ensureObject(value, message = "Request body must be a JSON object") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw validationError(message);
  }
  return value;
}

export function asTrimmedString(value, field, { required = false, max = 5000, allowEmpty = false } = {}) {
  if (value === undefined || value === null) {
    if (required) throw validationError(`${field} is required`);
    return undefined;
  }
  if (typeof value !== "string") throw validationError(`${field} must be a string`);

  const trimmed = value.trim();
  if (!allowEmpty && !trimmed.length) {
    if (required) throw validationError(`${field} is required`);
    return "";
  }
  if (trimmed.length > max) throw validationError(`${field} is too long`);
  return trimmed;
}

export function asEnum(value, field, allowed, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw validationError(`${field} is required`);
    return undefined;
  }
  if (!allowed.includes(value)) {
    throw validationError(`${field} must be ${allowed.join(", ")}`);
  }
  return value;
}

export function asDateOnly(value, field, { required = false } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw validationError(`${field} is required`);
    return "";
  }
  if (typeof value !== "string" || !ISO_DATE_RE.test(value)) {
    throw validationError(`${field} must be in YYYY-MM-DD format`);
  }
  return value;
}

export function asInteger(value, field, { required = false, min, max } = {}) {
  if (value === undefined || value === null || value === "") {
    if (required) throw validationError(`${field} is required`);
    return undefined;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw validationError(`${field} must be an integer`);
  if (min !== undefined && parsed < min) throw validationError(`${field} must be at least ${min}`);
  if (max !== undefined && parsed > max) throw validationError(`${field} must be at most ${max}`);
  return parsed;
}

export function asEmail(value, field = "email", { required = false } = {}) {
  const email = asTrimmedString(value, field, { required, max: 320 });
  if (email === undefined) return undefined;
  if (email === "") return "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw validationError(`${field} must be a valid email address`);
  }
  return email.toLowerCase();
}

export function requireAtLeastOneField(payload, fields, message = "No fields to update") {
  const hasAny = fields.some((field) => payload[field] !== undefined);
  if (!hasAny) throw validationError(message);
}

export function validateProjectPayload(body, { partial = false } = {}) {
  ensureObject(body);
  const payload = {
    name: asTrimmedString(body.name, "name", { required: !partial, max: 120 }),
    description: asTrimmedString(body.description, "description", { max: 2000 }) ?? "",
    status: asEnum(body.status, "status", ["Planning", "Active", "Completed", "On Hold", "Cancelled"], { required: !partial }),
    priority: asEnum(body.priority, "priority", ["Low", "Medium", "High"], { required: !partial }),
    startDate: asDateOnly(body.startDate ?? body.start_date, "startDate", { required: false }),
    endDate: asDateOnly(body.endDate ?? body.end_date, "endDate", { required: false }),
  };
  if (partial) {
    requireAtLeastOneField(payload, ["name", "description", "status", "priority", "startDate", "endDate"]);
  }
  return payload;
}

export function validateTaskPayload(body, { partial = false } = {}) {
  ensureObject(body);
  const payload = {
    projectId: asTrimmedString(body.projectId ?? body.project_id, "projectId", { required: !partial, max: 120 }),
    title: asTrimmedString(body.title, "title", { required: !partial, max: 160 }),
    description: asTrimmedString(body.description, "description", { max: 2000 }) ?? "",
    status: asEnum(body.status, "status", ["Todo", "In Progress", "Done"], { required: !partial }),
    priority: asEnum(body.priority, "priority", ["Low", "Medium", "High"], { required: !partial }),
    assigneeId: asTrimmedString(body.assigneeId ?? body.assignee_id, "assigneeId", { max: 120 }) ?? "",
    dueDate: asDateOnly(body.dueDate ?? body.due_date, "dueDate", { required: false }),
    effort: asInteger(body.effort, "effort", { required: !partial, min: 1, max: 8 }),
    plannedStart: asDateOnly(body.plannedStart ?? body.planned_start, "plannedStart", { required: false }),
    plannedEnd: asDateOnly(body.plannedEnd ?? body.planned_end, "plannedEnd", { required: false }),
  };
  if (partial) {
    requireAtLeastOneField(payload, [
      "projectId",
      "title",
      "description",
      "status",
      "priority",
      "assigneeId",
      "dueDate",
      "effort",
      "plannedStart",
      "plannedEnd",
    ]);
  }
  return payload;
}

export function validateWorkspacePayload(body) {
  ensureObject(body);
  return {
    name: asTrimmedString(body.name, "name", { required: true, max: 120 }),
    description: asTrimmedString(body.description, "description", { max: 1000 }) ?? "",
    isPublic: body.isPublic ? 1 : 0,
  };
}

export function validateMemberRolePayload(body) {
  ensureObject(body);
  return {
    role: asEnum(body.role, "role", ["Owner", "Admin", "Member"], { required: true }),
  };
}

export function validateInvitationPayload(body) {
  ensureObject(body);
  return {
    email: asEmail(body.email, "email", { required: true }),
    role: asEnum(body.role, "role", ["Owner", "Admin", "Member"], { required: false }) || "Member",
  };
}

export function validateInvitationResponsePayload(body) {
  ensureObject(body);
  return {
    action: asEnum(body.action, "action", ["accept", "reject"], { required: true }),
  };
}

export function validateJoinRequestPayload(body) {
  ensureObject(body);
  return {
    status: asEnum(body.status, "status", ["Approved", "Rejected"], { required: true }),
  };
}

export function validateRegistrationPayload(body) {
  ensureObject(body);
  return {
    name: asTrimmedString(body.name, "name", { required: true, max: 120 }),
    email: asEmail(body.email, "email", { required: true }),
    password: asTrimmedString(body.password, "password", { required: true, max: 200, allowEmpty: false }),
  };
}

export function validateLoginPayload(body) {
  ensureObject(body);
  return {
    email: asEmail(body.email, "email", { required: true }),
    password: asTrimmedString(body.password, "password", { required: true, max: 200, allowEmpty: false }),
  };
}

export function validateUserRolePayload(body) {
  ensureObject(body);
  return {
    role: asEnum(body.role, "role", ["Admin", "Member"], { required: true }),
  };
}

export function validateLegacyMemberUpdatePayload(body, { partial = false } = {}) {
  ensureObject(body);
  const payload = {
    name: asTrimmedString(body.name, "name", { max: 120 }),
    role: asEnum(body.role, "role", ["Owner", "Admin", "Member"], { required: false }),
    email: asEmail(body.email, "email", { required: false }),
  };
  if (partial) {
    requireAtLeastOneField(payload, ["name", "role", "email"]);
  }
  return payload;
}
