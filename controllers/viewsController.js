// controllers/viewsController.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import {
  bookCourseForUser,
  bookSessionForUser,
} from "../services/bookingService.js";
import { BookingModel } from "../models/bookingModel.js";

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const fmtDateOnly = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

export const homePage = async (req, res, next) => {
  try {
    const courses = await CourseModel.list();
    const cards = await Promise.all(
      courses.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        const nextSession = sessions[0];
        return {
          id: c._id,
          title: c.title,
          level: c.level,
          type: c.type,
          allowDropIn: c.allowDropIn,
          startDate: c.startDate ? fmtDateOnly(c.startDate) : "",
          endDate: c.endDate ? fmtDateOnly(c.endDate) : "",
          nextSession: nextSession ? fmtDate(nextSession.startDateTime) : "TBA",
          sessionsCount: sessions.length,
          description: c.description,
          price: c.price,
          location: c.location,
        };
      })
    );
    res.render("home", { 
      title: "Yoga Courses", 
      year: new Date().getFullYear(), 
      courses: cards,
      isOrganizer: req.user?.role === "organizer"
    });
  } catch (err) {
    next(err);
  }
};

export const courseDetailPage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found", year: new Date().getFullYear() });

    const sessions = await SessionModel.listByCourse(courseId);
    const rows = sessions.map((s) => ({
      id: s._id,
      start: fmtDate(s.startDateTime),
      end: fmtDate(s.endDateTime),
      capacity: s.capacity,
      booked: s.bookedCount ?? 0,
      remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
    }));

    res.render("course", {
      title: course.title,
      year: new Date().getFullYear(),
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: course.type,
        allowDropIn: course.allowDropIn,
        startDate: course.startDate ? fmtDateOnly(course.startDate) : "",
        endDate: course.endDate ? fmtDateOnly(course.endDate) : "",
        description: course.description,
        price: course.price,
        location: course.location,
      },
      sessions: rows,
      isOrganizer: req.user?.role === "organizer"
    });
  } catch (err) {
    next(err);
  }
};

export const courseBookingPage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    if (!course)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Course not found", year: new Date().getFullYear() });

    const sessions = await SessionModel.listByCourse(courseId);
    const rows = sessions.map((s) => ({
      id: s._id,
      start: fmtDate(s.startDateTime),
      end: fmtDate(s.endDateTime),
      capacity: s.capacity,
      booked: s.bookedCount ?? 0,
      remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
    }));

    res.render("course_book", {
      title: `Book: ${course.title}`,
      year: new Date().getFullYear(),
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: course.type,
        allowDropIn: course.allowDropIn,
        startDate: course.startDate ? fmtDateOnly(course.startDate) : "",
        endDate: course.endDate ? fmtDateOnly(course.endDate) : "",
        description: course.description,
      },
      sessions: rows,
      sessionsCount: sessions.length,
    });
  } catch (err) {
    next(err);
  }
};

export const postBookCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { name, email, consent } = req.body;
    
    // Validation
    const errors = [];
    if (!name || name.trim().length === 0) {
      errors.push("Full name is required");
    }
    if (!email || email.trim().length === 0) {
      errors.push("Email is required");
    } else if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.push("Please enter a valid email address");
    }
    if (!consent) {
      errors.push("You must agree to the booking terms");
    }
    
    // Return form with errors if validation fails
    if (errors.length > 0) {
      const course = await CourseModel.findById(courseId);
      const sessions = await SessionModel.listByCourse(courseId);
      const rows = sessions.map((s) => ({
        id: s._id,
        start: fmtDate(s.startDateTime),
        end: fmtDate(s.endDateTime),
        capacity: s.capacity,
        booked: s.bookedCount ?? 0,
        remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
      }));
      
      return res.status(400).render("course_book", {
        title: `Book: ${course.title}`,
        year: new Date().getFullYear(),
        errors: { list: errors },
        course: {
          id: course._id,
          title: course.title,
          level: course.level,
          type: course.type,
          allowDropIn: course.allowDropIn,
          startDate: course.startDate ? fmtDateOnly(course.startDate) : "",
          endDate: course.endDate ? fmtDateOnly(course.endDate) : "",
          description: course.description,
        },
        sessions: rows,
        sessionsCount: sessions.length,
        user: { _id: req.user._id, name, email },
        notes: req.body.notes || "",
      });
    }
    
    const booking = await bookCourseForUser(req.user._id, courseId);
    res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
  } catch (err) {
    res
      .status(400)
      .render("error", { title: "Booking failed", message: err.message, year: new Date().getFullYear() });
  }
};

export const postBookSession = async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const booking = await bookSessionForUser(req.user._id, sessionId);
    res.redirect(`/bookings/${booking._id}?status=${booking.status}`);
  } catch (err) {
    const message =
      err.code === "DROPIN_NOT_ALLOWED"
        ? "Drop-ins are not allowed for this course."
        : err.message;
    res.status(400).render("error", { title: "Booking failed", message, year: new Date().getFullYear() });
  }
};

export const bookingConfirmationPage = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await BookingModel.findById(bookingId);
    if (!booking)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Booking not found", year: new Date().getFullYear() });

    res.render("booking_confirmation", {
      title: "Booking confirmation",
      year: new Date().getFullYear(),
      booking: {
        id: booking._id,
        type: booking.type,
        status: req.query.status || booking.status,
        createdAt: booking.createdAt ? fmtDate(booking.createdAt) : "",
      },
      isCancelled: (req.query.status || booking.status) === "CANCELLED",
    });
  } catch (err) {
    next(err);
  }
};

export const bookingDetailsPage = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await BookingModel.findById(bookingId);
    if (!booking)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Booking not found", year: new Date().getFullYear() });

    // Get session details if it's a course booking
    let sessionsList = [];
    if (booking.type === "COURSE" && booking.sessionIds) {
      for (const sessionId of booking.sessionIds) {
        const session = await SessionModel.findById(sessionId);
        if (session) {
          sessionsList.push(fmtDate(session.startDateTime));
        }
      }
    }

    res.render("booking_details", {
      title: "Booking Details",
      year: new Date().getFullYear(),
      booking: {
        id: booking._id,
        courseName: booking.courseName || "Course",
        type: booking.type,
        status: booking.status,
        createdAt: booking.createdAt ? fmtDate(booking.createdAt) : "",
        sessions: sessionsList,
        canCancel: booking.status !== "CANCELLED",
      },
    });
  } catch (err) {
    next(err);
  }
};

export const postCancelBooking = async (req, res, next) => {
  try {
    const bookingId = req.params.bookingId;
    const booking = await BookingModel.findById(bookingId);
    if (!booking)
      return res
        .status(404)
        .render("error", { title: "Not found", message: "Booking not found", year: new Date().getFullYear() });

    if (booking.status === "CANCELLED") {
      return res.render("error", {
        title: "Cannot cancel",
        message: "This booking has already been cancelled",
        year: new Date().getFullYear(),
      });
    }

    // Update booked counts for sessions
    if (booking.status === "CONFIRMED" && booking.sessionIds) {
      for (const sessionId of booking.sessionIds) {
        await SessionModel.incrementBookedCount(sessionId, -1);
      }
    }

    // Cancel the booking
    const updated = await BookingModel.cancel(bookingId);

    res.render("booking_confirmation", {
      title: "Booking Cancelled",
      year: new Date().getFullYear(),
      booking: {
        id: updated._id,
        type: updated.type,
        status: "CANCELLED",
        createdAt: updated.createdAt ? fmtDate(updated.createdAt) : "",
        message: "Your booking has been successfully cancelled.",
      },
    });
  } catch (err) {
    next(err);
  }
};
