import { API, apiFetch } from "./apiClient.js";

export async function getLabels() {
  return apiFetch(`${API}/labels`);
}

export async function createLabel(payload) {
  return apiFetch(`${API}/labels`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ⚡ THÊM HÀM NÀY: Để gửi request cập nhật lên Backend
export async function updateLabel(id, payload) {
  return apiFetch(`${API}/labels/${id}`, {
    method: "PUT", // Hoặc "PATCH" tùy thuộc vào Router ở Backend của bạn cấu hình là gì
    body: JSON.stringify(payload),
  });
}

export async function deleteLabel(id) {
  return apiFetch(`${API}/labels/${id}`, { method: "DELETE" });
}

export async function attachLabel(note_id, label_id) {
  return apiFetch(`${API}/labels/attach`, {
    method: "POST",
    body: JSON.stringify({ note_id, label_id }),
  });
}

export async function detachLabel(note_id, label_id) {
  return apiFetch(`${API}/labels/detach`, {
    method: "POST",
    body: JSON.stringify({ note_id, label_id }),
  });
}

export default {
  getLabels,
  createLabel,
  updateLabel,
  deleteLabel,
  attachLabel,
  detachLabel,
};
