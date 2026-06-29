import { API, apiFetch } from "./apiClient.js";

// Chia sẻ note cho người khác (permission: 'view' | 'edit' | 'delete')
export async function shareNote(id, payload) {
  return apiFetch(`${API}/shares/${id}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// Danh sách người được chia sẻ 1 note cụ thể (owner xem trong chi tiết note)
export async function getShares(note_id) {
  return apiFetch(`${API}/shares/note/${note_id}`);
}

// Thông báo: các lời mời chia sẻ đang Pending của user hiện tại
export async function getPendingShares() {
  return apiFetch(`${API}/shares/notifications`);
}

// Các note đã Accepted mà user hiện tại được chia sẻ
export async function getAcceptedSharedNotes() {
  return apiFetch(`${API}/shares/accepted`);
}

// Danh sách note mà user hiện tại (owner) đã chia sẻ cho người khác
export async function getMySharedNotes() {
  return apiFetch(`${API}/shares/my-shared`);
}

// Chấp nhận lời mời chia sẻ
export async function acceptShare(share_id) {
  return apiFetch(`${API}/shares/${share_id}/accept`, { method: "POST" });
}

// Từ chối lời mời chia sẻ
export async function rejectShare(share_id) {
  return apiFetch(`${API}/shares/${share_id}/reject`, { method: "POST" });
}

// Đánh dấu các thông báo "đã dừng chia sẻ" là đã xem (xoá số đếm ở chuông)
export async function markNotificationsSeen() {
  return apiFetch(`${API}/shares/notifications/seen`, { method: "PATCH" });
}

// Dừng chia sẻ / xóa một lượt chia sẻ (chỉ owner)
export async function removeShare(share_id) {
  return apiFetch(`${API}/shares/${share_id}`, { method: "DELETE" });
}

// ⚡ ĐÃ SỬA: Chuyển từ axios sang apiFetch đồng bộ với hệ thống của bạn
export async function updateSharePermission(shareId, permission) {
  return apiFetch(`${API}/shares/change-permission/${shareId}`, {
    method: "PUT",
    body: JSON.stringify({ permission }),
  });
}

// Đừng quên add vào object export default nếu bạn export dạng default
export default {
  shareNote,
  getShares,
  getPendingShares,
  markNotificationsSeen,
  getAcceptedSharedNotes,
  getMySharedNotes,
  acceptShare,
  rejectShare,
  removeShare,
  updateSharePermission,
};
