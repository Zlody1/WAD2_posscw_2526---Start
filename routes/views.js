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

const router = Router();

router.get("/", homePage);
router.get("/courses", coursesListPage);
router.get("/courses/:id", courseDetailPage);
router.get("/courses/:id/book", courseBookingPage);
router.post("/courses/:id/book", postBookCourse);
router.post("/sessions/:id/book", postBookSession);
router.get("/bookings/:bookingId", bookingConfirmationPage);
router.get("/bookings/:bookingId/details", bookingDetailsPage);
router.post("/bookings/:bookingId/cancel", postCancelBooking);

export default router;
