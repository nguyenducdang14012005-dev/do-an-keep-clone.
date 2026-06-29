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

export default { getReminders, createReminder, updateReminder };
