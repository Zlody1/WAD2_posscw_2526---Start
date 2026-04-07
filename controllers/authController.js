// controllers/authController.js
import { UserModel } from "../models/userModel.js";

export const loginPage = (req, res) => {
  res.render("login", {
    title: "Login",
    year: new Date().getFullYear(),
  });
};

export const postLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.render("login", {
        title: "Login",
        year: new Date().getFullYear(),
        error: "Email and password are required.",
      });
    }

    const user = await UserModel.authenticate(email, password);
    if (!user) {
      return res.render("login", {
        title: "Login",
        year: new Date().getFullYear(),
        error: "Invalid email or password.",
      });
    }

    // Set session cookie
    res.cookie("userId", user._id, { httpOnly: true });
    
    // Redirect based on role
    if (user.role === "organizer") {
      return res.redirect("/organizer/dashboard");
    }
    res.redirect("/");
  } catch (err) {
    next(err);
  }
};

export const postLogout = (req, res) => {
  res.clearCookie("userId");
  res.redirect("/");
};
