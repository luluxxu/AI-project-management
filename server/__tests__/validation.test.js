import { describe, it, expect } from "vitest";
import {
  ensureObject,
  asTrimmedString,
  asEnum,
  asDateOnly,
  asInteger,
  asEmail,
  requireAtLeastOneField,
  validateProjectPayload,
  validateTaskPayload,
  validateWorkspacePayload,
  validateRegistrationPayload,
  validateLoginPayload,
  validateInvitationPayload,
  validateMemberRolePayload,
} from "../middleware/validation.js";

// ---------- ensureObject ----------
describe("ensureObject", () => {
  it("accepts a plain object", () => {
    expect(() => ensureObject({ a: 1 })).not.toThrow();
  });

  it("rejects null, undefined, array, string, number", () => {
    for (const bad of [null, undefined, [], "str", 42]) {
      expect(() => ensureObject(bad)).toThrow(/object/i);
    }
  });
});

// ---------- asTrimmedString ----------
describe("asTrimmedString", () => {
  it("trims whitespace", () => {
    expect(asTrimmedString("  hello  ", "f")).toBe("hello");
  });

  it("returns undefined when value is null/undefined and not required", () => {
    expect(asTrimmedString(null, "f")).toBeUndefined();
    expect(asTrimmedString(undefined, "f")).toBeUndefined();
  });

  it("throws when required and missing", () => {
    expect(() => asTrimmedString(null, "name", { required: true })).toThrow(/name is required/);
  });

  it("throws when required and blank after trim", () => {
    expect(() => asTrimmedString("   ", "name", { required: true })).toThrow(/name is required/);
  });

  it("throws when too long", () => {
    expect(() => asTrimmedString("a".repeat(200), "f", { max: 100 })).toThrow(/too long/i);
  });

  it("rejects non-string types", () => {
    expect(() => asTrimmedString(123, "f")).toThrow(/must be a string/);
  });

  it("returns empty string for blank non-required", () => {
    expect(asTrimmedString("   ", "f")).toBe("");
  });
});

// ---------- asEnum ----------
describe("asEnum", () => {
  const allowed = ["Low", "Medium", "High"];

  it("accepts a valid value", () => {
    expect(asEnum("Low", "priority", allowed)).toBe("Low");
  });

  it("returns undefined when not required and empty", () => {
    expect(asEnum(null, "p", allowed)).toBeUndefined();
    expect(asEnum("", "p", allowed)).toBeUndefined();
  });

  it("throws for invalid value", () => {
    expect(() => asEnum("Critical", "priority", allowed)).toThrow(/must be/);
  });

  it("throws when required and missing", () => {
    expect(() => asEnum(null, "priority", allowed, { required: true })).toThrow(/required/);
  });
});

// ---------- asDateOnly ----------
describe("asDateOnly", () => {
  it("accepts YYYY-MM-DD format", () => {
    expect(asDateOnly("2026-01-15", "date")).toBe("2026-01-15");
  });

  it("returns empty string for empty input", () => {
    expect(asDateOnly("", "date")).toBe("");
    expect(asDateOnly(null, "date")).toBe("");
  });

  it("rejects bad formats", () => {
    expect(() => asDateOnly("01/15/2026", "date")).toThrow(/YYYY-MM-DD/);
    expect(() => asDateOnly("2026-1-5", "date")).toThrow(/YYYY-MM-DD/);
    expect(() => asDateOnly("not-a-date", "date")).toThrow(/YYYY-MM-DD/);
  });

  it("throws when required and missing", () => {
    expect(() => asDateOnly(null, "date", { required: true })).toThrow(/required/);
  });
});

// ---------- asInteger ----------
describe("asInteger", () => {
  it("parses valid integers", () => {
    expect(asInteger(5, "effort")).toBe(5);
    expect(asInteger("3", "effort")).toBe(3);
  });

  it("returns undefined when not required and empty", () => {
    expect(asInteger(null, "effort")).toBeUndefined();
    expect(asInteger("", "effort")).toBeUndefined();
  });

  it("rejects non-integers", () => {
    expect(() => asInteger(3.5, "effort")).toThrow(/must be an integer/);
    expect(() => asInteger("abc", "effort")).toThrow(/must be an integer/);
  });

  it("enforces min/max bounds", () => {
    expect(() => asInteger(0, "effort", { min: 1 })).toThrow(/at least 1/);
    expect(() => asInteger(10, "effort", { max: 8 })).toThrow(/at most 8/);
  });

  it("throws when required and missing", () => {
    expect(() => asInteger(null, "effort", { required: true })).toThrow(/required/);
  });
});

// ---------- asEmail ----------
describe("asEmail", () => {
  it("accepts valid email and lowercases it", () => {
    expect(asEmail("USER@Example.COM", "email")).toBe("user@example.com");
  });

  it("rejects invalid emails", () => {
    expect(() => asEmail("not-an-email", "email")).toThrow(/valid email/);
    expect(() => asEmail("@no-local.com", "email")).toThrow(/valid email/);
    expect(() => asEmail("no-domain@", "email")).toThrow(/valid email/);
  });

  it("returns undefined when optional and missing", () => {
    expect(asEmail(null, "email")).toBeUndefined();
  });

  it("throws when required and missing", () => {
    expect(() => asEmail(null, "email", { required: true })).toThrow(/required/);
  });
});

// ---------- requireAtLeastOneField ----------
describe("requireAtLeastOneField", () => {
  it("passes when at least one field is defined", () => {
    expect(() => requireAtLeastOneField({ a: undefined, b: "x" }, ["a", "b"])).not.toThrow();
  });

  it("throws when all fields are undefined", () => {
    expect(() => requireAtLeastOneField({ a: undefined }, ["a"])).toThrow(/No fields to update/);
  });
});

// ---------- validateProjectPayload ----------
describe("validateProjectPayload", () => {
  const validProject = {
    name: "My Project",
    status: "Active",
    priority: "High",
  };

  it("accepts a valid full payload", () => {
    const result = validateProjectPayload(validProject);
    expect(result.name).toBe("My Project");
    expect(result.status).toBe("Active");
    expect(result.priority).toBe("High");
  });

  it("rejects missing required fields in full mode", () => {
    expect(() => validateProjectPayload({ status: "Active", priority: "Low" })).toThrow(/name is required/);
  });

  it("accepts partial update with at least one field", () => {
    const result = validateProjectPayload({ name: "Updated" }, { partial: true });
    expect(result.name).toBe("Updated");
  });

  it("accepts partial update with empty object (description defaults to empty string)", () => {
    // description gets `?? ""` so it counts as a defined field
    const result = validateProjectPayload({}, { partial: true });
    expect(result.description).toBe("");
  });

  it("rejects non-object body", () => {
    expect(() => validateProjectPayload(null)).toThrow(/object/i);
  });
});

// ---------- validateTaskPayload ----------
describe("validateTaskPayload", () => {
  const validTask = {
    projectId: "p-123",
    title: "Fix bug",
    status: "Todo",
    priority: "Medium",
    effort: 3,
  };

  it("accepts a valid full payload", () => {
    const result = validateTaskPayload(validTask);
    expect(result.title).toBe("Fix bug");
    expect(result.effort).toBe(3);
  });

  it("rejects invalid status", () => {
    expect(() => validateTaskPayload({ ...validTask, status: "Unknown" })).toThrow(/must be/);
  });

  it("rejects effort out of range", () => {
    expect(() => validateTaskPayload({ ...validTask, effort: 0 })).toThrow(/at least 1/);
    expect(() => validateTaskPayload({ ...validTask, effort: 9 })).toThrow(/at most 8/);
  });

  it("accepts camelCase and snake_case field names", () => {
    const snake = {
      project_id: "p-123",
      title: "Task",
      status: "Todo",
      priority: "Low",
      effort: 1,
      due_date: "2026-06-01",
      planned_start: "2026-05-01",
      planned_end: "2026-05-15",
    };
    const result = validateTaskPayload(snake);
    expect(result.projectId).toBe("p-123");
    expect(result.dueDate).toBe("2026-06-01");
  });
});

// ---------- validateWorkspacePayload ----------
describe("validateWorkspacePayload", () => {
  it("accepts valid workspace", () => {
    const result = validateWorkspacePayload({ name: "Team A" });
    expect(result.name).toBe("Team A");
    expect(result.description).toBe("");
  });

  it("rejects missing name", () => {
    expect(() => validateWorkspacePayload({ description: "desc" })).toThrow(/name is required/);
  });
});

// ---------- validateRegistrationPayload ----------
describe("validateRegistrationPayload", () => {
  it("accepts valid registration", () => {
    const result = validateRegistrationPayload({
      name: "Alice",
      email: "alice@test.com",
      password: "secret123",
    });
    expect(result.name).toBe("Alice");
    expect(result.email).toBe("alice@test.com");
  });

  it("rejects missing fields", () => {
    expect(() => validateRegistrationPayload({ name: "A" })).toThrow(/email is required/);
    expect(() => validateRegistrationPayload({ email: "a@b.com" })).toThrow(/name is required/);
  });
});

// ---------- validateLoginPayload ----------
describe("validateLoginPayload", () => {
  it("accepts valid login", () => {
    const result = validateLoginPayload({ email: "a@b.com", password: "pass" });
    expect(result.email).toBe("a@b.com");
  });

  it("rejects missing password", () => {
    expect(() => validateLoginPayload({ email: "a@b.com" })).toThrow(/password is required/);
  });
});

// ---------- validateInvitationPayload ----------
describe("validateInvitationPayload", () => {
  it("defaults role to Member", () => {
    const result = validateInvitationPayload({ email: "bob@test.com" });
    expect(result.role).toBe("Member");
  });

  it("rejects invalid role", () => {
    expect(() => validateInvitationPayload({ email: "b@t.com", role: "SuperAdmin" })).toThrow(/must be/);
  });
});

// ---------- validateMemberRolePayload ----------
describe("validateMemberRolePayload", () => {
  it("accepts valid roles", () => {
    for (const role of ["Owner", "Admin", "Member"]) {
      expect(validateMemberRolePayload({ role }).role).toBe(role);
    }
  });

  it("rejects invalid role", () => {
    expect(() => validateMemberRolePayload({ role: "Guest" })).toThrow(/must be/);
  });
});
