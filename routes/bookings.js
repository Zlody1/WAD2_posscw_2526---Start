
// routes/bookings.js
import { Router } from 'express';
import { bookCourse, bookSession, cancelBooking } from '../controllers/bookingController.js';
import { requireLogin } from '../middlewares/auth.js';

const router = Router();

router.post('/course', requireLogin, bookCourse);
router.post('/session', requireLogin, bookSession);
router.delete('/:bookingId', requireLogin, cancelBooking);

export default router;
