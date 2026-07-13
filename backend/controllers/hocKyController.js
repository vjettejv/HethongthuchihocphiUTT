const db = require('../config/db')

const getAllSemesters = async (req, res) => {
  try {
    const sql = `
      SELECT id, semesterName, startDate, deadlineDays
      FROM HocKy
      ORDER BY id DESC
    `
    const [rows] = await db.query(sql)
    return res.json({ data: rows })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const getSemesterById = async (req, res) => {
  const { id } = req.params
  try {
    const sql = `
      SELECT id, semesterName, startDate, deadlineDays
      FROM HocKy
      WHERE id = ?
      LIMIT 1
    `
    const [rows] = await db.query(sql, [id])
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy học kỳ!' })
    }
    return res.json({ data: rows[0] })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const createSemester = async (req, res) => {
  const { semesterName, startDate, deadlineDays } = req.body

  if (!semesterName || !startDate || deadlineDays === undefined || deadlineDays === null) {
    return res.status(400).json({ message: 'Thiếu Tên học kỳ, Ngày bắt đầu hoặc Số ngày hạn!' })
  }

  try {
    const sql = `
      INSERT INTO HocKy (semesterName, startDate, deadlineDays)
      VALUES (?, ?, ?)
    `
    const [result] = await db.query(sql, [semesterName, startDate, deadlineDays])
    return res.status(201).json({
      message: 'Tạo học kỳ thành công!',
      data: { id: result.insertId }
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const updateSemester = async (req, res) => {
  const { id } = req.params
  const { semesterName, startDate, deadlineDays } = req.body

  if (!semesterName || !startDate || deadlineDays === undefined || deadlineDays === null) {
    return res.status(400).json({ message: 'Thiếu Tên học kỳ, Ngày bắt đầu hoặc Số ngày hạn!' })
  }

  try {
    const sql = `
      UPDATE HocKy
      SET semesterName = ?, startDate = ?, deadlineDays = ?
      WHERE id = ?
    `
    const [result] = await db.query(sql, [semesterName, startDate, deadlineDays, id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy học kỳ!' })
    }
    return res.json({ message: 'Cập nhật học kỳ thành công!' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const deleteSemester = async (req, res) => {
  const { id } = req.params
  try {
    const sql = 'DELETE FROM HocKy WHERE id = ?'
    const [result] = await db.query(sql, [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy học kỳ!' })
    }
    return res.json({ message: 'Xóa học kỳ thành công!' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const getFeesBySemesterId = async (req, res) => {
  const { id } = req.params
  try {
    const sql = `
      SELECT id, semesterId, feeName, amount
      FROM KhoanPhi
      WHERE semesterId = ?
      ORDER BY id DESC
    `
    const [rows] = await db.query(sql, [id])
    return res.json({ data: rows })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

module.exports = {
  getAllSemesters,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester,
  getFeesBySemesterId
}
