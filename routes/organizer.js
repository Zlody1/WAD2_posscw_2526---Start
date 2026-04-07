// routes/organizer.js
import { Router } from "express";
import {
  organizerDashboard,
  newCoursePage,
  postCreateCourse,
  courseDetailsOrganizerPage,
  newSessionPage,
  postCreateSession,
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
router.get("/courses/:id/sessions/new", newSessionPage);
router.post("/courses/:id/sessions", postCreateSession);

export default router;
