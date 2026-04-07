// controllers/organizerController.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";

const fmtDateOnly = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-GB", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "TBA";

export const organizerDashboard = async (req, res, next) => {
  try {
    const courses = await CourseModel.list();
    
    // Enrich with session counts
    const courseCards = await Promise.all(
      courses.map(async (c) => {
        const sessions = await SessionModel.listByCourse(c._id);
        return {
          id: c._id,
          title: c.title,
          level: c.level,
          type: c.type,
          startDate: fmtDateOnly(c.startDate),
          endDate: fmtDateOnly(c.endDate),
          sessionsCount: sessions.length,
          description: c.description,
        };
      })
    );

    res.render("organizer/dashboard", {
      title: "Organizer Dashboard",
      year: new Date().getFullYear(),
      courses: courseCards,
      organizer: req.user,
    });
  } catch (err) {
    next(err);
  }
};

export const newCoursePage = (req, res) => {
  res.render("organizer/new_course", {
    title: "Create New Course",
    year: new Date().getFullYear(),
    organizer: req.user,
  });
};

export const postCreateCourse = async (req, res, next) => {
  try {
    const {
      title,
      level,
      type,
      allowDropIn,
      startDate,
      endDate,
      description,
      price,
      location,
    } = req.body;

    // Validation
    if (!title || !level || !type || !startDate || !endDate) {
      return res.render("organizer/new_course", {
        title: "Create New Course",
        year: new Date().getFullYear(),
        organizer: req.user,
        error: "Title, level, type, start date, and end date are required.",
        formData: req.body,
      });
    }

    const course = await CourseModel.create({
      title,
      level,
      type,
      allowDropIn: allowDropIn === "on" || allowDropIn === "true",
      startDate,
      endDate,
      description,
      price: price ? parseFloat(price) : null,
      location,
      instructorId: req.user._id,
      sessionIds: [],
    });

    res.redirect(`/organizer/courses/${course._id}`);
  } catch (err) {
    next(err);
  }
};

export const courseDetailsOrganizerPage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    
    if (!course) {
      return res.status(404).render("error", {
        title: "Not found",
        message: "Course not found.",
        year: new Date().getFullYear(),
      });
    }

    const sessions = await SessionModel.listByCourse(courseId);
    const sessionRows = sessions.map((s) => ({
      start: fmtDateTime(s.startDateTime),
      end: fmtDateTime(s.endDateTime),
      capacity: s.capacity,
      booked: s.bookedCount ?? 0,
      remaining: Math.max(0, (s.capacity ?? 0) - (s.bookedCount ?? 0)),
    }));

    res.render("organizer/course_details", {
      title: course.title,
      year: new Date().getFullYear(),
      organizer: req.user,
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: course.type,
        allowDropIn: course.allowDropIn,
        startDate: fmtDateOnly(course.startDate),
        endDate: fmtDateOnly(course.endDate),
        description: course.description,
        price: course.price,
        location: course.location,
      },
      sessionsCount: sessions.length,
      sessions: sessionRows,
    });
  } catch (err) {
    next(err);
  }
};

export const newSessionPage = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const course = await CourseModel.findById(courseId);
    
    if (!course) {
      return res.status(404).render("error", {
        title: "Not found",
        message: "Course not found.",
        year: new Date().getFullYear(),
      });
    }

    res.render("organizer/new_session", {
      title: "Add Session",
      year: new Date().getFullYear(),
      organizer: req.user,
      course: {
        id: course._id,
        title: course.title,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const postCreateSession = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { startDateTime, endDateTime, capacity } = req.body;

    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).render("error", {
        title: "Not found",
        message: "Course not found.",
        year: new Date().getFullYear(),
      });
    }

    // Validation
    if (!startDateTime || !endDateTime || !capacity) {
      return res.render("organizer/new_session", {
        title: "Add Session",
        year: new Date().getFullYear(),
        organizer: req.user,
        course: {
          id: course._id,
          title: course.title,
        },
        error: "Start time, end time, and capacity are required.",
        formData: req.body,
      });
    }

    const session = await SessionModel.create({
      courseId: courseId,
      startDateTime: new Date(startDateTime).toISOString(),
      endDateTime: new Date(endDateTime).toISOString(),
      capacity: parseInt(capacity, 10),
      bookedCount: 0,
    });

    // Add session ID to course
    const currentCourse = await CourseModel.findById(courseId);
    const sessionIds = currentCourse.sessionIds ? [...currentCourse.sessionIds, session._id] : [session._id];
    await CourseModel.update(courseId, { sessionIds });

    res.redirect(`/organizer/courses/${courseId}`);
  } catch (err) {
    next(err);
  }
};
