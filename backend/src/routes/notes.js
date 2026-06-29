import express from "express";
import * as noteController from "../controllers/noteController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();
router.use(authMiddleware);

// ← Route cụ thể đặt TRƯỚC
router.delete("/trash/cleanup", noteController.cleanupTrash); // ← thêm vào đây!
router.get("/search", noteController.searchAndFilterNotes);
router.post("/share", noteController.shareNoteMock);

// ← Route có :id đặt SAU
router.delete("/:id/versions/:version_id", noteController.deleteNoteVersion);
router.post("/:id/versions", noteController.createNoteVersion);
router.put("/:id/pin", noteController.togglePinNote);
router.put("/:id/status", noteController.changeNoteStatus);
router.get("/:id/versions", noteController.getNoteVersions);
router.post("/", noteController.createNote);
router.get("/:id/labels", noteController.getNoteLabels);
router.put("/:id", noteController.updateNote); // ⚡ Cập nhật tiêu đề/nội dung/màu/hạn chót ghi chú

export default router;
