import { API, apiFetch } from "./apiClient.js";

export async function searchNotes({ view, keyword, label_id, user_id }) {
  // If no user_id provided, return empty set to avoid leaking notes
  if (!user_id) return [];

  let url = `${API}/notes/search?`;
  if (view === "archive") url += "status=Archived";
  else if (view === "trash") url += "status=Deleted";
  else if (view === "reminders") url += "status=Active&has_reminder=1";
  else url += "status=Active";
  if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;
  if (label_id) url += `&label_id=${label_id}`;
  // include user filter
  url += `&user_id=${encodeURIComponent(user_id)}`;

  const data = await apiFetch(url);
  const notes = Array.isArray(data) ? data : [];

  const notesWithLabels = await Promise.all(
    notes.map(async (note) => {
      try {
        const labels = await apiFetch(`${API}/notes/${note.note_id}/labels`);
        return { ...note, labels };
      } catch (e) {
        return { ...note, labels: [] };
      }
    }),
  );
  return notesWithLabels;
}

export async function createNote(payload) {
  return apiFetch(`${API}/notes`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateNote(id, payload) {
  return apiFetch(`${API}/notes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function togglePin(id) {
  return apiFetch(`${API}/notes/${id}/pin`, { method: "PUT" });
}

export async function changeStatus(id, status) {
  return apiFetch(`${API}/notes/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  });
}

export default { searchNotes, createNote, updateNote, togglePin, changeStatus };
