import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { cleanupTestDb } from "./setup.js";

cleanupTestDb();

const { default: request } = await import("supertest");
const { default: app } = await import("../index.js");

afterAll(() => cleanupTestDb());

// admin@example.com is seeded by db.js with password "admin123"
let adminToken, adminUserId;
let userToken, userId;
let user2Token, user2Id;

beforeAll(async () => {
  // Login as seeded admin
  const adminRes = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: "admin@example.com", password: "admin123" });
  adminToken = adminRes.body.token;
  adminUserId = adminRes.body.user.id;

  // Register regular users
  const userRes = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "RegularUser", email: "regular@test.com", password: "pass1234" });
  userToken = userRes.body.token;
  userId = userRes.body.user.id;

  const user2Res = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "User2", email: "user2@test.com", password: "pass1234" });
  user2Token = user2Res.body.token;
  user2Id = user2Res.body.user.id;
});

describe("GET /api/v1/users", () => {
  it("admin can list all users", async () => {
    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(3); // admin + 2 registered
    // Should not expose password_hash
    expect(res.body[0].password_hash).toBeUndefined();
  });

  it("non-admin cannot list users", async () => {
    const res = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it("unauthenticated request is rejected", async () => {
    const res = await request(app).get("/api/v1/users");

    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/v1/users/:id", () => {
  it("admin can update user role to Admin", async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${userId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "Admin" });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("Admin");
  });

  it("admin can demote user back to Member", async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${userId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "Member" });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("Member");
  });

  it("non-admin cannot update roles", async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${user2Id}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ role: "Admin" });

    expect(res.status).toBe(403);
  });

  it("rejects invalid role value", async () => {
    const res = await request(app)
      .patch(`/api/v1/users/${userId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "SuperAdmin" });

    expect(res.status).toBe(400);
  });

  it("returns 404 for non-existent user", async () => {
    const res = await request(app)
      .patch("/api/v1/users/nonexistent")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ role: "Member" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/users/:id", () => {
  it("admin cannot delete themselves", async () => {
    const res = await request(app)
      .delete(`/api/v1/users/${adminUserId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot delete your own/i);
  });

  it("non-admin cannot delete users", async () => {
    const res = await request(app)
      .delete(`/api/v1/users/${user2Id}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  it("admin can delete another user", async () => {
    const res = await request(app)
      .delete(`/api/v1/users/${user2Id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);

    // Verify deleted
    const listRes = await request(app)
      .get("/api/v1/users")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(listRes.body.some((u) => u.id === user2Id)).toBe(false);
  });

  it("returns 404 for already-deleted user", async () => {
    const res = await request(app)
      .delete(`/api/v1/users/${user2Id}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
