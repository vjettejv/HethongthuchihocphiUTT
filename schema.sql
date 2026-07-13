-- ======================================================
-- DATABASE: tuition_simple
-- Tên bảng: tiếng Việt (SinhVien, HocKy, KhoanPhi, HoaDon, GiaHan, GiaoDich, TaiKhoan)
-- Tên cột: camelCase (viết hoa chữ cái đầu sau từ đầu tiên)
-- ======================================================
CREATE DATABASE IF NOT EXISTS quanlyhocphi;
USE quanlyhocphi;

-- 1. Bảng SinhVien
CREATE TABLE SinhVien (
    id INT PRIMARY KEY AUTO_INCREMENT,
    studentCode VARCHAR(20) NOT NULL UNIQUE,
    fullName VARCHAR(100) NOT NULL,
    className VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(15),
    passwordHash VARCHAR(255) NOT NULL,
    isBanned BOOLEAN DEFAULT FALSE,
    bannedDate DATE NULL
);

-- 2. Bảng HocKy (quản lý set thời hạn)
CREATE TABLE HocKy (
    id INT PRIMARY KEY AUTO_INCREMENT,
    semesterName VARCHAR(50) NOT NULL,
    startDate DATE NOT NULL,
    deadlineDays INT NOT NULL
);

-- 3. Bảng KhoanPhi (khoản phí theo học kỳ)
CREATE TABLE KhoanPhi (
    id INT PRIMARY KEY AUTO_INCREMENT,
    semesterId INT NOT NULL,
    feeName VARCHAR(100) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (semesterId) REFERENCES HocKy(id) ON DELETE CASCADE
);

-- 4. Bảng HoaDon
CREATE TABLE HoaDon (
    id INT PRIMARY KEY AUTO_INCREMENT,
    studentId INT NOT NULL,
    semesterId INT NOT NULL,
    issueDate DATE NOT NULL,
    originalDeadline DATE NOT NULL,
    effectiveDeadline DATE NOT NULL,
    totalAmount DECIMAL(15,2) NOT NULL,
    paidAmount DECIMAL(15,2) DEFAULT 0,
    status ENUM('pending','partial','paid','overdue') DEFAULT 'pending',
    FOREIGN KEY (studentId) REFERENCES SinhVien(id),
    FOREIGN KEY (semesterId) REFERENCES HocKy(id)
);

-- 5. Bảng GiaHan (trường hợp đặc biệt)
CREATE TABLE GiaHan (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoiceId INT NOT NULL,
    daysAdded INT NOT NULL,
    reason TEXT,
    grantedBy VARCHAR(50),
    grantedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoiceId) REFERENCES HoaDon(id) ON DELETE CASCADE
);

-- 6. Bảng GiaoDich (thanh toán)
CREATE TABLE GiaoDich (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoiceId INT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    paymentDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    method ENUM('online','cash','VietQR') NOT NULL,
    FOREIGN KEY (invoiceId) REFERENCES HoaDon(id)
);

-- 7. Bảng TaiKhoan (người dùng)
CREATE TABLE TaiKhoan (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    passwordHash VARCHAR(255) NOT NULL,
    role ENUM('admin','staff','student') NOT NULL,
    studentId INT NULL,
    FOREIGN KEY (studentId) REFERENCES SinhVien(id) ON DELETE CASCADE
);