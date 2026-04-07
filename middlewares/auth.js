// middlewares/auth.js
import { UserModel } from "../models/userModel.js";

export const attachUser = async (req, res, next) => {
  try {
    // Check if userId is in session cookie
    const userId = req.cookies.userId;
    if (userId) {
      const user = await UserModel.findById(userId);
      if (user) {
        req.user = user;
        res.locals.user = user;
      } else {
        // Invalid user, clear cookie
        res.clearCookie("userId");
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

export const requireLogin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).redirect("/login");
  }
  next();
};

export const requireOrganizerRole = (req, res, next) => {
  if (!req.user || req.user.role !== "organizer") {
    return res.status(403).render("error", {
      title: "Access Denied",
      message: "Only organizers can access this page.",
      year: new Date().getFullYear(),
    });
  }
  next();
};
