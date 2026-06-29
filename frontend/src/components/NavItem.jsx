import React from "react";

export default function NavItem({ icon, label, active, onClick }) {
  return (
    <div onClick={onClick} className={`nav-item ${active ? "active" : ""}`}>
      <span className="nav-icon">{icon}</span>
      {label}
    </div>
  );
}
