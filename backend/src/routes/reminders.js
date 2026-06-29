import express from "express";
import {
  setReminder,
  getReminders,
  updateReminder,
  deleteReminder,
  getDueReminders,
  confirmReminder,
} from "../controllers/reminderController.js";

import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/due-now", getDueReminders);

router.post("/", setReminder);
router.get("/", getReminders);
router.put("/:id", updateReminder);
router.delete("/:id", deleteReminder);

router.put("/confirm/:id", confirmReminder);

export default router;
