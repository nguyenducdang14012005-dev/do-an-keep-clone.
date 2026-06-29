// ⚡ Bảng màu lấy cảm hứng từ Google Keep, dùng chung cho NoteComposer và NoteEditModal
export const NOTE_COLORS = [
  { name: "Mặc định", value: "#ffffff" },
  { name: "Đỏ", value: "#f28b82" },
  { name: "Cam", value: "#fbbc04" },
  { name: "Vàng", value: "#fff475" },
  { name: "Xanh lá", value: "#ccff90" },
  { name: "Xanh ngọc", value: "#a7ffeb" },
  { name: "Xanh dương", value: "#cbf0f8" },
  { name: "Chàm", value: "#aecbfa" },
  { name: "Tím", value: "#d7aefb" },
  { name: "Hồng", value: "#fdcfe8" },
  { name: "Nâu", value: "#e6c9a8" },
  { name: "Xám", value: "#e8eaed" },
];

export default NOTE_COLORS;

// Bảng màu cho nhãn (Label badge) — hash label_id → màu cố định
export const LABEL_COLORS = [
  { bg: "#d2e3fc", border: "#4285f4", text: "#1a73e8" }, // Xanh dương
  { bg: "#ceead6", border: "#34a853", text: "#137333" }, // Xanh lá
  { bg: "#fde293", border: "#fbbc04", text: "#7a5c00" }, // Vàng
  { bg: "#fadad9", border: "#ea4335", text: "#c5221f" }, // Đỏ
  { bg: "#e8d5f5", border: "#9c27b0", text: "#6a1b9a" }, // Tím
  { bg: "#ffe0cc", border: "#ff6d00", text: "#c43e00" }, // Cam
  { bg: "#d3f0f5", border: "#00acc1", text: "#006064" }, // Xanh ngọc
  { bg: "#f5d0e8", border: "#e91e63", text: "#880e4f" }, // Hồng
];

/**
 * Trả về object { bg, border, text } dựa trên label_id.
 * Dùng modulo để đảm bảo mỗi nhãn luôn có cùng màu.
 */
export function getLabelColor(labelId) {
  const idx = (labelId ?? 0) % LABEL_COLORS.length;
  return LABEL_COLORS[idx];
}
