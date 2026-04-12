import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { cleanupTestDb } from "./setup.js";

cleanupTestDb();

const { default: request } = await import("supertest");
const { default: app } = await import("../index.js");

afterAll(() => cleanupTestDb());

let ownerToken, ownerUserId;
let memberToken, memberUserId;
let outsiderToken;
let workspaceId;
let memberMembershipId; // the workspace_members row id for the "Member" user

beforeAll(async () => {
  const ownerRes = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Owner", email: "owner@test.com", password: "pass1234" });
  ownerToken = ownerRes.body.token;
  ownerUserId = ownerRes.body.user.id;

  const memberRes = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "MemberUser", email: "member@test.com", password: "pass1234" });
  memberToken = memberRes.body.token;
  memberUserId = memberRes.body.user.id;

  const outsiderRes = await request(app)
    .post("/api/v1/auth/register")
    .send({ name: "Outsider", email: "outsider@test.com", password: "pass1234" });
  outsiderToken = outsiderRes.body.token;

  // Create workspace
  const wsRes = await request(app)
    .post("/api/v1/workspaces")
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ name: "Members Test WS" });
  workspaceId = wsRes.body.id;

  // Add member
  const addRes = await request(app)
    .post(`/api/v1/workspaces/${workspaceId}/members`)
    .set("Authorization", `Bearer ${ownerToken}`)
    .send({ email: "member@test.com", role: "Member" });
  memberMembershipId = addRes.body.id;
});

describe("GET /api/v1/members/:wsId/members", () => {
  it("lists members for workspace member", async () => {
    const res = await request(app)
      .get(`/api/v1/members/${workspaceId}/members`)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(2);
  });

  it("blocks outsider", async () => {
    const res = await request(app)
      .get(`/api/v1/members/${workspaceId}/members`)
      .set("Authorization", `Bearer ${outsiderToken}`);

    expect(res.status).toBe(403);
  });
});

describe("PATCH /api/v1/members/:id", () => {
  it("owner can update member role", async () => {
    const res = await request(app)
      .patch(`/api/v1/members/${memberMembershipId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ role: "Admin" });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("Admin");
  });

  it("regular member cannot update roles", async () => {
    // Reset to Member first
    await request(app)
      .patch(`/api/v1/members/${memberMembershipId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ role: "Member" });

    const res = await request(app)
      .patch(`/api/v1/members/${memberMembershipId}`)
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ role: "Admin" });

    expect(res.status).toBe(403);
  });

  it("can update member name", async () => {
    // Promote to Admin so owner can update name
    const res = await request(app)
      .patch(`/api/v1/members/${memberMembershipId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ name: "Renamed Member" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Renamed Member");
  });

  it("returns 404 for non-existent membership", async () => {
    const res = await request(app)
      .patch("/api/v1/members/nonexistent-id")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ role: "Admin" });

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/members/:id", () => {
  it("cannot delete the Owner", async () => {
    // Find owner's membership id
    const listRes = await request(app)
      .get(`/api/v1/members/${workspaceId}/members`)
      .set("Authorization", `Bearer ${ownerToken}`);
    const ownerMembership = listRes.body.find((m) => m.user_id === ownerUserId);

    const res = await request(app)
      .delete(`/api/v1/members/${ownerMembership.id}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/owner/i);
  });

  it("owner can delete a member", async () => {
    const res = await request(app)
      .delete(`/api/v1/members/${memberMembershipId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);

    // Verify removed
    const listRes = await request(app)
      .get(`/api/v1/members/${workspaceId}/members`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(listRes.body.find((m) => m.id === memberMembershipId)).toBeUndefined();
  });

  it("returns 404 for already-deleted membership", async () => {
    const res = await request(app)
      .delete(`/api/v1/members/${memberMembershipId}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.status).toBe(404);
  });
});
