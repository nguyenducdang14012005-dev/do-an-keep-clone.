// checklistService.js
// Service để giao tiếp với Checklist API (/api/notes/:id/checklist)
// Tuân thủ coding style của các service hiện tại trong dự án.

import { API, apiFetch } from "./apiClient.js";

const BASE = (noteId) => `${API}/notes/${noteId}/checklist`;

/**
 * Lấy toàn bộ checklist items của một ghi chú.
 * @param {number} noteId
 * @returns {Promise<Array>} Danh sách items sắp xếp theo position
 */
export async function getChecklist(noteId) {
  return apiFetch(BASE(noteId));
}

/**
 * Thêm một item mới vào checklist.
 * @param {number} noteId
 * @param {string} content - Nội dung công việc
 * @returns {Promise<Object>} Item vừa tạo
 */
export async function addChecklistItem(noteId, content) {
  return apiFetch(BASE(noteId), {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

/**
 * Cập nhật nội dung hoặc trạng thái hoàn thành của một item.
 * @param {number} noteId
 * @param {number} itemId
 * @param {Object} updates - Có thể chứa { content, is_completed }
 * @returns {Promise<Object>} Item sau khi cập nhật
 */
export async function updateChecklistItem(noteId, itemId, updates) {
  return apiFetch(`${BASE(noteId)}/${itemId}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
}

/**
 * Xóa một item khỏi checklist.
 * @param {number} noteId
 * @param {number} itemId
 */
export async function deleteChecklistItem(noteId, itemId) {
  return apiFetch(`${BASE(noteId)}/${itemId}`, { method: "DELETE" });
}

/**
 * Cập nhật lại thứ tự (position) của toàn bộ items.
 * @param {number} noteId
 * @param {Array<{item_id: number, position: number}>} items
 */
export async function reorderChecklist(noteId, items) {
  return apiFetch(`${BASE(noteId)}/reorder`, {
    method: "PUT",
    body: JSON.stringify({ items }),
  });
}

export default {
  getChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  reorderChecklist,
};
