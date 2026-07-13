const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// Kết nối qua config/db.js — database = process.env.DB_NAME (dự án dùng quanlyhocphi trong backend/.env).
const db = require('../config/db');

const login = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Thiếu username hoặc password!" });
    }

    try {
        const sql = `
            SELECT 
                tk.id,
                tk.username,
                tk.passwordHash,
                tk.role,
                tk.studentId,
                sv.studentCode,
                sv.isBanned
            FROM TaiKhoan tk
            LEFT JOIN SinhVien sv ON tk.studentId = sv.id
            WHERE tk.username = ?
            LIMIT 1
        `;

        const [rows] = await db.query(sql, [username]);
        if (!rows || rows.length === 0) {
            return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu!" });
        }

        const userRow = rows[0];
        const isMatch = await bcrypt.compare(password, userRow.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: "Sai tài khoản hoặc mật khẩu!" });
        }

        if (userRow.role === 'student' && userRow.isBanned) {
            return res.status(403).json({ message: "Tài khoản sinh viên đã bị khóa!" });
        }

        const payload = {
            id: userRow.id,
            username: userRow.username,
            role: userRow.role,
            studentId: userRow.studentId,
            studentCode: userRow.studentCode || null
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

        return res.json({
            message: "Đăng nhập thành công!",
            token,
            user: payload
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

const allowedRegisterRoles = ['admin', 'staff', 'student']

const getAllAccounts = async (req, res) => {
    try {
        const sql = `
            SELECT tk.id, tk.username, tk.role, tk.studentId,
                   sv.studentCode, sv.fullName
            FROM TaiKhoan tk
            LEFT JOIN SinhVien sv ON tk.studentId = sv.id
            ORDER BY tk.id ASC
        `
        const [rows] = await db.query(sql)
        return res.json({ data: rows })
    } catch (error) {
        return res.status(500).json({ error: error.message })
    }
}

const register = async (req, res) => {
    const { username, password, role, studentId } = req.body;

    const usernameTrim = typeof username === 'string' ? username.trim() : ''
    const passwordTrim = typeof password === 'string' ? password : ''
    const roleTrim = typeof role === 'string' ? role.trim() : role

    if (!usernameTrim || !passwordTrim || !roleTrim) {
        return res.status(400).json({ message: "Thiếu username, password hoặc role!" });
    }

    if (!allowedRegisterRoles.includes(roleTrim)) {
        return res.status(400).json({ message: "Role không hợp lệ!" });
    }

    if (roleTrim === 'student' && (studentId === undefined || studentId === null || studentId === '')) {
        return res.status(400).json({ message: "Tài khoản sinh viên cần studentId!" });
    }

    if (roleTrim !== 'student' && studentId != null && studentId !== '') {
        return res.status(400).json({ message: "Chỉ tài khoản sinh viên được gắn studentId!" });
    }

    try {
        let normalizedStudentId = null
        if (roleTrim === 'student') {
            const parsed = typeof studentId === 'string' ? Number(studentId) : Number(studentId)
            if (!Number.isInteger(parsed) || parsed <= 0) {
                return res.status(400).json({ message: "studentId không hợp lệ!" })
            }
            normalizedStudentId = parsed

            // 1 SV tối đa 1 tài khoản
            const [existingAcc] = await db.query(
                'SELECT id FROM TaiKhoan WHERE studentId = ? LIMIT 1',
                [normalizedStudentId]
            )
            if (existingAcc && existingAcc.length > 0) {
                return res.status(409).json({ message: "Sinh viên này đã có tài khoản đăng nhập!" })
            }

            // studentId phải tồn tại
            const [studentRows] = await db.query(
                'SELECT id FROM SinhVien WHERE id = ? LIMIT 1',
                [normalizedStudentId]
            )
            if (!studentRows || studentRows.length === 0) {
                return res.status(404).json({ message: "Không tìm thấy sinh viên với studentId đã cung cấp!" })
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(passwordTrim, salt);

        const sql = "INSERT INTO TaiKhoan (username, passwordHash, role, studentId) VALUES (?, ?, ?, ?)";
        await db.query(sql, [usernameTrim, hashedPassword, roleTrim, normalizedStudentId]);

        return res.status(201).json({ message: "Tạo tài khoản thành công!" });
    } catch (error) {
        if (error && error.code === 'ER_DUP_ENTRY') {
            const msg = String(error?.message || '')
            if (msg.includes('studentId')) {
                return res.status(409).json({ message: "Sinh viên này đã có tài khoản đăng nhập!" })
            }
            return res.status(409).json({ message: "Username đã tồn tại!" });
        }
        res.status(500).json({ error: error.message });
    }
};

const defaultResetPassword = "123456";

const resetPassword = async (req, res) => {
    const { studentCode, username } = req.body;
    const codeTrim =
        typeof studentCode === "string" && studentCode.trim() ? studentCode.trim() : "";
    const usernameTrim = typeof username === "string" && username.trim() ? username.trim() : "";

    if (!codeTrim && !usernameTrim) {
        return res.status(400).json({ message: "Thiếu mã sinh viên hoặc username!" });
    }

    try {
        let rows;
        if (codeTrim) {
            const sql = `
                SELECT tk.id
                FROM TaiKhoan tk
                INNER JOIN SinhVien sv ON tk.studentId = sv.id
                WHERE sv.studentCode = ?
                LIMIT 1
            `;
            [rows] = await db.query(sql, [codeTrim]);
        } else {
            const sql = `SELECT tk.id FROM TaiKhoan tk WHERE tk.username = ? LIMIT 1`;
            [rows] = await db.query(sql, [usernameTrim]);
        }

        if (!rows || rows.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy tài khoản!" });
        }

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(defaultResetPassword, salt);
        await db.query("UPDATE TaiKhoan SET passwordHash = ? WHERE id = ?", [passwordHash, rows[0].id]);

        return res.json({ message: "Mật khẩu đã được đặt lại về mặc định." });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

module.exports = { login, register, getAllAccounts, resetPassword };