// routes/organizer.js
import { Router } from "express";
import {
  organizerDashboard,
  newCoursePage,
  postCreateCourse,
  courseDetailsOrganizerPage,
  newSessionPage,
  postCreateSession,
  editCoursePage,
  postUpdateCourse,
  postDeleteCourse,
  usersManagementPage,
  postCreateUser,
  postUpdateUser,
  postDeleteUser,
  courseBookingsPage,
  courseStudentsPage,
  postRemoveUserFromCourse,
} from "../controllers/organizerController.js";
import { requireLogin, requireOrganizerRole } from "../middlewares/auth.js";

const router = Router();

// All organizer routes require login and organizer role
router.use(requireLogin);
router.use(requireOrganizerRole);

router.get("/dashboard", organizerDashboard);
router.get("/courses/new", newCoursePage);
router.post("/courses", postCreateCourse);
router.get("/courses/:id", courseDetailsOrganizerPage);
router.get("/courses/:id/students", courseStudentsPage);
router.get("/courses/:id/edit", editCoursePage);
router.post("/courses/:id", postUpdateCourse);
router.post("/courses/:id/delete", postDeleteCourse);
router.get("/courses/:id/bookings", courseBookingsPage);
router.post("/courses/:id/bookings/:bookingId/remove", postRemoveUserFromCourse);
router.get("/users", usersManagementPage);
router.post("/users", postCreateUser);
router.post("/users/:id", postUpdateUser);
router.post("/users/:id/delete", postDeleteUser);
router.get("/courses/:id/sessions/new", newSessionPage);
router.post("/courses/:id/sessions", postCreateSession);

export default router;
