-- Enforce: one student can have at most one login account.
-- MySQL UNIQUE allows multiple NULLs, so admin/staff rows (studentId NULL) are unaffected.

ALTER TABLE TaiKhoan
  ADD UNIQUE KEY uk_taikhoan_studentId (studentId);

