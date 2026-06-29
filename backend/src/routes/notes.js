import express from "express";
import * as noteController from "../controllers/noteController.js";
import * as checklistController from "../controllers/checklistController.js";
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

// ─── Checklist routes (/api/notes/:id/checklist) ──────────────────────────────
router.get("/:id/checklist", checklistController.getChecklist);
router.post("/:id/checklist", checklistController.addChecklistItem);
router.put("/:id/checklist/reorder", checklistController.reorderChecklist); // reorder TRƯỚC :item_id
router.put("/:id/checklist/:item_id", checklistController.updateChecklistItem);
router.delete(
  "/:id/checklist/:item_id",
  checklistController.deleteChecklistItem,
);

export default router;
