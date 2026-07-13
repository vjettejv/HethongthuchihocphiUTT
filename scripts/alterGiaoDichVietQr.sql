-- Chạy một lần nếu database đã tồn tại trước khi thêm VietQR (MySQL).
USE quanlyhocphi;
ALTER TABLE GiaoDich MODIFY COLUMN method ENUM('online', 'cash', 'VietQR') NOT NULL;
