import React from "react";

export default function LabelPickerModal({
  labels,
  noteLabels,
  onClose,
  onToggle,
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Gán nhãn</span>
          <button className="icon-btn" onClick={onClose}>
            ✖
          </button>
        </div>
        <div className="modal-body">
          {labels.map((l) => {
            const isAttached = noteLabels.some(
              (nl) => nl.label_id === l.label_id,
            );
            return (
              <div
                key={l.label_id}
                className="label-picker-row"
                onClick={() => onToggle(l.label_id)}
              >
                <span
                  className={`label-picker-dot ${isAttached ? "attached" : ""}`}
                >
                  {isAttached ? "✓" : ""}
                </span>
                <span className="label-picker-name">{l.label_name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
