import express from "express";
import * as labelController from "../controllers/labelController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware);

router.post("/", labelController.createLabel);
router.get("/", labelController.getAllLabels);
router.put("/:id", labelController.updateLabel);
router.delete("/:id", labelController.deleteLabel);
router.post("/attach", labelController.attachLabelToNote);
router.post("/detach", labelController.detachLabelFromNote);

export default router;
