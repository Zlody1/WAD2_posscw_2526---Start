// controllers/bookingController.js
import {
  bookCourseForUser,
  bookSessionForUser,
} from "../services/bookingService.js";
import { BookingModel } from "../models/bookingModel.js";
import { SessionModel } from "../models/sessionModel.js";

export const bookCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const userId = req.user._id;
    const booking = await bookCourseForUser(userId, courseId);
    res.status(201).json({ booking });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
};

export const bookSession = async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user._id;
    const booking = await bookSessionForUser(userId, sessionId);
    res.status(201).json({ booking });
  } catch (err) {
    console.error(err);
    let status = 500;
    if (err.code === "DROPIN_NOT_ALLOWED" || err.code === "ALREADY_BOOKED" || err.code === "ALREADY_ENROLLED") {
      status = 400;
    }
    res.status(status).json({ error: err.message });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await BookingModel.findById(bookingId);
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.userId !== req.user._id) return res.status(403).json({ error: "Not authorized to cancel this booking" });
    if (booking.status === "CANCELLED") return res.json({ booking });

    if (booking.status === "CONFIRMED") {
      for (const sid of booking.sessionIds) {
        await SessionModel.incrementBookedCount(sid, -1);
      }
    }
    const updated = await BookingModel.cancel(bookingId);
    res.json({ booking: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to cancel booking" });
  }
};
