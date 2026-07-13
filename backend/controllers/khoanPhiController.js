const db = require('../config/db')

const getAllFees = async (req, res) => {
  try {
    const sql = `
      SELECT id, semesterId, feeName, amount
      FROM KhoanPhi
      ORDER BY id DESC
    `
    const [rows] = await db.query(sql)
    return res.json({ data: rows })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const getFeeById = async (req, res) => {
  const { id } = req.params
  try {
    const sql = `
      SELECT id, semesterId, feeName, amount
      FROM KhoanPhi
      WHERE id = ?
      LIMIT 1
    `
    const [rows] = await db.query(sql, [id])
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy khoản phí!' })
    }
    return res.json({ data: rows[0] })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const createFee = async (req, res) => {
  const { semesterId, feeName, amount } = req.body

  if (!semesterId || !feeName || amount === undefined || amount === null) {
    return res.status(400).json({ message: 'Thiếu Học kỳ, Tên khoản phí hoặc Số tiền!' })
  }

  try {
    const sql = `
      INSERT INTO KhoanPhi (semesterId, feeName, amount)
      VALUES (?, ?, ?)
    `
    const [result] = await db.query(sql, [semesterId, feeName, amount])
    return res.status(201).json({
      message: 'Tạo khoản phí thành công!',
      data: { id: result.insertId }
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const updateFee = async (req, res) => {
  const { id } = req.params
  const { semesterId, feeName, amount } = req.body

  if (!semesterId || !feeName || amount === undefined || amount === null) {
    return res.status(400).json({ message: 'Thiếu Học kỳ, Tên khoản phí hoặc Số tiền!' })
  }

  try {
    const sql = `
      UPDATE KhoanPhi
      SET semesterId = ?, feeName = ?, amount = ?
      WHERE id = ?
    `
    const [result] = await db.query(sql, [semesterId, feeName, amount, id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy khoản phí!' })
    }
    return res.json({ message: 'Cập nhật khoản phí thành công!' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const deleteFee = async (req, res) => {
  const { id } = req.params
  try {
    const sql = 'DELETE FROM KhoanPhi WHERE id = ?'
    const [result] = await db.query(sql, [id])
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Không tìm thấy khoản phí!' })
    }
    return res.json({ message: 'Xóa khoản phí thành công!' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

module.exports = {
  getAllFees,
  getFeeById,
  createFee,
  updateFee,
  deleteFee
}
