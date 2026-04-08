// tests/bookingService.test.js
import { describe, expect, test, beforeEach } from "@jest/globals";
import { bookCourseForUser, bookSessionForUser } from "../services/bookingService.js";
import { resetDb, seedMinimal } from "./helpers.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";
import { CourseModel } from "../models/courseModel.js";
import { UserModel } from "../models/userModel.js";

describe("bookCourseForUser", () => {
  let data;

  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
  });

  test("returns CONFIRMED booking with all sessionIds when capacity is available", async () => {
    const booking = await bookCourseForUser(data.student._id, data.course._id);
    expect(booking.type).toBe("COURSE");
    expect(booking.status).toBe("CONFIRMED");
    expect(booking.sessionIds).toHaveLength(data.sessions.length);
    expect(booking.userId).toBe(data.student._id);
    expect(booking.courseId).toBe(data.course._id);
  });

  test("increments bookedCount on all sessions when CONFIRMED", async () => {
    await bookCourseForUser(data.student._id, data.course._id);
    const s1 = await SessionModel.findById(data.sessions[0]._id);
    const s2 = await SessionModel.findById(data.sessions[1]._id);
    expect(s1.bookedCount).toBe(1);
    expect(s2.bookedCount).toBe(1);
  });

  test("returns WAITLISTED booking when any session is full", async () => {
    // Fill session 1 to capacity
    await SessionModel.incrementBookedCount(data.sessions[0]._id, 18);

    const booking = await bookCourseForUser(data.student._id, data.course._id);
    expect(booking.status).toBe("WAITLISTED");
  });

  test("does not increment bookedCount when WAITLISTED", async () => {
    await SessionModel.incrementBookedCount(data.sessions[0]._id, 18);
    await bookCourseForUser(data.student._id, data.course._id);

    const s1 = await SessionModel.findById(data.sessions[0]._id);
    expect(s1.bookedCount).toBe(18); // unchanged
  });

  test("throws if course does not exist", async () => {
    await expect(
      bookCourseForUser(data.student._id, "nonexistent-course")
    ).rejects.toThrow("Course not found");
  });

  test("throws if course has no sessions", async () => {
    const emptyCourse = await CourseModel.create({
      title: "Empty Course",
      level: "beginner",
      type: "WEEKLY_BLOCK",
      allowDropIn: true,
      startDate: "2026-05-01",
      endDate: "2026-05-30",
      instructorId: data.instructor._id,
      sessionIds: [],
      description: "No sessions yet.",
    });

    await expect(
      bookCourseForUser(data.student._id, emptyCourse._id)
    ).rejects.toThrow("Course has no sessions");
  });

  test("throws if user already has an active course booking", async () => {
    await bookCourseForUser(data.student._id, data.course._id);
    await expect(
      bookCourseForUser(data.student._id, data.course._id)
    ).rejects.toThrow("already enrolled");
  });

  test("cancels existing individual session bookings and upgrades to course booking", async () => {
    // Book one session individually first
    await bookSessionForUser(data.student._id, data.sessions[0]._id);

    const courseBooking = await bookCourseForUser(data.student._id, data.course._id);
    expect(courseBooking.type).toBe("COURSE");

    // The individual booking should now be cancelled
    const allBookings = await BookingModel.listByUser(data.student._id);
    const sessionBookings = allBookings.filter(
      (b) => b.type === "SESSION" && b.status !== "CANCELLED"
    );
    expect(sessionBookings).toHaveLength(0);
  });
});

describe("bookSessionForUser", () => {
  let data;

  beforeEach(async () => {
    process.env.NODE_ENV = "test";
    await resetDb();
    data = await seedMinimal();
  });

  test("returns CONFIRMED booking for an available session", async () => {
    const booking = await bookSessionForUser(data.student._id, data.sessions[0]._id);
    expect(booking.type).toBe("SESSION");
    expect(booking.status).toBe("CONFIRMED");
    expect(booking.sessionIds).toEqual([data.sessions[0]._id]);
  });

  test("increments session bookedCount when CONFIRMED", async () => {
    await bookSessionForUser(data.student._id, data.sessions[0]._id);
    const session = await SessionModel.findById(data.sessions[0]._id);
    expect(session.bookedCount).toBe(1);
  });

  test("returns WAITLISTED when session is at capacity", async () => {
    await SessionModel.incrementBookedCount(data.sessions[0]._id, 18);
    const booking = await bookSessionForUser(data.student._id, data.sessions[0]._id);
    expect(booking.status).toBe("WAITLISTED");
  });

  test("does not increment bookedCount when WAITLISTED", async () => {
    await SessionModel.incrementBookedCount(data.sessions[0]._id, 18);
    await bookSessionForUser(data.student._id, data.sessions[0]._id);
    const session = await SessionModel.findById(data.sessions[0]._id);
    expect(session.bookedCount).toBe(18); // unchanged
  });

  test("throws ALREADY_BOOKED when user books the same session twice", async () => {
    await bookSessionForUser(data.student._id, data.sessions[0]._id);
    const err = await bookSessionForUser(data.student._id, data.sessions[0]._id)
      .catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("ALREADY_BOOKED");
  });

  test("throws if session does not exist", async () => {
    await expect(
      bookSessionForUser(data.student._id, "nonexistent-session")
    ).rejects.toThrow("Session not found");
  });

  test("throws DROPIN_NOT_ALLOWED for WEEKLY_BLOCK course with allowDropIn=false", async () => {
    const noDropInCourse = await CourseModel.create({
      title: "No Drop-In Course",
      level: "intermediate",
      type: "WEEKLY_BLOCK",
      allowDropIn: false,
      startDate: "2026-05-01",
      endDate: "2026-05-30",
      instructorId: data.instructor._id,
      sessionIds: [],
      description: "Drop-in not allowed.",
    });
    const session = await SessionModel.create({
      courseId: noDropInCourse._id,
      startDateTime: new Date("2026-05-05T18:00:00").toISOString(),
      endDateTime: new Date("2026-05-05T19:00:00").toISOString(),
      capacity: 10,
      bookedCount: 0,
    });

    const err = await bookSessionForUser(data.student._id, session._id).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("DROPIN_NOT_ALLOWED");
  });

  test("throws ALREADY_BOOKED when user already has a course booking covering this session", async () => {
    // Book the whole course first
    await bookCourseForUser(data.student._id, data.course._id);

    // Try to book an individual session from that course
    const err = await bookSessionForUser(data.student._id, data.sessions[1]._id).catch(
      (e) => e
    );
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe("ALREADY_BOOKED");
  });

  test("allows booking a standalone session (no courseId)", async () => {
    const standalone = await SessionModel.create({
      courseId: null,
      startDateTime: new Date("2026-06-01T10:00:00").toISOString(),
      endDateTime: new Date("2026-06-01T11:00:00").toISOString(),
      capacity: 5,
      bookedCount: 0,
    });
    const booking = await bookSessionForUser(data.student._id, standalone._id);
    expect(booking.status).toBe("CONFIRMED");
    expect(booking.courseId).toBeNull();
  });
});
