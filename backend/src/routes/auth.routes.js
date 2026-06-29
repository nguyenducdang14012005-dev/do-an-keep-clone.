import express from "express";
import asyncHandler from "../utils/asyncHandler.js";
import { requireAuth } from "../middlewares/auth.js";
import * as authController from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", asyncHandler(authController.register));
router.post("/login", asyncHandler(authController.login));
router.get("/me", requireAuth, asyncHandler(authController.me));
router.post("/forgot-password", asyncHandler(authController.forgotPassword));
router.post("/reset-password", asyncHandler(authController.resetPassword));
router.post("/change-password", requireAuth, asyncHandler(authController.changePassword));

export default router;
