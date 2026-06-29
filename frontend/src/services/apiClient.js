// apiClient.js
// Helper chung cho mọi service: tự động gắn header Authorization (JWT từ localStorage)
// và tự parse JSON / throw lỗi khi response không ok.

export const API = "http://localhost:5000/api";

export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });

  // Một số API trả 204 No Content (ví dụ DELETE) -> không parse JSON được
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new Error(data.message || data.error || `Lỗi ${res.status}`);
  }

  return data;
}
