# Hệ thống quản lý thu học phí (CNPM)

Stack: React (Vite) + Node.js (Express) + MySQL.

## 1. Cơ sở dữ liệu

- Tạo database và bảng bằng file `schema.sql` (mặc định dùng database **`quanlyhocphi`**).
- Chạy script SQL trong MySQL Workbench, CLI hoặc công cụ tương đương.

## 2. Backend

Thư mục: `backend/`

1. `npm install`
2. Tạo/sửa file `.env` (tham khảo các biến sau):

   - `PORT` — cổng API (mặc định `8080`)
   - `FRONTEND_URL` — URL frontend cho CORS (dev: `http://localhost:5173`)
   - `DB_HOST`, `DB_USER`, `DB_PASSWORD`, **`DB_NAME=quanlyhocphi`**
   - `JWT_SECRET` — chuỗi bí mật ký JWT
   - (Tùy chọn VietQR) `BANK_ID`, `BANK_ACCOUNT`, `ACCOUNT_NAME` — dùng cho QR chuyển khoản sinh viên (mặc định: `MB`, `0123456789`, `NGUYEN VAN A`)

3. Nạp dữ liệu mẫu (tùy chọn): `npm run seed`
4. Chạy server: `npm start` (hoặc `node server.js`)

API gốc: `http://localhost:8080` — các route REST nằm dưới tiền tố `/api/...`.

## 3. Frontend

Thư mục: `frontend/`

1. `npm install`
2. File `.env` đã có `VITE_API_BASE_URL=http://localhost:8080/api` (đổi nếu API deploy khác host/port).
3. Chạy dev: `npm run dev`

## Ghi chú production

- Đặt `FRONTEND_URL` trên backend đúng với URL thật của ứng dụng web (HTTPS nếu có).
- Đặt `VITE_API_BASE_URL` trên frontend trỏ tới API production (ví dụ `https://api.example.com/api`) rồi build: `npm run build`.
