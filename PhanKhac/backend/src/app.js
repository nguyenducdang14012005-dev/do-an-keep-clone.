import React from 'react';
import { MdOutlineLightbulb, MdSearch, MdMenu, MdOutlineNotifications, MdOutlineEdit, MdOutlineArchive, MdOutlineDelete, MdCheckBox, MdBrush, MdImage } from "react-icons/md";
import './App.css'; // Kết nối file CSS riêng ở đây

function App() {
  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <MdMenu className="icon-large" />
        <h1 className="logo">Keep Clone</h1>
        <input className="search-bar" placeholder="Tìm kiếm..." />
      </header>

      {/* Main Layout */}
      <div className="main-wrapper">
        <aside className="sidebar">
          <div className="nav-item active">
            <MdOutlineLightbulb className="icon-medium" /> <span>Ghi chú</span>
          </div>
          <div className="nav-item">
            <MdOutlineNotifications className="icon-medium" /> <span>Lời nhắc</span>
          </div>
          <div className="nav-item">
            <MdOutlineEdit className="icon-medium" /> <span>Chỉnh sửa nhãn</span>
          </div>
        </aside>

        <main className="content">
          <div className="note-input">
            <input placeholder="Viết ghi chú..." />
            <div className="note-actions">
              <MdCheckBox /> <MdBrush /> <MdImage />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;