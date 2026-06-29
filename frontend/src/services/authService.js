import { API, apiFetch } from "./apiClient";

export async function changePassword(oldPassword, newPassword) {
  const data = await apiFetch(`${API}/auth/change-password`, {
    method: "POST",
    body: JSON.stringify({
      old_password: oldPassword,
      new_password: newPassword,
    }),
  });
  return data.data;
}
