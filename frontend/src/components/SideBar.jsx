import React from "react";
import NavItem from "./NavItem";

export default function SideBar({
  labels,
  view,
  setView,
  selectedLabel,
  onSelectLabel,
  onAddLabel,
  onDeleteLabel,
}) {
  return (
    <div className="sidebar">
      <NavItem
        label="Ghi chú"
        active={view === "notes"}
        onClick={() => setView("notes")}
      />
      <NavItem
        label="Lịch hẹn"
        active={view === "reminders"}
        onClick={() => setView("reminders")}
      />

      <NavItem
        label="Lưu trữ"
        active={view === "archive"}
        onClick={() => setView("archive")}
      />
      <NavItem
        label="Thùng rác"
        active={view === "trash"}
        onClick={() => setView("trash")}
      />
      <NavItem
        label="Thêm nhãn"
        active={view === "labels"}
        onClick={() => setView("labels")}
      />
      {labels.length > 0 && (
        <>
          <div className="sidebar-section">Nhãn</div>
          {labels.map((l) => (
            <NavItem
              key={l.label_id}
              label={l.label_name}
              active={selectedLabel === l.label_id}
              onClick={() => onSelectLabel(l.label_id, l.label_name)}
            />
          ))}
        </>
      )}
      <div className="sidebar-footer">Giấy phép nguồn mở</div>
    </div>
  );
}
