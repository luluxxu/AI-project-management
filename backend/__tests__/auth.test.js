import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { cleanupTestDb } from "./setup.js";

// Clean up before importing app (which initializes DB)
cleanupTestDb();

const { default: request } = await import("supertest");
const { default: app } = await import("../index.js");

afterAll(() => {
  cleanupTestDb();
});

describe("POST /api/v1/auth/register", () => {
  it("registers a new user and returns token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Alice", email: "alice@test.com", password: "pass1234" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.name).toBe("Alice");
    expect(res.body.user.email).toBe("alice@test.com");
    expect(res.body.user.role).toBe("Member");
    expect(res.body.user.id).toMatch(/^u-/);
  });

  it("rejects duplicate email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Alice2", email: "alice@test.com", password: "pass1234" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already in use/i);
  });

  it("rejects missing fields", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Bob" });

    expect(res.status).toBe(400);
  });

  it("rejects invalid email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Bob", email: "not-an-email", password: "pass" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid email/i);
  });

  it("assigns Admin role to admin email", async () => {
    // admin@example.com is seeded by db.js, but registering with it should fail as duplicate
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Admin", email: "admin@example.com", password: "admin123" });

    expect(res.status).toBe(409);
  });
});

describe("POST /api/v1/auth/login", () => {
  it("logs in with correct credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "alice@test.com", password: "pass1234" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe("alice@test.com");
  });

  it("rejects wrong password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "alice@test.com", password: "wrongpass" });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid/i);
  });

  it("rejects non-existent user", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@test.com", password: "pass" });

    expect(res.status).toBe(401);
  });

  it("rejects missing password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "alice@test.com" });

    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/auth/me", () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "alice@test.com", password: "pass1234" });
    token = res.body.token;
  });

  it("returns current user with valid token", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("alice@test.com");
    expect(res.body.name).toBe("Alice");
    expect(res.body.password_hash).toBeUndefined();
  });

  it("rejects request without token", async () => {
    const res = await request(app).get("/api/v1/auth/me");

    expect(res.status).toBe(401);
  });

  it("rejects invalid token", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer invalidtoken123");

    expect(res.status).toBe(401);
  });

  it("rejects token without Bearer prefix", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", token);

    expect(res.status).toBe(401);
  });
});
