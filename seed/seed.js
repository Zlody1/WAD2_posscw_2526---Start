// seed/seed.js
import Datastore from "nedb-promises";

const iso = (d) => new Date(d).toISOString();

// Use in-memory databases for seeding to avoid Windows/OneDrive file lock issues
const usersDb = Datastore.create();
const coursesDb = Datastore.create();
const sessionsDb = Datastore.create();
const bookingsDb = Datastore.create();

async function wipeAll() {
  // Clear in-memory databases
  await Promise.all([
    usersDb.remove({}, { multi: true }),
    coursesDb.remove({}, { multi: true }),
    sessionsDb.remove({}, { multi: true }),
    bookingsDb.remove({}, { multi: true }),
  ]);
  // Ensure indexes
  await usersDb.ensureIndex({ fieldName: "email", unique: true });
  await sessionsDb.ensureIndex({ fieldName: "courseId" });
}

async function ensureDemoStudent() {
  let student = await usersDb.findOne({ email: "student@example.com" });
  if (!student) {
    student = await usersDb.insert({
      name: "Demo Student",
      email: "student@example.com",
      role: "student",
      password: "password123" // In production, this would be hashed
    });
  }
  return student;
}

async function ensureOrganizer() {
  let organizer = await usersDb.findOne({ email: "organizer@yoga.local" });
  if (!organizer) {
    organizer = await usersDb.insert({
      name: "Yoga Organizer",
      email: "organizer@yoga.local",
      role: "organizer",
      password: "admin123" // In production, this would be hashed
    });
  }
  return organizer;
}

async function createAdditionalStudents() {
  const students = [
    { name: "Alice Johnson", email: "alice@example.com", password: "password" },
    { name: "Bob Smith", email: "bob@example.com", password: "password" },
    { name: "Carol Davis", email: "carol@example.com", password: "password" },
    { name: "David Wilson", email: "david@example.com", password: "password" },
    { name: "Emma Brown", email: "emma@example.com", password: "password" },
  ];

  const createdStudents = [];
  for (const studentData of students) {
    const student = await usersDb.insert({
      name: studentData.name,
      email: studentData.email,
      role: "student",
      password: studentData.password,
    });
    createdStudents.push(student);
  }
  return createdStudents;
}

async function createAdditionalOrganizers() {
  const organizers = [
    { name: "James Organizer", email: "james@yoga.local", password: "password" },
    { name: "Sarah Admin", email: "sarah@yoga.local", password: "admin456" },
  ];

  const createdOrganizers = [];
  for (const organizerData of organizers) {
    const organizer = await usersDb.insert({
      name: organizerData.name,
      email: organizerData.email,
      role: "organizer",
      password: organizerData.password,
    });
    createdOrganizers.push(organizer);
  }
  return createdOrganizers;
}

async function createWeekendWorkshop(organizer) {
  const course = await coursesDb.insert({
    title: "Winter Mindfulness Workshop",
    level: "beginner",
    type: "WEEKEND_WORKSHOP",
    allowDropIn: false,
    startDate: "2026-01-10",
    endDate: "2026-01-11",
    instructorId: organizer._id,
    sessionIds: [],
    description: "Two days of breath, posture alignment, and meditation.",
    location: "Studio A, 123 Wellness Street, City Center",
  });

  const base = new Date("2026-01-10T09:00:00"); // Sat 9am
  const sessions = [];
  for (let i = 0; i < 5; i++) {
    const start = new Date(base.getTime() + i * 2 * 60 * 60 * 1000); // every 2 hours
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const s = await sessionsDb.insert({
      courseId: course._id,
      startDateTime: iso(start),
      endDateTime: iso(end),
      capacity: 20,
      bookedCount: 0,
      price: 25,
    });
    sessions.push(s);
  }
  await coursesDb.update({ _id: course._id }, {
    $set: { sessionIds: sessions.map((s) => s._id) },
  });
  return { course, sessions };
}

async function createWeeklyBlock(organizer) {
  const course = await coursesDb.insert({
    title: "12‑Week Vinyasa Flow",
    level: "intermediate",
    type: "WEEKLY_BLOCK",
    allowDropIn: true,
    startDate: "2026-02-02",
    endDate: "2026-04-20",
    instructorId: organizer._id,
    sessionIds: [],
    description: "Progressive sequences building strength and flexibility.",
    location: "Studio B, 456 Harmony Avenue, Wellness District",
  });

  const first = new Date("2026-02-02T18:30:00"); // Monday 6:30pm
  const sessions = [];
  for (let i = 0; i < 12; i++) {
    const start = new Date(first.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const end = new Date(start.getTime() + 75 * 60 * 1000);
    const s = await sessionsDb.insert({
      courseId: course._id,
      startDateTime: iso(start),
      endDateTime: iso(end),
      capacity: 18,
      bookedCount: 0,
      price: 20,
    });
    sessions.push(s);
  }
  await coursesDb.update({ _id: course._id }, {
    $set: { sessionIds: sessions.map((s) => s._id) },
  });
  return { course, sessions };
}

async function persistToDisk() {
  // Get all data from in-memory databases
  const [users, courses, sessions, bookings] = await Promise.all([
    usersDb.find({}),
    coursesDb.find({}),
    sessionsDb.find({}),
    bookingsDb.find({}),
  ]);

  // Import path and fs
  const path = await import("path");
  const fs = await import("fs/promises");
  const { fileURLToPath } = await import("url");
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const dbDir = path.join(__dirname, "../db");

  // Ensure db directory exists
  await fs.mkdir(dbDir, { recursive: true });

  // Write data in NeDB format (one document per line)
  const writeNeDBFormat = (docs, filename) => {
    const lines = docs.map(doc => JSON.stringify(doc)).join('\n');
    return fs.writeFile(path.join(dbDir, filename), lines + '\n');
  };

  await writeNeDBFormat(users, "users.db");
  await writeNeDBFormat(courses, "courses.db");
  await writeNeDBFormat(sessions, "sessions.db");
  await writeNeDBFormat(bookings, "bookings.db");

  console.log("Data persisted to disk successfully");
}

async function verifyAndReport() {
  const [users, courses, sessions, bookings] = await Promise.all([
    usersDb.count({}),
    coursesDb.count({}),
    sessionsDb.count({}),
    bookingsDb.count({}),
  ]);
  console.log("— Verification —");
  console.log("Users   :", users);
  console.log("Courses :", courses);
  console.log("Sessions:", sessions);
  console.log("Bookings:", bookings);
  if (courses === 0 || sessions === 0) {
    throw new Error("Seed finished but no courses/sessions were created.");
  }
}

async function run() {
  console.log("Initializing in-memory DB…");
  await wipeAll();

  console.log("Creating demo student…");
  const student = await ensureDemoStudent();

  console.log("Creating organizer…");
  const organizer = await ensureOrganizer();

  console.log("Creating additional students…");
  const additionalStudents = await createAdditionalStudents();

  console.log("Creating additional organizers…");
  const additionalOrganizers = await createAdditionalOrganizers();

  console.log("Creating weekend workshop…");
  const w = await createWeekendWorkshop(organizer);

  console.log("Creating weekly block…");
  const b = await createWeeklyBlock(organizer);

  await verifyAndReport();

  console.log("Persisting to disk…");
  await persistToDisk();

  console.log("\n✅ Seed complete.");
  console.log("Demo Student ID      :", student._id);
  console.log("Main Organizer ID    :", organizer._id);
  console.log("Additional Students  :", additionalStudents.length);
  console.log("Additional Organizers:", additionalOrganizers.length);
  console.log(
    "Workshop course ID   :",
    w.course._id,
    "(sessions:",
    w.sessions.length + ")"
  );
  console.log(
    "Weekly block course ID:",
    b.course._id,
    "(sessions:",
    b.sessions.length + ")"
  );
}

run().catch((err) => {
  console.error("❌ Seed failed:", err?.stack || err);
  process.exit(1);
});
