// controllers/organizerController.js
import { CourseModel } from "../models/courseModel.js";
import { SessionModel } from "../models/sessionModel.js";
import { BookingModel } from "../models/bookingModel.js";
import { UserModel } from "../models/userModel.js";

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
          sessionsPlural: sessions.length !== 1,
          description: c.description,
        };
      })
    );

    res.render("organizer/dashboard", {
      title: "Organizer Dashboard",
      year: new Date().getFullYear(),
      courses: courseCards,
      courseCount: courseCards.length,
    });
  } catch (err) {
    next(err);
  }
};

export const newCoursePage = (req, res) => {
  res.render("organizer/new_course", {
    title: "Create New Course",
    year: new Date().getFullYear(),
    
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
      location,
    } = req.body;

    // Validation
    if (!title || !level || !type || !startDate || !endDate) {
      return res.render("organizer/new_course", {
        title: "Create New Course",
        year: new Date().getFullYear(),
        
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
      price: s.price,
    }));

    res.render("organizer/course_details", {
      title: course.title,
      year: new Date().getFullYear(),
      
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: course.type,
        allowDropIn: course.allowDropIn,
        startDate: fmtDateOnly(course.startDate),
        endDate: fmtDateOnly(course.endDate),
        description: course.description,
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
    const { startDateTime, endDateTime, capacity, price } = req.body;

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
      price: price ? parseFloat(price) : null,
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

export const editCoursePage = async (req, res, next) => {
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

    res.render("organizer/edit_course", {
      title: "Edit Course",
      year: new Date().getFullYear(),
      
      course: {
        id: course._id,
        title: course.title,
        level: course.level,
        type: course.type,
        allowDropIn: course.allowDropIn,
        startDate: course.startDate ? course.startDate.split('T')[0] : '',
        endDate: course.endDate ? course.endDate.split('T')[0] : '',
        description: course.description,
        location: course.location,
        instructorId: course.instructorId,
      },
      levelBeginner: course.level === 'beginner',
      levelIntermediate: course.level === 'intermediate',
      levelAdvanced: course.level === 'advanced',
      typeWeekly: course.type === 'WEEKLY_BLOCK',
      typeWorkshop: course.type === 'WEEKEND_WORKSHOP',
    });
  } catch (err) {
    next(err);
  }
};

export const postUpdateCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const { title, level, type, allowDropIn, startDate, endDate, description, location, instructorId } = req.body;

    const course = await CourseModel.findById(courseId);
    if (!course) {
      return res.status(404).render("error", {
        title: "Not found",
        message: "Course not found.",
        year: new Date().getFullYear(),
      });
    }

    // Validation
    const errors = [];
    if (!title || title.trim().length === 0) {
      errors.push("Title is required");
    }
    if (!level) {
      errors.push("Level is required");
    }
    if (!type) {
      errors.push("Type is required");
    }
    if (!description || description.trim().length === 0) {
      errors.push("Description is required");
    }

    if (errors.length > 0) {
      return res.render("organizer/edit_course", {
        title: "Edit Course",
        year: new Date().getFullYear(),
        
        course: { id: courseId, ...req.body },
        errors: { list: errors },
        levelBeginner: level === 'beginner',
        levelIntermediate: level === 'intermediate',
        levelAdvanced: level === 'advanced',
        typeWeekly: type === 'WEEKLY_BLOCK',
        typeWorkshop: type === 'WEEKEND_WORKSHOP',
      });
    }

    await CourseModel.update(courseId, {
      title: title.trim(),
      level,
      type,
      allowDropIn: allowDropIn === 'on',
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      description: description.trim(),
      location: location ? location.trim() : null,
      instructorId,
    });

    res.redirect(`/organizer/courses/${courseId}`);
  } catch (err) {
    next(err);
  }
};

export const postDeleteCourse = async (req, res, next) => {
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

    // Delete all bookings for this course
    const bookings = await BookingModel.listByCourse(courseId);
    for (const booking of bookings) {
      await BookingModel.delete(booking._id);
    }

    // Delete all sessions for this course
    const sessions = await SessionModel.listByCourse(courseId);
    for (const session of sessions) {
      await SessionModel.delete(session._id);
    }

    // Delete the course
    await CourseModel.delete(courseId);

    res.redirect("/organizer/dashboard");
  } catch (err) {
    next(err);
  }
};

export const usersManagementPage = async (req, res, next) => {
  try {
    const users = await UserModel.list();
    const userRows = users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    }));

    const errors = req.query.error === 'cannot_delete_self' ? { list: ["You cannot delete your own account."] } : null;

    res.render("organizer/users", {
      title: "User Management",
      year: new Date().getFullYear(),
      users: userRows,
      hasUsers: userRows.length > 0,
      userCount: userRows.length,
      errors,
    });
  } catch (err) {
    next(err);
  }
};

export const postCreateUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    const errors = [];
    if (!name || name.trim().length === 0) {
      errors.push("Name is required");
    }
    if (!email || email.trim().length === 0) {
      errors.push("Email is required");
    } else if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.push("Please enter a valid email address");
    }
    if (!password || password.length < 6) {
      errors.push("Password must be at least 6 characters");
    }
    if (!role || !["student", "organizer"].includes(role)) {
      errors.push("Role must be student or organizer");
    }

    // Check if email already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      errors.push("Email already exists");
    }

    if (errors.length > 0) {
      const users = await UserModel.list();
      const userRows = users.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }));

      return res.render("organizer/users", {
        title: "User Management",
        year: new Date().getFullYear(),
        
        users: userRows,
        errors: { list: errors },
        formData: req.body,
        studentSelected: req.body.role === 'student',
        organizerSelected: req.body.role === 'organizer',
      });
    }

    await UserModel.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
    });

    res.redirect("/organizer/users");
  } catch (err) {
    next(err);
  }
};

export const postUpdateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { name, email, role } = req.body;

    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).render("error", {
        title: "Not found",
        message: "User not found.",
        year: new Date().getFullYear(),
      });
    }

    const errors = [];
    if (!name || name.trim().length === 0) {
      errors.push("Name is required");
    }
    if (!email || email.trim().length === 0) {
      errors.push("Email is required");
    } else if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      errors.push("Please enter a valid email address");
    }
    if (!role || !["student", "organizer"].includes(role)) {
      errors.push("Role must be student or organizer");
    }

    // Check if email already exists (excluding current user)
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser && existingUser._id !== userId) {
      errors.push("Email already exists");
    }

    if (errors.length > 0) {
      const users = await UserModel.list();
      const userRows = users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
      }));

      return res.render("organizer/users", {
        title: "User Management",
        year: new Date().getFullYear(),
        
        users: userRows,
        errors: { list: errors },
        editUser: { id: userId, name, email, role },
        studentSelected: role === 'student',
        organizerSelected: role === 'organizer',
      });
    }

    await UserModel.update(userId, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
    });

    res.redirect("/organizer/users");
  } catch (err) {
    next(err);
  }
};

export const postDeleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const user = await UserModel.findById(userId);
    
    if (!user) {
      return res.status(404).render("error", {
        title: "Not found",
        message: "User not found.",
        year: new Date().getFullYear(),
      });
    }

    // Prevent deleting yourself
    if (userId === req.user._id) {
      return res.redirect("/organizer/users?error=cannot_delete_self");
    }

    // Cancel all bookings for this user
    const bookings = await BookingModel.listByUser(userId);
    for (const booking of bookings) {
      if (booking.status === "CONFIRMED") {
        // Decrement session counts
        for (const sessionId of booking.sessionIds) {
          await SessionModel.incrementBookedCount(sessionId, -1);
        }
      }
      await BookingModel.delete(booking._id);
    }

    // Delete the user
    await UserModel.delete(userId);

    res.redirect("/organizer/users");
  } catch (err) {
    next(err);
  }
};

export const courseBookingsPage = async (req, res, next) => {
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

    const bookings = await BookingModel.listByCourse(courseId);
    const bookingRows = await Promise.all(
      bookings.map(async (booking) => {
        const user = await UserModel.findById(booking.userId);
        return {
          id: booking._id,
          userName: user ? user.name : "Unknown User",
          userEmail: user ? user.email : "Unknown",
          type: booking.type,
          status: booking.status,
          createdAt: booking.createdAt ? fmtDateTime(booking.createdAt) : "",
        };
      })
    );

    res.render("organizer/course_bookings", {
      title: `Bookings: ${course.title}`,
      year: new Date().getFullYear(),
      
      course: {
        id: course._id,
        title: course.title,
      },
      bookings: bookingRows,
    });
  } catch (err) {
    next(err);
  }
};

export const courseStudentsPage = async (req, res, next) => {
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

    const bookings = await BookingModel.listByCourse(courseId);
    const studentRows = await Promise.all(
      bookings.map(async (booking) => {
        const user = await UserModel.findById(booking.userId);
        return {
          id: booking._id,
          userName: user ? user.name : "Unknown User",
          userEmail: user ? user.email : "Unknown",
          type: booking.type,
          status: booking.status,
          createdAt: booking.createdAt ? fmtDateTime(booking.createdAt) : "",
        };
      })
    );

    res.render("organizer/course_students", {
      title: `Students: ${course.title}`,
      year: new Date().getFullYear(),
      
      course: {
        id: course._id,
        title: course.title,
      },
      students: studentRows,
      hasStudents: studentRows.length > 0,
      studentCount: studentRows.length,
    });
  } catch (err) {
    next(err);
  }
};

export const postRemoveUserFromCourse = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const booking = await BookingModel.findById(bookingId);
    
    if (!booking) {
      return res.status(404).render("error", {
        title: "Not found",
        message: "Booking not found.",
        year: new Date().getFullYear(),
      });
    }

    if (booking.status === "CONFIRMED") {
      // Decrement session counts
      for (const sessionId of booking.sessionIds) {
        await SessionModel.incrementBookedCount(sessionId, -1);
      }
    }

    // Delete the booking
    await BookingModel.delete(bookingId);

    res.redirect(`/organizer/courses/${booking.courseId}/bookings`);
  } catch (err) {
    next(err);
  }
};
