// routes/auth.js
import { Router } from "express";
import { loginPage, postLogin, postLogout } from "../controllers/authController.js";

const router = Router();

router.get("/login", loginPage);
router.post("/login", postLogin);
router.post("/logout", postLogout);

export default router;
