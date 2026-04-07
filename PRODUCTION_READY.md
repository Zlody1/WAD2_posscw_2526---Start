# Demo User & Production Readiness

## Current State: Development with Demo User

### Demo User Details
- **Name**: Fiona
- **Email**: fiona@student.local
- **Role**: student
- **Status**: Automatically attached to every request
- **Location**: `middlewares/demoUser.js`

### How It Works

Every request automatically gets Fiona as the current user:

```javascript
// middlewares/demoUser.js
export const attachDemoUser = async (req, res, next) => {
  const user = await UserModel.findByEmail("fiona@student.local");
  // Create if doesn't exist, then attach to request
  req.user = user;
  res.locals.user = user; // available in templates
  next();
};
```

This middleware is enabled in `index.js`:
```javascript
app.use(attachDemoUser);
```

### Why This Design?

**Advantages for Development**:
- ✓ No need to implement authentication for basic testing
- ✓ All features accessible without login flow
- ✓ Simplifies testing of booking workflow
- ✓ Multiple test users can be created manually in database
- ✓ Booking data persists and can be verified

**Disadvantages for Production**:
- ✗ Security risk - all users appear as same person
- ✗ Can't track actual user actions
- ✗ No role separation (organiser vs student)
- ✗ No booking history per user
- ✗ Can't implement multi-user features

---

## For Development Use

### Testing with Multiple Users

To test with different users:

1. **Add another test user directly to database**:
   ```javascript
   // In a test script:
   const student2 = await UserModel.create({
     name: "John",
     email: "john@student.local",
     role: "student"
   });
   ```

2. **Manually modify middleware to test different user**:
   - Change email in `demoUser.js` temporarily
   - Restart server
   - Test as that user

3. **Disable demo user and implement real auth**:
   - Comment out `app.use(attachDemoUser)` in `index.js`
   - Implement login routes
   - Test flows with authentication

### Quick Toggle

To disable demo user for testing without auth:

**In `index.js`**, comment out this line:
```javascript
// app.use(attachDemoUser);  // <- Comment this out
```

Then the app will fail on routes that need `req.user` - useful for testing error handling.

---

## Migration to Production

### Step 1: Remove Demo User (REQUIRED)

**File**: `index.js`
```javascript
// REMOVE THIS:
app.use(attachDemoUser);
```

### Step 2: Implement Authentication

#### Option A: Session-Based (Recommended for simplicity)

1. **Install dependencies**:
   ```bash
   npm install express-session bcryptjs
   ```

2. **Create auth routes** (`routes/auth.js`):
   ```javascript
   router.post('/login', async (req, res) => {
     const { email, password } = req.body;
     const user = await UserModel.findByEmail(email);
     if (user && await bcrypt.compare(password, user.passwordHash)) {
       req.session.userId = user._id;
       res.redirect('/');
     } else {
       res.status(401).render('login', { error: 'Invalid credentials' });
     }
   });

   router.get('/logout', (req, res) => {
     req.session.destroy();
     res.redirect('/');
   });
   ```

3. **Add session middleware** in `index.js`:
   ```javascript
   app.use(session({
     secret: process.env.SESSION_SECRET,
     resave: false,
     saveUninitialized: false,
     cookie: { secure: false } // Set true with HTTPS
   }));
   ```

4. **Create middleware to load user from session**:
   ```javascript
   app.use(async (req, res, next) => {
     if (req.session.userId) {
       req.user = await UserModel.findById(req.session.userId);
       res.locals.user = req.user;
     }
     next();
   });
   ```

#### Option B: JWT-Based (For APIs/Microservices)

1. **Install dependencies**:
   ```bash
   npm install jsonwebtoken bcryptjs
   ```

2. **Create login endpoint**:
   ```javascript
   router.post('/login', async (req, res) => {
     const user = await UserModel.findByEmail(req.body.email);
     if (user && await bcrypt.compare(req.body.password, user.passwordHash)) {
       const token = jwt.sign(
         { userId: user._id },
         process.env.JWT_SECRET,
         { expiresIn: '24h' }
       );
       res.json({ token });
     }
   });
   ```

3. **Create auth middleware**:
   ```javascript
   export function authMiddleware(req, res, next) {
     const token = req.headers.authorization?.split(' ')[1];
     if (!token) return res.status(401).json({ error: 'No token' });
     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       req.user = decoded;
       next();
     } catch (e) {
       res.status(401).json({ error: 'Invalid token' });
     }
   }
   ```

### Step 3: Add Registration

Create `/routes/register.js`:
```javascript
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  // Validate
  if (!name || !email || !password) {
    return res.status(400).render('register', { error: 'All fields required' });
  }
  
  // Check if exists
  const existing = await UserModel.findByEmail(email);
  if (existing) {
    return res.status(400).render('register', { error: 'Email already registered' });
  }
  
  // Hash password
  const hash = await bcrypt.hash(password, 10);
  
  // Create user
  const user = await UserModel.create({
    name,
    email,
    passwordHash: hash,
    role: 'student'
  });
  
  // Auto-login
  req.session.userId = user._id;
  res.redirect('/');
});
```

### Step 4: Add Login Template

Create `/views/login.mustache`:
```mustache
{{> head}}
{{> header}}

<h1>Login</h1>

{{#error}}
<div class="alert error">{{error}}</div>
{{/error}}

<form method="post" action="/login">
  <fieldset>
    <div class="field">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required />
    </div>
    <div class="field">
      <label for="password">Password</label>
      <input id="password" name="password" type="password" required />
    </div>
    <button class="btn primary">Login</button>
  </fieldset>
</form>

<p>Don't have an account? <a href="/register">Register here</a></p>

{{> footer}}
```

### Step 5: Update Header

Modify `views/partials/header.mustache` to show appropriate links:
```mustache
{{#user}}
  Signed in as {{user.name}} | <a href="/logout">Logout</a>
{{/user}}
{{^user}}
  <a href="/login">Login</a> | <a href="/register">Register</a>
{{/user}}
```

### Step 6: Protect Routes

Add auth middleware to protected routes:
```javascript
router.get('/courses/:id/book', requireAuth, courseBookingPage);
router.post('/courses/:id/book', requireAuth, postBookCourse);
router.post('/bookings/:id/cancel', requireAuth, postCancelBooking);

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.redirect('/login?next=' + encodeURIComponent(req.originalUrl));
  }
  next();
}
```

---

## Role-Based Access Control

For organiser features, add role checking:

```javascript
function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You do not have permission to access this page'
      });
    }
    next();
  };
}

// Usage:
router.get('/organiser', requireRole('organiser'), organiserDashboard);
```

---

## Security Checklist for Production

- [ ] Remove demo user middleware
- [ ] Implement user authentication (login/logout)
- [ ] Hash passwords with bcrypt (cost >= 10)
- [ ] Use HTTP-only secure cookies for sessions
- [ ] Implement CSRF protection
- [ ] Add SSL/HTTPS
- [ ] Validate and sanitize all inputs
- [ ] Add rate limiting
- [ ] Implement proper logging
- [ ] Use environment variables for secrets
- [ ] Set up database backups
- [ ] Implement role-based access control
- [ ] Add audit logging for bookings
- [ ] Test SQL injection and XSS attacks

---

## Environment Variables Required

Add to `.env` file:

```env
NODE_ENV=production
PORT=3000
SESSION_SECRET=your-secret-key-here
JWT_SECRET=your-jwt-secret-here
DATABASE_URL=your-mongodb-connection-string
```

---

## Testing Checklist

After implementing authentication:

- [ ] Can register new account
- [ ] Can login with registered account
- [ ] Cannot login with wrong password
- [ ] Session persists across requests
- [ ] Logout clears session
- [ ] Protected routes redirect to login
- [ ] Bookings show only for current user
- [ ] Multiple users can book same course
- [ ] User data is properly isolated

---

**Document Last Updated**: April 4, 2026
