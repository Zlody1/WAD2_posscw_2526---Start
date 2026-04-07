// routes/views.js
import { Router } from "express";
import {
  homePage,
  courseDetailPage,
  courseBookingPage,
  postBookCourse,
  postBookSession,
  bookingConfirmationPage,
  bookingDetailsPage,
  postCancelBooking,
} from "../controllers/viewsController.js";

import { coursesListPage } from "../controllers/coursesListController.js";
import { requireLogin } from "../middlewares/auth.js";

const router = Router();

router.get("/", homePage);
router.get("/courses", coursesListPage);
router.get("/courses/:id", courseDetailPage);
router.get("/courses/:id/book", requireLogin, courseBookingPage);
router.post("/courses/:id/book", requireLogin, postBookCourse);
router.post("/sessions/:id/book", requireLogin, postBookSession);
router.get("/bookings/:bookingId", requireLogin, bookingConfirmationPage);
router.get("/bookings/:bookingId/details", requireLogin, bookingDetailsPage);
router.post("/bookings/:bookingId/cancel", requireLogin, postCancelBooking);

export default router;
