// tests/routes.bookings.test.js
import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal } from "./helpers.js";
import { UserModel } from "../models/userModel.js";
import { SessionModel } from "../models/sessionModel.js";

describe("Booking route edge cases", () => {
  let data;
  let student;
  let otherStudent;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
    student = data.student;
    otherStudent = await UserModel.create({
      name: "Other Student",
      email: "other@student.local",
      role: "student",
    });
  });

  test("POST /api/bookings/course → 400 when courseId is missing", async () => {
    const res = await request(app)
      .post("/api/bookings/course")
      .set("Cookie", `userId=${student._id}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test("POST /api/bookings/session → 400 when sessionId is missing", async () => {
    const res = await request(app)
      .post("/api/bookings/session")
      .set("Cookie", `userId=${student._id}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test("POST /api/bookings/course → 400 on duplicate course booking", async () => {
    // First booking should succeed
    const first = await request(app)
      .post("/api/bookings/course")
      .set("Cookie", `userId=${student._id}`)
      .send({ courseId: data.course._id });
    expect(first.status).toBe(201);

    // Second should be rejected
    const second = await request(app)
      .post("/api/bookings/course")
      .set("Cookie", `userId=${student._id}`)
      .send({ courseId: data.course._id });
    expect(second.status).toBe(400);
    expect(second.body.error).toMatch(/already enrolled/i);
  });

  test("DELETE /api/bookings/:id → 403 when cancelling another user's booking", async () => {
    // Make a standalone session and book it as student
    const session = await SessionModel.create({
      courseId: null,
      startDateTime: new Date("2026-07-01T10:00:00").toISOString(),
      endDateTime: new Date("2026-07-01T11:00:00").toISOString(),
      capacity: 10,
      bookedCount: 0,
    });
    const create = await request(app)
      .post("/api/bookings/session")
      .set("Cookie", `userId=${student._id}`)
      .send({ sessionId: session._id });
    expect(create.status).toBe(201);
    const bookingId = create.body.booking._id;

    // Other student tries to cancel it
    const res = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set("Cookie", `userId=${otherStudent._id}`);
    expect(res.status).toBe(403);
  });

  test("DELETE /api/bookings/:id → 200 with CANCELLED status when booking is already cancelled", async () => {
    const session = await SessionModel.create({
      courseId: null,
      startDateTime: new Date("2026-07-08T10:00:00").toISOString(),
      endDateTime: new Date("2026-07-08T11:00:00").toISOString(),
      capacity: 10,
      bookedCount: 0,
    });
    const create = await request(app)
      .post("/api/bookings/session")
      .set("Cookie", `userId=${otherStudent._id}`)
      .send({ sessionId: session._id });
    expect(create.status).toBe(201);
    const bookingId = create.body.booking._id;

    // Cancel once
    await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set("Cookie", `userId=${otherStudent._id}`);

    // Cancel again — should still return 200 (idempotent)
    const res = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set("Cookie", `userId=${otherStudent._id}`);
    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe("CANCELLED");
  });

  test("DELETE /api/bookings/:id → 404 for nonexistent booking", async () => {
    const res = await request(app)
      .delete("/api/bookings/does-not-exist")
      .set("Cookie", `userId=${student._id}`);
    expect(res.status).toBe(404);
  });

  test("POST /api/bookings/course → 400 for nonexistent course", async () => {
    const res = await request(app)
      .post("/api/bookings/course")
      .set("Cookie", `userId=${otherStudent._id}`)
      .send({ courseId: "nonexistent-course" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not found/i);
  });

  test("POST /api/bookings/session → 400 for nonexistent session", async () => {
    const res = await request(app)
      .post("/api/bookings/session")
      .set("Cookie", `userId=${otherStudent._id}`)
      .send({ sessionId: "nonexistent-session" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not found/i);
  });
});
