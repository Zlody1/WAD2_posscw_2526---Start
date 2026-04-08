// services/bookingService.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";

const canReserveAll = (sessions) =>
  sessions.every((s) => (s.bookedCount ?? 0) < (s.capacity ?? 0));

export async function bookCourseForUser(userId, courseId) {
  const course = await CourseModel.findById(courseId);
  if (!course) throw new Error("Course not found");
  const sessions = await SessionModel.listByCourse(courseId);
  if (sessions.length === 0) throw new Error("Course has no sessions");

  // Check if user already has a course booking for this course
  const existingBookings = await BookingModel.listByUser(userId);
  const existingCourseBooking = existingBookings.find(b =>
    b.courseId === courseId && b.type === "COURSE" && b.status !== "CANCELLED"
  );

  if (existingCourseBooking) {
    throw new Error("You are already enrolled in this course");
  }

  // Check which sessions the user has already booked individually
  const existingSessionBookings = existingBookings.filter(b =>
    b.courseId === courseId && b.type === "SESSION" && b.status !== "CANCELLED"
  );

  // If user has individual session bookings, cancel them and convert to course booking
  if (existingSessionBookings.length > 0) {
    // Cancel individual session bookings
    for (const booking of existingSessionBookings) {
      if (booking.status === "CONFIRMED") {
        // Decrement session counts for individually booked sessions
        for (const sessionId of booking.sessionIds) {
          await SessionModel.incrementBookedCount(sessionId, -1);
        }
      }
      await BookingModel.cancel(booking._id);
    }
  }

  // Now book all sessions for the course
  const canReserveAll = sessions.every((s) => (s.bookedCount ?? 0) < (s.capacity ?? 0));

  let status = "CONFIRMED";
  if (!canReserveAll) {
    status = "WAITLISTED";
  } else {
    for (const s of sessions) {
      await SessionModel.incrementBookedCount(s._id, 1);
    }
  }

  return BookingModel.create({
    userId,
    courseId,
    type: "COURSE",
    sessionIds: sessions.map((s) => s._id),
    status,
  });
}

export async function bookSessionForUser(userId, sessionId) {
  const session = await SessionModel.findById(sessionId);
  if (!session) throw new Error("Session not found");

  // Check if user already has a booking for this specific session (any type)
  const existingBookings = await BookingModel.listByUser(userId);
  const hasBookingForSession = existingBookings.some(b =>
    b.sessionIds.includes(sessionId) && b.status !== "CANCELLED"
  );

  if (hasBookingForSession) {
    const err = new Error("You are already booked for this session");
    err.code = "ALREADY_BOOKED";
    throw err;
  }

  // If session belongs to a course, check if user already has course booking
  if (session.courseId) {
    const course = await CourseModel.findById(session.courseId);
    if (!course) throw new Error("Course not found");

    if (!course.allowDropIn && course.type === "WEEKLY_BLOCK") {
      const err = new Error("Drop-in bookings are not allowed for this course");
      err.code = "DROPIN_NOT_ALLOWED";
      throw err;
    }
  }

  let status = "CONFIRMED";
  if ((session.bookedCount ?? 0) >= (session.capacity ?? 0)) {
    status = "WAITLISTED";
  } else {
    await SessionModel.incrementBookedCount(session._id, 1);
  }

  const bookingData = {
    userId,
    courseId: session.courseId || null,
    type: "SESSION",
    sessionIds: [session._id],
    status,
  };

  // Validation to prevent incorrect booking creation
  if (bookingData.type !== "SESSION" || bookingData.sessionIds.length !== 1) {
    throw new Error("Invalid session booking data");
  }

  return BookingModel.create(bookingData);
}
