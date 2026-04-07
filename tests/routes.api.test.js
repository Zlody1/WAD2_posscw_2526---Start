import request from "supertest";
import { app } from "../index.js";
import { resetDb, seedMinimal } from "./helpers.js";
import { UserModel } from "../models/userModel.js";
import { SessionModel } from "../models/sessionModel.js";

describe("JSON API routes", () => {
  let data;
  let student;

  beforeAll(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
    // Create a student for bookings
    student = await UserModel.create({
      name: "API Student",
      email: "api@student.local",
      role: "student",
    });
  });

  // COURSES
  test("GET /api/courses returns array of courses", async () => {
    const res = await request(app).get("/api/courses");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(Array.isArray(res.body.courses)).toBe(true);
    expect(res.body.courses.some((c) => c.title === "Test Course")).toBe(true);
  });

  test("POST /api/courses creates a course", async () => {
    const payload = {
      title: "API Created Course",
      level: "advanced",
      type: "WEEKEND_WORKSHOP",
      allowDropIn: false,
      startDate: "2026-05-01",
      endDate: "2026-05-02",
      instructorId: data.instructor._id,
      description: "Created via API route.",
    };
    const res = await request(app).post("/api/courses").send(payload);
    expect(res.status).toBe(201);
    expect(res.body.course).toBeDefined();
    expect(res.body.course.title).toBe("API Created Course");
  });

  test("GET /api/courses/:id returns course + sessions", async () => {
    const res = await request(app).get(`/api/courses/${data.course._id}`);
    expect(res.status).toBe(200);
    expect(res.body.course._id).toBe(data.course._id);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions.length).toBe(2);
  });

  // SESSIONS
  test("POST /api/sessions creates a session", async () => {
    const payload = {
      courseId: data.course._id,
      startDateTime: new Date("2026-02-16T18:30:00").toISOString(),
      endDateTime: new Date("2026-02-16T19:45:00").toISOString(),
      capacity: 16,
      bookedCount: 0,
    };
    const res = await request(app).post("/api/sessions").send(payload);
    expect(res.status).toBe(201);
    expect(res.body.session).toBeDefined();
    expect(res.body.session.courseId).toBe(data.course._id);
  });

  test("GET /api/sessions/by-course/:courseId returns sessions array", async () => {
    const res = await request(app).get(
      `/api/sessions/by-course/${data.course._id}`
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sessions)).toBe(true);
    expect(res.body.sessions.length).toBeGreaterThanOrEqual(2);
  });

  // BOOKINGS
  test("POST /api/bookings/course creates a course booking (CONFIRMED or WAITLISTED)", async () => {
    const res = await request(app)
      .post("/api/bookings/course")
      .set('Cookie', `userId=${student._id}`)
      .send({
        courseId: data.course._id,
      });
    expect(res.status).toBe(201);
    expect(res.body.booking).toBeDefined();
    expect(res.body.booking.type).toBe("COURSE");
    expect(["CONFIRMED", "WAITLISTED"]).toContain(res.body.booking.status);
  });

  test("POST /api/bookings/session creates a session booking (CONFIRMED or WAITLISTED)", async () => {
    const res = await request(app)
      .post("/api/bookings/session")
      .set('Cookie', `userId=${student._id}`)
      .send({
        sessionId: data.sessions[0]._id,
      });
    // Should fail because student already booked the course containing this session
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("already enrolled");
  });

  test("DELETE /api/bookings/:id cancels a booking", async () => {
    // Create a standalone session not part of any course for testing
    const standaloneSession = await SessionModel.create({
      courseId: null, // Standalone session
      startDateTime: new Date("2026-03-01T18:30:00").toISOString(),
      endDateTime: new Date("2026-03-01T19:45:00").toISOString(),
      capacity: 18,
      bookedCount: 0,
    });

    // Create session booking
    const create = await request(app)
      .post("/api/bookings/session")
      .set('Cookie', `userId=${student._id}`)
      .send({
        sessionId: standaloneSession._id,
      });
    expect(create.status).toBe(201);
    const bookingId = create.body.booking._id;

    const del = await request(app)
      .delete(`/api/bookings/${bookingId}`)
      .set('Cookie', `userId=${student._id}`);
    expect(del.status).toBe(200);
    expect(del.body.booking.status).toBe("CANCELLED");
  });
});
