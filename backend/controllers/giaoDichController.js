const db = require('../config/db')
const { isOptionalFeeName } = require('../helpers/optionalFee')
const { buildVietQrImageUrl } = require('../config/vietQrConfig')

const getAllPayments = async (req, res) => {
  try {
    const sql = `
      SELECT id, invoiceId, amount, paymentDate, method
      FROM GiaoDich
      ORDER BY id DESC
    `
    const [rows] = await db.query(sql)
    return res.json({ data: rows })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const createPayment = async (req, res) => {
  const { invoiceId, amount, method } = req.body

  if (!invoiceId || amount === undefined || amount === null || !method) {
    return res.status(400).json({ message: 'Thiếu invoiceId, số tiền hoặc phương thức!' })
  }

  const paymentAmount = Number(amount)
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({ message: 'Số tiền không hợp lệ!' })
  }

  if (method !== 'online' && method !== 'cash') {
    return res.status(400).json({ message: 'Phương thức thanh toán không hợp lệ!' })
  }

  let connection
  try {
    connection = await db.getConnection()
    await connection.beginTransaction()

    const [invoiceRows] = await connection.query(
      'SELECT id, totalAmount, paidAmount FROM HoaDon WHERE id = ? FOR UPDATE',
      [invoiceId]
    )

    if (!invoiceRows || invoiceRows.length === 0) {
      await connection.rollback()
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn!' })
    }

    const invoice = invoiceRows[0]
    const totalAmount = Number(invoice.totalAmount || 0)
    const currentPaidAmount = Number(invoice.paidAmount || 0)

    await connection.query('INSERT INTO GiaoDich (invoiceId, amount, method, paymentDate) VALUES (?, ?, ?, NOW())', [
      invoiceId,
      paymentAmount,
      method
    ])

    const nextPaidAmount = currentPaidAmount + paymentAmount

    let nextStatus = 'pending'
    if (nextPaidAmount >= totalAmount && totalAmount > 0) nextStatus = 'paid'
    else if (nextPaidAmount > 0 && nextPaidAmount < totalAmount) nextStatus = 'partial'
    else if (nextPaidAmount > 0 && totalAmount === 0) nextStatus = 'paid'

    await connection.query('UPDATE HoaDon SET paidAmount = ?, status = ? WHERE id = ?', [
      nextPaidAmount,
      nextStatus,
      invoiceId
    ])

    await connection.commit()
    return res.status(201).json({
      message: 'Thanh toán thành công!',
      data: { invoiceId: Number(invoiceId), paidAmount: nextPaidAmount, status: nextStatus }
    })
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback()
      } catch {
        // ignore rollback errors
      }
    }
    return res.status(500).json({ error: error.message })
  } finally {
    if (connection) connection.release()
  }
}

const studentPayInvoice = async (req, res) => {
  const studentId = req.user?.studentId

  if (req.user?.role !== 'student') {
    return res.status(403).json({ message: 'Chỉ sinh viên mới được thanh toán!' })
  }

  if (studentId === undefined || studentId === null) {
    return res.status(403).json({ message: 'Tài khoản chưa được gắn với sinh viên!' })
  }

  const { invoiceId, amount, waiveFeeIds } = req.body
  const waiveIds = Array.isArray(waiveFeeIds)
    ? [...new Set(waiveFeeIds.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0))]
    : []

  if (!invoiceId || amount === undefined || amount === null) {
    return res.status(400).json({ message: 'Thiếu invoiceId hoặc số tiền!' })
  }

  const paymentAmount = Number(amount)
  if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
    return res.status(400).json({ message: 'Số tiền không hợp lệ!' })
  }

  let connection
  try {
    connection = await db.getConnection()
    await connection.beginTransaction()

    const [invoiceRows] = await connection.query(
      'SELECT id, semesterId, totalAmount, paidAmount FROM HoaDon WHERE id = ? AND studentId = ? FOR UPDATE',
      [invoiceId, studentId]
    )

    if (!invoiceRows || invoiceRows.length === 0) {
      await connection.rollback()
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn hoặc hóa đơn không thuộc tài khoản của bạn!' })
    }

    const invoice = invoiceRows[0]
    let totalAmount = Number(invoice.totalAmount || 0)
    const currentPaidAmount = Number(invoice.paidAmount || 0)
    const semesterId = invoice.semesterId

    if (waiveIds.length > 0) {
      if (currentPaidAmount > 0) {
        await connection.rollback()
        return res.status(400).json({
          message: 'Chỉ được bỏ khoản phí tùy chọn ở lần thanh toán đầu tiên (chưa có khoản nào được ghi nhận)!'
        })
      }

      const [feeRows] = await connection.query(
        'SELECT id, feeName, amount FROM KhoanPhi WHERE semesterId = ?',
        [semesterId]
      )
      const feeById = new Map((feeRows || []).map((row) => [row.id, row]))
      let waiverSum = 0
      for (const kid of waiveIds) {
        const row = feeById.get(kid)
        if (!row || !isOptionalFeeName(row.feeName)) {
          await connection.rollback()
          return res.status(400).json({ message: 'Danh sách bỏ khoản phí không hợp lệ!' })
        }
        waiverSum += Number(row.amount || 0)
      }

      const newTotal = totalAmount - waiverSum
      if (newTotal < currentPaidAmount) {
        await connection.rollback()
        return res.status(400).json({ message: 'Không thể bỏ khoản phí: số tiền hóa đơn sau khi điều chỉnh không hợp lệ!' })
      }

      await connection.query('UPDATE HoaDon SET totalAmount = ? WHERE id = ?', [newTotal, invoiceId])
      totalAmount = newTotal
    }

    const remaining = Math.max(0, totalAmount - currentPaidAmount)

    if (remaining <= 0) {
      await connection.rollback()
      return res.status(400).json({ message: 'Hóa đơn đã được thanh toán đủ!' })
    }

    if (paymentAmount > remaining) {
      await connection.rollback()
      return res.status(400).json({ message: `Số tiền vượt quá số còn nợ (${remaining})!` })
    }

    const method = 'online'

    await connection.query('INSERT INTO GiaoDich (invoiceId, amount, method, paymentDate) VALUES (?, ?, ?, NOW())', [
      invoiceId,
      paymentAmount,
      method
    ])

    const nextPaidAmount = currentPaidAmount + paymentAmount

    let nextStatus = 'pending'
    if (nextPaidAmount >= totalAmount && totalAmount > 0) nextStatus = 'paid'
    else if (nextPaidAmount > 0 && nextPaidAmount < totalAmount) nextStatus = 'partial'
    else if (nextPaidAmount > 0 && totalAmount === 0) nextStatus = 'paid'

    await connection.query('UPDATE HoaDon SET paidAmount = ?, status = ? WHERE id = ?', [
      nextPaidAmount,
      nextStatus,
      invoiceId
    ])

    await connection.commit()
    return res.status(201).json({
      message: 'Thanh toán online thành công!',
      data: { invoiceId: Number(invoiceId), paidAmount: nextPaidAmount, status: nextStatus }
    })
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback()
      } catch {
        // ignore rollback errors
      }
    }
    return res.status(500).json({ error: error.message })
  } finally {
    if (connection) connection.release()
  }
}

const getStudentVietQr = async (req, res) => {
  const studentId = req.user?.studentId

  if (req.user?.role !== 'student') {
    return res.status(403).json({ message: 'Chỉ sinh viên mới được truy cập!' })
  }
  if (studentId === undefined || studentId === null) {
    return res.status(403).json({ message: 'Tài khoản chưa được gắn với sinh viên!' })
  }

  const invoiceId = Number(req.params.invoiceId)
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    return res.status(400).json({ message: 'Mã hóa đơn không hợp lệ!' })
  }

  try {
    const [rows] = await db.query(
      'SELECT id, totalAmount, paidAmount FROM HoaDon WHERE id = ? AND studentId = ? LIMIT 1',
      [invoiceId, studentId]
    )
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn hoặc hóa đơn không thuộc tài khoản của bạn!' })
    }
    const row = rows[0]
    const totalAmount = Number(row.totalAmount || 0)
    const paidAmount = Number(row.paidAmount || 0)
    const amountToPay = Math.max(0, totalAmount - paidAmount)

    if (amountToPay <= 0) {
      return res.status(400).json({ message: 'Hóa đơn không còn số tiền cần thanh toán!' })
    }

    const addInfo = `ThanhToan_HD${invoiceId}`
    const qrImageUrl = buildVietQrImageUrl({ invoiceId, amountVnd: amountToPay })

    return res.json({
      data: {
        qrImageUrl,
        amountToPay,
        invoiceId,
        addInfo
      }
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const confirmStudentVietQrPayment = async (req, res) => {
  const studentId = req.user?.studentId

  if (req.user?.role !== 'student') {
    return res.status(403).json({ message: 'Chỉ sinh viên mới được xác nhận thanh toán!' })
  }
  if (studentId === undefined || studentId === null) {
    return res.status(403).json({ message: 'Tài khoản chưa được gắn với sinh viên!' })
  }

  const invoiceId = Number(req.params.invoiceId)
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    return res.status(400).json({ message: 'Mã hóa đơn không hợp lệ!' })
  }

  const paymentMethod = 'VietQR'
  let connection
  try {
    connection = await db.getConnection()
    await connection.beginTransaction()

    const [invoiceRows] = await connection.query(
      'SELECT id, totalAmount, paidAmount FROM HoaDon WHERE id = ? AND studentId = ? FOR UPDATE',
      [invoiceId, studentId]
    )

    if (!invoiceRows || invoiceRows.length === 0) {
      await connection.rollback()
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn hoặc hóa đơn không thuộc tài khoản của bạn!' })
    }

    const invoice = invoiceRows[0]
    const totalAmount = Number(invoice.totalAmount || 0)
    const currentPaidAmount = Number(invoice.paidAmount || 0)
    const amountToPay = Math.max(0, totalAmount - currentPaidAmount)

    if (amountToPay <= 0) {
      await connection.rollback()
      return res.status(400).json({ message: 'Hóa đơn đã được thanh toán đủ!' })
    }

    await connection.query(
      'INSERT INTO GiaoDich (invoiceId, amount, method, paymentDate) VALUES (?, ?, ?, NOW())',
      [invoiceId, amountToPay, paymentMethod]
    )

    const nextPaidAmount = currentPaidAmount + amountToPay

    let nextStatus = 'pending'
    if (nextPaidAmount >= totalAmount && totalAmount > 0) nextStatus = 'paid'
    else if (nextPaidAmount > 0 && nextPaidAmount < totalAmount) nextStatus = 'partial'
    else if (nextPaidAmount > 0 && totalAmount === 0) nextStatus = 'paid'

    await connection.query('UPDATE HoaDon SET paidAmount = ?, status = ? WHERE id = ?', [
      nextPaidAmount,
      nextStatus,
      invoiceId
    ])

    await connection.commit()
    return res.status(201).json({
      message: 'Xác nhận thanh toán VietQR thành công!',
      data: { invoiceId, paidAmount: nextPaidAmount, status: nextStatus, amountRecorded: amountToPay }
    })
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

const getStudentPayments = async (req, res) => {
  const studentId = req.user?.studentId

  if (req.user?.role !== 'student') {
    return res.status(403).json({ message: 'Chỉ sinh viên mới được truy cập!' })
  }

  if (studentId === undefined || studentId === null) {
    return res.status(403).json({ message: 'Tài khoản chưa được gắn với sinh viên!' })
  }

  try {
    const sql = `
      SELECT
        gd.id,
        gd.invoiceId,
        gd.amount,
        gd.paymentDate,
        gd.method,
        hk.semesterName,
        hd.status AS invoiceStatus
      FROM GiaoDich gd
      INNER JOIN HoaDon hd ON gd.invoiceId = hd.id
      LEFT JOIN HocKy hk ON hd.semesterId = hk.id
      WHERE hd.studentId = ? AND hd.status = 'paid'
      ORDER BY gd.paymentDate DESC
    `
    const [rows] = await db.query(sql, [studentId])
    return res.json({ data: rows })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

module.exports = {
  getAllPayments,
  createPayment,
  studentPayInvoice,
  getStudentPayments,
  getStudentVietQr,
  confirmStudentVietQrPayment
}
