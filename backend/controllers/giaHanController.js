const db = require('../config/db')

const createExtension = async (req, res) => {
  const { invoiceId, daysAdded, reason } = req.body
  const grantedBy = req.user?.username || null

  if (!invoiceId || daysAdded === undefined || daysAdded === null) {
    return res.status(400).json({ message: 'Thiếu mã hóa đơn hoặc số ngày gia hạn!' })
  }

  const days = Number(daysAdded)
  if (!Number.isFinite(days) || days <= 0) {
    return res.status(400).json({ message: 'Số ngày gia hạn phải là số dương!' })
  }

  let connection
  try {
    connection = await db.getConnection()
    await connection.beginTransaction()

    const [invoiceRows] = await connection.query(
      'SELECT id, status FROM HoaDon WHERE id = ? FOR UPDATE',
      [invoiceId]
    )

    if (!invoiceRows || invoiceRows.length === 0) {
      await connection.rollback()
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn!' })
    }

    if (invoiceRows[0].status === 'paid') {
      await connection.rollback()
      return res.status(400).json({ message: 'Không gia hạn hóa đơn đã thanh toán đủ!' })
    }

    await connection.query(
      'INSERT INTO GiaHan (invoiceId, daysAdded, reason, grantedBy) VALUES (?, ?, ?, ?)',
      [invoiceId, days, reason || null, grantedBy]
    )

    await connection.query(
      `UPDATE HoaDon
       SET effectiveDeadline = DATE_ADD(effectiveDeadline, INTERVAL ? DAY)
       WHERE id = ?`,
      [days, invoiceId]
    )

    await connection.commit()
    return res.status(201).json({ message: 'Gia hạn thành công!' })
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback()
      } catch {
        // ignore
      }
    }
    return res.status(500).json({ error: error.message })
  } finally {
    if (connection) connection.release()
  }
}

module.exports = { createExtension }
