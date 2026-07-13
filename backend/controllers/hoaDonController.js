const ExcelJS = require('exceljs')
const db = require('../config/db')
const { isOptionalFeeName } = require('../helpers/optionalFee')

const allowedInvoiceStatus = ['pending', 'partial', 'paid', 'overdue']

const toDateOnlyString = (value) => {
  if (value === undefined || value === null) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const getAllInvoices = async (req, res) => {
  try {
    const sql = `
      SELECT
        hd.id,
        hd.studentId,
        sv.studentCode,
        sv.fullName,
        sv.className,
        hd.semesterId,
        hk.semesterName,
        hd.issueDate,
        hd.originalDeadline,
        hd.effectiveDeadline,
        hd.totalAmount,
        hd.paidAmount,
        hd.status
      FROM HoaDon hd
      LEFT JOIN SinhVien sv ON hd.studentId = sv.id
      LEFT JOIN HocKy hk ON hd.semesterId = hk.id
      ORDER BY hd.id DESC
    `
    const [rows] = await db.query(sql)
    return res.json({ data: rows })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const exportDebtListExcel = async (req, res) => {
  try {
    const sql = `
      SELECT
        hd.id,
        sv.studentCode,
        sv.fullName,
        hk.semesterName,
        hd.totalAmount,
        hd.paidAmount,
        (hd.totalAmount - hd.paidAmount) AS debtAmount,
        hd.status,
        hd.effectiveDeadline
      FROM HoaDon hd
      LEFT JOIN SinhVien sv ON hd.studentId = sv.id
      LEFT JOIN HocKy hk ON hd.semesterId = hk.id
      WHERE hd.paidAmount < hd.totalAmount
      ORDER BY hd.id DESC
    `
    const [rows] = await db.query(sql)

    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('DanhSachNo', {
      views: [{ state: 'frozen', ySplit: 1 }]
    })
    sheet.columns = [
      { header: 'Mã HĐ', key: 'id', width: 10 },
      { header: 'Mã SV', key: 'studentCode', width: 14 },
      { header: 'Họ tên', key: 'fullName', width: 28 },
      { header: 'Học kỳ', key: 'semesterName', width: 22 },
      { header: 'Tổng tiền', key: 'totalAmount', width: 16 },
      { header: 'Đã nộp', key: 'paidAmount', width: 16 },
      { header: 'Còn nợ', key: 'debtAmount', width: 16 },
      { header: 'Trạng thái', key: 'status', width: 12 },
      { header: 'Hạn nộp', key: 'effectiveDeadline', width: 14 }
    ]
    sheet.getRow(1).font = { bold: true }
    for (const row of rows || []) {
      sheet.addRow({
        id: row.id,
        studentCode: row.studentCode,
        fullName: row.fullName,
        semesterName: row.semesterName,
        totalAmount: Number(row.totalAmount || 0),
        paidAmount: Number(row.paidAmount || 0),
        debtAmount: Number(row.debtAmount || 0),
        status: row.status,
        effectiveDeadline: row.effectiveDeadline
          ? row.effectiveDeadline instanceof Date
            ? row.effectiveDeadline.toISOString().slice(0, 10)
            : String(row.effectiveDeadline).slice(0, 10)
          : ''
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    const filename = `danh-sach-no-${new Date().toISOString().slice(0, 10)}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.send(Buffer.from(buffer))
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const getInvoiceStats = async (req, res) => {
  try {
    const sql = `
      SELECT
        IFNULL(SUM(totalAmount), 0) AS totalAmount,
        IFNULL(SUM(paidAmount), 0) AS paidAmount
      FROM HoaDon
    `
    const [rows] = await db.query(sql)
    const row = rows?.[0] || { totalAmount: 0, paidAmount: 0 }
    return res.json({
      data: {
        totalAmount: Number(row.totalAmount ?? 0),
        paidAmount: Number(row.paidAmount ?? 0)
      }
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const getInvoicesByStudentId = async (req, res) => {
  const { studentId } = req.params

  const requesterRole = req.user?.role
  const requesterStudentId = req.user?.studentId

  if (requesterRole === 'student' && Number(studentId) !== Number(requesterStudentId)) {
    return res.status(403).json({ message: 'Bạn không có quyền xem hóa đơn của sinh viên khác!' })
  }

  try {
    const sql = `
      SELECT
        hd.id,
        hd.studentId,
        sv.studentCode,
        sv.fullName,
        sv.className,
        hd.semesterId,
        hk.semesterName,
        hd.issueDate,
        hd.originalDeadline,
        hd.effectiveDeadline,
        hd.totalAmount,
        hd.paidAmount,
        hd.status
      FROM HoaDon hd
      LEFT JOIN SinhVien sv ON hd.studentId = sv.id
      LEFT JOIN HocKy hk ON hd.semesterId = hk.id
      WHERE hd.studentId = ?
      ORDER BY hd.id DESC
    `
    const [rows] = await db.query(sql, [studentId])
    return res.json({ data: rows })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const createInvoice = async (req, res) => {
  const { studentId, semesterId } = req.body

  if (!studentId || !semesterId) {
    return res.status(400).json({ message: 'Thiếu studentId hoặc semesterId!' })
  }

  try {
    const [studentRows] = await db.query('SELECT id FROM SinhVien WHERE id = ? LIMIT 1', [studentId])
    if (!studentRows || studentRows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy sinh viên!' })
    }

    const [semesterRows] = await db.query('SELECT id, startDate, deadlineDays FROM HocKy WHERE id = ? LIMIT 1', [semesterId])
    if (!semesterRows || semesterRows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy học kỳ!' })
    }

    const [existingInvoiceRows] = await db.query(
      'SELECT id FROM HoaDon WHERE studentId = ? AND semesterId = ? LIMIT 1',
      [studentId, semesterId]
    )
    if (existingInvoiceRows && existingInvoiceRows.length > 0) {
      return res.status(400).json({ message: 'Sinh viên này đã có hóa đơn trong học kỳ này!' })
    }

    const [sumRows] = await db.query('SELECT IFNULL(SUM(amount), 0) AS totalAmount FROM KhoanPhi WHERE semesterId = ?', [
      semesterId
    ])
    const totalAmount = Number(sumRows?.[0]?.totalAmount || 0)

    const issueDate = new Date()
    const startDateValue = new Date(semesterRows[0].startDate)
    const deadlineDays = Number(semesterRows[0].deadlineDays || 0)
    const originalDeadline = new Date(startDateValue)
    originalDeadline.setDate(originalDeadline.getDate() + deadlineDays)
    const effectiveDeadline = new Date(originalDeadline)

    const insertSql = `
      INSERT INTO HoaDon (
        studentId,
        semesterId,
        issueDate,
        originalDeadline,
        effectiveDeadline,
        totalAmount,
        paidAmount,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `

    const [result] = await db.query(insertSql, [
      studentId,
      semesterId,
      toDateOnlyString(issueDate),
      toDateOnlyString(originalDeadline),
      toDateOnlyString(effectiveDeadline),
      totalAmount,
      0,
      'pending'
    ])

    return res.status(201).json({
      message: 'Tạo hóa đơn thành công!',
      data: { id: result.insertId }
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const updateInvoice = async (req, res) => {
  const { id } = req.params
  const invoiceId = Number(id)
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    return res.status(400).json({ message: 'Mã hóa đơn không hợp lệ!' })
  }

  const forbiddenKeys = ['totalAmount', 'paidAmount', 'studentId', 'semesterId']
  for (const key of forbiddenKeys) {
    if (Object.prototype.hasOwnProperty.call(req.body, key)) {
      return res.status(400).json({ message: `Không được phép sửa trường: ${key}` })
    }
  }

  const { status, issueDate, originalDeadline, effectiveDeadline } = req.body

  const hasStatus = status !== undefined
  const hasIssueDate = issueDate !== undefined
  const hasOriginalDeadline = originalDeadline !== undefined
  const hasEffectiveDeadline = effectiveDeadline !== undefined

  if (!hasStatus && !hasIssueDate && !hasOriginalDeadline && !hasEffectiveDeadline) {
    return res.status(400).json({ message: 'Cần ít nhất một trong: status, issueDate, originalDeadline, effectiveDeadline!' })
  }

  if (hasStatus && !allowedInvoiceStatus.includes(status)) {
    return res.status(400).json({ message: 'Trạng thái không hợp lệ!' })
  }

  const issueDateStr = hasIssueDate ? toDateOnlyString(issueDate) : null
  const originalDeadlineStr = hasOriginalDeadline ? toDateOnlyString(originalDeadline) : null
  const effectiveDeadlineStr = hasEffectiveDeadline ? toDateOnlyString(effectiveDeadline) : null

  if (hasIssueDate && !issueDateStr) {
    return res.status(400).json({ message: 'issueDate không hợp lệ!' })
  }
  if (hasOriginalDeadline && !originalDeadlineStr) {
    return res.status(400).json({ message: 'originalDeadline không hợp lệ!' })
  }
  if (hasEffectiveDeadline && !effectiveDeadlineStr) {
    return res.status(400).json({ message: 'effectiveDeadline không hợp lệ!' })
  }

  try {
    const [existingRows] = await db.query('SELECT id FROM HoaDon WHERE id = ? LIMIT 1', [invoiceId])
    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn!' })
    }

    const updates = []
    const values = []
    if (hasStatus) {
      updates.push('status = ?')
      values.push(status)
    }
    if (hasIssueDate) {
      updates.push('issueDate = ?')
      values.push(issueDateStr)
    }
    if (hasOriginalDeadline) {
      updates.push('originalDeadline = ?')
      values.push(originalDeadlineStr)
    }
    if (hasEffectiveDeadline) {
      updates.push('effectiveDeadline = ?')
      values.push(effectiveDeadlineStr)
    }

    values.push(invoiceId)
    await db.query(`UPDATE HoaDon SET ${updates.join(', ')} WHERE id = ?`, values)

    return res.json({ message: 'Cập nhật hóa đơn thành công!' })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const deleteInvoice = async (req, res) => {
  const { id } = req.params
  const invoiceId = Number(id)
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    return res.status(400).json({ message: 'Mã hóa đơn không hợp lệ!' })
  }

  let connection
  try {
    connection = await db.getConnection()
    await connection.beginTransaction()

    const [existingRows] = await connection.query('SELECT id FROM HoaDon WHERE id = ? LIMIT 1', [invoiceId])
    if (!existingRows || existingRows.length === 0) {
      await connection.rollback()
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn!' })
    }

    await connection.query('DELETE FROM GiaoDich WHERE invoiceId = ?', [invoiceId])
    await connection.query('DELETE FROM HoaDon WHERE id = ?', [invoiceId])

    await connection.commit()
    return res.json({ message: 'Xóa hóa đơn thành công!' })
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

const getStudentInvoices = async (req, res) => {
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
        hd.id,
        hd.studentId,
        hd.semesterId,
        hk.semesterName,
        hd.issueDate,
        hd.originalDeadline,
        hd.effectiveDeadline,
        hd.totalAmount,
        hd.paidAmount,
        hd.status
      FROM HoaDon hd
      LEFT JOIN HocKy hk ON hd.semesterId = hk.id
      WHERE hd.studentId = ?
      ORDER BY hd.id DESC
    `
    const [rows] = await db.query(sql, [studentId])
    return res.json({ data: rows })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

const getInvoicePaymentPreview = async (req, res) => {
  const studentId = req.user?.studentId
  const invoiceId = Number(req.params.invoiceId)

  if (req.user?.role !== 'student') {
    return res.status(403).json({ message: 'Chỉ sinh viên mới được truy cập!' })
  }
  if (studentId === undefined || studentId === null) {
    return res.status(403).json({ message: 'Tài khoản chưa được gắn với sinh viên!' })
  }
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    return res.status(400).json({ message: 'Mã hóa đơn không hợp lệ!' })
  }

  try {
    const [invRows] = await db.query(
      `SELECT hd.id, hd.semesterId, hd.totalAmount, hd.paidAmount, hd.status
       FROM HoaDon hd
       WHERE hd.id = ? AND hd.studentId = ?
       LIMIT 1`,
      [invoiceId, studentId]
    )
    if (!invRows || invRows.length === 0) {
      return res.status(404).json({ message: 'Không tìm thấy hóa đơn!' })
    }
    const inv = invRows[0]
    const semesterId = inv.semesterId
    const [feeRows] = await db.query(
      'SELECT id AS khoanPhiId, feeName, amount FROM KhoanPhi WHERE semesterId = ? ORDER BY id ASC',
      [semesterId]
    )
    const lineItems = (feeRows || []).map((row) => ({
      khoanPhiId: row.khoanPhiId,
      feeName: row.feeName,
      amount: Number(row.amount || 0),
      isOptional: isOptionalFeeName(row.feeName)
    }))
    const totalAmount = Number(inv.totalAmount || 0)
    const paidAmount = Number(inv.paidAmount || 0)
    const remaining = Math.max(0, totalAmount - paidAmount)
    return res.json({
      data: {
        invoiceId: inv.id,
        semesterId,
        lineItems,
        invoiceTotal: totalAmount,
        paidAmount,
        remaining,
        status: inv.status
      }
    })
  } catch (error) {
    return res.status(500).json({ error: error.message })
  }
}

module.exports = {
  getAllInvoices,
  exportDebtListExcel,
  getInvoiceStats,
  getInvoicesByStudentId,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getStudentInvoices,
  getInvoicePaymentPreview
}
