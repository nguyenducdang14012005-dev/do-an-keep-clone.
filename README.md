# Google Keep Clone

Ứng dụng ghi chú mô phỏng theo Google Keep, hỗ trợ tạo – chỉnh sửa – quản lý ghi chú trực quan và thuận tiện.

#### Dưới sự hướng dẫn của giảng viên: Nguyên Thị Bích Nguyên

#### Thành viên thực hiện

- Nguyễn Đức Đăng
- Lê Bá Thuần
- Hoàng Quốc Kỳ

## Giới thiệu

Google Keep Clone là một ứng dụng web được xây dựng nhằm mô phỏng các chức năng cơ bản của Google Keep. Dự án cho phép người dùng tạo, chỉnh sửa, đánh dấu và quản lý ghi chú theo thời gian thực với giao diện đơn giản và dễ sử dụng.

Mục tiêu của dự án là thực hành xây dựng ứng dụng Fullstack với quy trình phát triển hiện đại gồm Frontend, Backend, Database và Git.

---

## Chức năng chính

### Quản lý ghi chú

- Tạo ghi chú mới
- Chỉnh sửa nội dung ghi chú
- Xóa mềm (Soft Delete)
- Ghim ghi chú quan trọng
- Đổi màu ghi chú
- Các chức năng cơ bản của một công cụ ghi chú

### Quản lý nhãn (Labels)

- Tạo nhãn
- Chỉnh sửa nhãn
- Gắn nhãn vào ghi chú
- Bỏ nhãn khỏi ghi chú

### Tài khoản & xác thực

- Đăng ký tài khoản
- Đăng nhập
- Xác thực người dùng bằng JWT
- Bảo vệ API

## Quản trị viên (Admin)

- Quản lý tài khoản
- Xem danh sách người dùng
- Tìm kiếm tài khoản
- Cập nhật thông tin người dùng
- Khóa / mở khóa tài khoản
- Xóa tài khoản

## Quản lý dữ liệu hệ thống

- Xem thống kê tổng số tài khoản
- Thống kê số lượng ghi chú
- Theo dõi hoạt động hệ thống

## Quản lý dữ liệu ghi chú

### Phân quyền

- User
- Admin

### Giao diện

- Responsive
- Giao diện gần giống Google Keep
- Trình soạn thảo nội dung trực quan

---

## Công nghệ sử dụng

### Frontend

- ReactJS
- HTML/CSS
- JavaScript
- Axios

### Backend

- Node.js
- Express.js

### Database

- SQL Server

### Công cụ khác

- Git
- GitHub
- Postman

---

## Cấu trúc thư mục

```bash
project/
│
├── frontend/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── assets/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── middlewares/
│   ├── models/
│   └── config/
│
├── database/
│
└── README.md
```

---
