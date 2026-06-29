import { API, apiFetch } from "./apiClient.js";

export async function getReminders() {
  return apiFetch(`${API}/reminders`);
}

export async function createReminder(payload) {
  return apiFetch(`${API}/reminders`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateReminder(id, payload) {
  return apiFetch(`${API}/reminders/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function confirmReminderRead(id) {
  return apiFetch(`${API}/reminders/confirm/${id}`, {
    method: "PUT",
  });
}

// 🆕 Lấy reminder hiện có của một note
export async function getReminderByNote(noteId) {
  return apiFetch(`${API}/reminders/note/${noteId}`);
}

export default {
  getReminders,
  createReminder,
  updateReminder,
  confirmReminderRead,
  getReminderByNote,
};
