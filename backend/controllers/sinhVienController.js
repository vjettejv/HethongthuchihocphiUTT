const bcrypt = require('bcryptjs')
const db = require('../config/db')

const getAllStudents = async (req, res) => {
  try {
    const sql = `
      SELECT id, studentCode, fullName, className, email, phone, isBanned, bannedDate
      FROM SinhVien
      ORDER BY id DESC
    `
    const [rows] = await db.query(sql)
    return res.json({ data: rows })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const getStudentById = async (req, res) => {
  const { id } = req.params
  try {
    const sql = `
      SELECT id, studentCode, fullName, className, email, phone, isBanned, bannedDate
      FROM SinhVien
      WHERE id = ?
      LIMIT 1
    `
    const [rows] = await db.query(sql, [id])
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sinh viên!' })
    }
    return res.json({ data: rows[0] })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const createStudent = async (req, res) => {
  const { studentCode, fullName, className, email, phone, password } = req.body

  if (!studentCode || !fullName) {
    return res.status(400).json({ message: 'Thiếu Mã SV hoặc Họ tên!' })
  }

  try {
    const rawPassword = password || '123456'
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(rawPassword, salt)

    const sql = `
      INSERT INTO SinhVien (studentCode, fullName, className, email, phone, passwordHash)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    const [result] = await db.query(sql, [
      studentCode,
      fullName,
      className || null,
      email || null,
      phone || null,
      passwordHash
    ])

    return res.status(201).json({
      message: 'Tạo sinh viên thành công!',
      data: { id: result.insertId }
    })
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Mã SV đã tồn tại!' })
    }
    return res.status(500).json({ error: error.message })
  }
}

const updateStudent = async (req, res) => {
  const { id } = req.params
  const { studentCode, fullName, className, email, phone, password } = req.body

  if (!studentCode || !fullName) {
    return res.status(400).json({ message: 'Thiếu Mã SV hoặc Họ tên!' })
  }

  try {
    if (password) {
      const salt = await bcrypt.genSalt(10)
      const passwordHash = await bcrypt.hash(password, salt)
      const sqlWithPassword = `
        UPDATE SinhVien
        SET studentCode = ?, fullName = ?, className = ?, email = ?, phone = ?, passwordHash = ?
        WHERE id = ?
      `
      const [result] = await db.query(sqlWithPassword, [
        studentCode,
        fullName,
        className || null,
        email || null,
        phone || null,
        passwordHash,
        id
      ])

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Không tìm thấy sinh viên!' })
      }
      return res.json({ message: 'Cập nhật sinh viên thành công!' })
    }

    const sql = `
      UPDATE SinhVien
      SET studentCode = ?, fullName = ?, className = ?, email = ?, phone = ?
      WHERE id = ?
    `
    const [result] = await db.query(sql, [
      studentCode,
      fullName,
      className || null,
      email || null,
      phone || null,
      id
    ])

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sinh viên!' })
    }

    return res.json({ message: 'Cập nhật sinh viên thành công!' })
  } catch (error) {
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Mã SV đã tồn tại!' })
    }
    return res.status(500).json({ error: error.message })
  }
}

const toggleBanStudent = async (req, res) => {
  const { id } = req.params
  try {
    const selectSql = 'SELECT id, isBanned FROM SinhVien WHERE id = ? LIMIT 1'
    const [rows] = await db.query(selectSql, [id])
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sinh viên!' })
    }

    const currentIsBanned = !!rows[0].isBanned
    const nextIsBanned = !currentIsBanned

    const updateSql = `
      UPDATE SinhVien
      SET isBanned = ?, bannedDate = CASE WHEN ? THEN CURDATE() ELSE NULL END
      WHERE id = ?
    `
    await db.query(updateSql, [nextIsBanned, nextIsBanned, id])

    return res.json({
      message: nextIsBanned ? 'Đã khóa tài khoản sinh viên!' : 'Đã mở khóa tài khoản sinh viên!',
      data: { id: Number(id), isBanned: nextIsBanned }
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const getMyProfile = async (req, res) => {
  const studentId = req?.user?.studentId
  if (!studentId) {
    return res.status(400).json({ message: 'Token thiếu studentId!' })
  }
  try {
    const sql = `
      SELECT id, studentCode, fullName, className, email, phone, isBanned, bannedDate
      FROM SinhVien
      WHERE id = ?
      LIMIT 1
    `
    const [rows] = await db.query(sql, [studentId])
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sinh viên!' })
    }
    return res.json({ data: rows[0] })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  toggleBanStudent,
  getMyProfile
}
