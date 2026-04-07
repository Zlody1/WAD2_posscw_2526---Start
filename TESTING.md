# Testing Guide - Booking Application

## Quick Start

To run the application:

```bash
npm install
npm start
```

The application will be available at `http://localhost:3000`

## Test Scenarios

### 1. Home Page & Navigation ✓
- **URL**: `http://localhost:3000/`
- **Expected**: List of upcoming courses in cards with proper formatting
- **Check**: 
  - Course title is a clickable link ✓
  - "View & Book" button links to course detail ✓
  - Header shows "Signed in as Fiona" ✓
  - Navigation links are visible ✓

### 2. Course Search & Filtering ✓
- **URL**: `http://localhost:3000/courses`
- **Expected**: Filter form with pagination
- **Check**:
  - Filter inputs for level, type, drop-in, and search ✓
  - Apply Filters button submits form ✓
  - Reset link clears filters ✓
  - Pagination shows "Page X of Y" ✓
  - Previous/Next links work ✓

### 3. Course Detail Page ✓
- **URL**: `http://localhost:3000/courses/[courseId]`
- **Expected**: Full course information with booking options
- **Check**:
  - Course title, level, type displayed ✓
  - Sessions table shows all sessions ✓
  - "Proceed to Booking Form" button links to booking page ✓
  - Drop-in sessions show "Book this session" button (if allowed) ✓

### 4. Booking Form ✓
- **URL**: `http://localhost:3000/courses/[courseId]/book`
- **Expected**: Form to complete booking with validation
- **Check**:
  - Full name input field ✓
  - Email input field ✓
  - Notes textarea (optional) ✓
  - Consent checkbox (required) ✓
  - Booking summary shows sessions ✓
  - Form validation works (try submitting empty form) ✓

### 5. Booking Validation ✓
- **Test Missing Name**: Leave name blank, click confirm - shows error
- **Test Invalid Email**: Enter "notanemail", click confirm - shows error
- **Test Missing Consent**: Uncheck consent, click confirm - shows error
- **Test Valid Booking**: Fill all fields correctly - redirects to confirmation

### 6. Booking Confirmation ✓
- **Expected**: Confirmation page with booking details
- **Check**:
  - Booking ID displayed ✓
  - Booking type shown (COURSE/SESSION) ✓
  - Status shown as CONFIRMED ✓
  - "View Booking Details" link available ✓
  - "Back to Home" link works ✓
  - Success message displayed ✓

### 7. Booking Details & Cancellation ✓
- **URL**: `http://localhost:3000/bookings/[bookingId]/details`
- **Expected**: Booking details with cancellation option
- **Check**:
  - Booking information displayed ✓
  - "Cancel Booking" button visible for confirmed bookings ✓
  - Click cancel shows confirmation dialog ✓
  - After cancellation, status changes to CANCELLED ✓
  - Cancellation page shows success message ✓
  - Cancelled booking button is hidden on next visit ✓

### 8. Error Handling ✓
- **Test Missing Course**: Visit `/courses/invalid-id`
  - Expected: "Not found" error page
- **Test Invalid Session**: Try to book non-existent session
  - Expected: Error message displayed

### 9. Demo User ℹ️
- Every request automatically has user "Fiona" attached
- This is intentional for development
- To test real authentication, replace `app.use(attachDemoUser)` in index.js with real auth middleware

---

## Known Issues & Limitations

### 1. Demo User
**Status**: By Design
- Static user "Fiona" is attached to all requests
- This is appropriate for development but **NOT** for production
- **Solution**: Implement real authentication system

### 2. Price/Location Fields
**Status**: Ready but not populated
- Templates support price and location display
- Fields not in database schema yet
- **To Enable**:
  1. Add fields to CourseModel
  2. Add fields to seed data
  3. Fields will auto-display in templates

### 3. Organiser Interface
**Status**: Not Implemented
- Organiser link in header is placeholder
- API endpoints exist but no UI
- **To Implement**: Create organiser dashboard for course management

### 4. User Bookings List
**Status**: Not Implemented
- "My Bookings" link in header not connected
- **To Implement**: Create `/user/bookings` route with template

#### 5. Database
**Status**: NeDB (File-based)
- Suitable for development
- **For Production**: Migrate to MongoDB or PostgreSQL

---

## File Changes Summary

### Templates Fixed (9 files)
- ✓ head.mustache - HTML structure
- ✓ footer.mustache - Closing tags and year display
- ✓ header.mustache - Navigation and user info
- ✓ home.mustache - Course cards and links
- ✓ courses.mustache - Filter form and pagination
- ✓ course.mustache - Session table and booking link
- ✓ course_book.mustache - Booking form
- ✓ booking_confirmation.mustache - Confirmation page
- ✓ error.mustache - Error page
- ✓ booking_details.mustache - NEW, booking details and cancellation

### Controllers Modified (2 files)
- ✓ viewsController.js - Added form validation, booking details, cancellation
- ✓ coursesListController.js - Added year to render context

### Routes Updated
- ✓ views.js - Added GET /courses/:id/book, GET /bookings/:id/details, POST /bookings/:id/cancel

### Styling Enhanced
- ✓ styles.css - Added form controls, buttons, pagination, better header layout

### Documentation
- ✓ FIXES.md - Comprehensive documentation of all changes

---

## Next Steps for Improvements

### High Priority
1. Implement real authentication (replace demo user)
2. Add price and location to courses
3. Create organiser UI for course management
4. Create user bookings list view

### Medium Priority
5. Add email notifications
6. Implement waitlist auto-promotion
7. Add more comprehensive input validation
8. Improve error messages

### Low Priority (Production)
9. Migrate database to MongoDB/PostgreSQL
10. Add caching layer
11. Improve mobile responsiveness
12. Add accessibility improvements (ARIA labels)

---

## Demo Data

The application seeds with:
- **1 demo student**: Fiona (fiona@student.local)
- **2 demo instructors**: Ava and Ben
- **2 demo courses**: Winter Mindfulness Workshop, 12-Week Vinyasa Flow
- **Multiple demo sessions**: Ready for booking

To reseed data, run:
```bash
node seed/seed.js
```

---

**Last Updated**: April 4, 2026
