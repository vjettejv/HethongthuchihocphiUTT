const bcrypt = require('bcryptjs')
require('dotenv').config()

const db = require('../config/db')

const toDateOnlyString = (date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

async function seedData() {
  let connection
  try {
    connection = await db.getConnection()

    await connection.query('SET FOREIGN_KEY_CHECKS = 0')

    await connection.query('TRUNCATE TABLE GiaoDich')
    await connection.query('TRUNCATE TABLE GiaHan')
    await connection.query('TRUNCATE TABLE HoaDon')
    await connection.query('TRUNCATE TABLE KhoanPhi')
    await connection.query('TRUNCATE TABLE HocKy')
    await connection.query('TRUNCATE TABLE TaiKhoan')
    await connection.query('TRUNCATE TABLE SinhVien')

    await connection.query('SET FOREIGN_KEY_CHECKS = 1')

    const passwordHash = await bcrypt.hash('123456', 10)

    // 1) Semesters
    const semesters = [
      { semesterName: 'Học kỳ 1 - 2024', startDate: '2024-01-15', deadlineDays: 30 },
      { semesterName: 'Học kỳ 2 - 2024', startDate: '2024-08-15', deadlineDays: 30 },
      { semesterName: 'Học kỳ 1 - 2025', startDate: '2025-01-15', deadlineDays: 30 }
    ]

    const semesterIds = []
    for (const semester of semesters) {
      const [result] = await connection.query(
        'INSERT INTO HocKy (semesterName, startDate, deadlineDays) VALUES (?, ?, ?)',
        [semester.semesterName, semester.startDate, semester.deadlineDays]
      )
      semesterIds.push(result.insertId)
    }

    // 2) Fees (>= 5 items across semesters)
    const fees = [
      { semesterId: semesterIds[0], feeName: 'Học phí', amount: 3500000 },
      { semesterId: semesterIds[0], feeName: 'Bảo hiểm y tế', amount: 750000 },
      { semesterId: semesterIds[0], feeName: 'Phí thư viện', amount: 120000 },
      { semesterId: semesterIds[1], feeName: 'Học phí', amount: 3600000 },
      { semesterId: semesterIds[1], feeName: 'Bảo hiểm y tế', amount: 750000 },
      { semesterId: semesterIds[2], feeName: 'Học phí', amount: 3800000 }
    ]

    for (const fee of fees) {
      await connection.query('INSERT INTO KhoanPhi (semesterId, feeName, amount) VALUES (?, ?, ?)', [
        fee.semesterId,
        fee.feeName,
        fee.amount
      ])
    }

    // 3) Students (5 students)
    const students = [
      {
        studentCode: 'SVK65001',
        fullName: 'Nguyễn Văn An',
        className: 'K65',
        email: 'an.k65@example.com',
        phone: '0901000001'
      },
      {
        studentCode: 'SVK65002',
        fullName: 'Trần Thị Bình',
        className: 'K65',
        email: 'binh.k65@example.com',
        phone: '0901000002'
      },
      {
        studentCode: 'SVK66001',
        fullName: 'Lê Quốc Cường',
        className: 'K66',
        email: 'cuong.k66@example.com',
        phone: '0901000003'
      },
      {
        studentCode: 'SVK66002',
        fullName: 'Phạm Minh Dung',
        className: 'K66',
        email: 'dung.k66@example.com',
        phone: '0901000004'
      },
      {
        studentCode: 'SVK66003',
        fullName: 'Võ Gia Hân',
        className: 'K66',
        email: 'han.k66@example.com',
        phone: '0901000005'
      }
    ]

    const studentIds = []
    for (const student of students) {
      const [result] = await connection.query(
        `
          INSERT INTO SinhVien (studentCode, fullName, className, email, phone, passwordHash, isBanned, bannedDate)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          student.studentCode,
          student.fullName,
          student.className,
          student.email,
          student.phone,
          passwordHash,
          false,
          null
        ]
      )
      studentIds.push(result.insertId)
    }

    // 4) Accounts (7 accounts): 1 admin, 1 staff, 5 students
    await connection.query('INSERT INTO TaiKhoan (username, passwordHash, role, studentId) VALUES (?, ?, ?, ?)', [
      'admin',
      passwordHash,
      'admin',
      null
    ])
    await connection.query('INSERT INTO TaiKhoan (username, passwordHash, role, studentId) VALUES (?, ?, ?, ?)', [
      'staff',
      passwordHash,
      'staff',
      null
    ])

    for (let i = 0; i < students.length; i += 1) {
      await connection.query('INSERT INTO TaiKhoan (username, passwordHash, role, studentId) VALUES (?, ?, ?, ?)', [
        students[i].studentCode,
        passwordHash,
        'student',
        studentIds[i]
      ])
    }

    // Helper: compute totalAmount for a semester
    const getTotalAmountBySemesterId = async (semesterId) => {
      const [rows] = await connection.query('SELECT IFNULL(SUM(amount), 0) AS totalAmount FROM KhoanPhi WHERE semesterId = ?', [
        semesterId
      ])
      return Number(rows?.[0]?.totalAmount || 0)
    }

    const getSemesterInfo = async (semesterId) => {
      const [rows] = await connection.query('SELECT id, startDate, deadlineDays FROM HocKy WHERE id = ? LIMIT 1', [semesterId])
      return rows?.[0]
    }

    // 5) Invoices (3): paid, partial, pending with overdue date
    const paidSemesterId = semesterIds[0]
    const partialSemesterId = semesterIds[1]
    const pendingSemesterId = semesterIds[2]

    const invoiceConfigs = [
      { studentId: studentIds[0], semesterId: paidSemesterId, type: 'paid' },
      { studentId: studentIds[1], semesterId: partialSemesterId, type: 'partial' },
      { studentId: studentIds[2], semesterId: pendingSemesterId, type: 'pendingOverdue' }
    ]

    const invoiceIds = []
    for (const config of invoiceConfigs) {
      const totalAmount = await getTotalAmountBySemesterId(config.semesterId)
      const semesterInfo = await getSemesterInfo(config.semesterId)
      const startDate = new Date(semesterInfo.startDate)
      const originalDeadline = addDays(startDate, Number(semesterInfo.deadlineDays || 0))
      const effectiveDeadline =
        config.type === 'pendingOverdue' ? addDays(new Date(), -10) : new Date(originalDeadline)

      let paidAmount = 0
      let status = 'pending'

      if (config.type === 'paid') {
        paidAmount = totalAmount
        status = 'paid'
      } else if (config.type === 'partial') {
        paidAmount = Math.floor(totalAmount / 2)
        status = 'partial'
      }

      const [result] = await connection.query(
        `
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
        `,
        [
          config.studentId,
          config.semesterId,
          toDateOnlyString(new Date()),
          toDateOnlyString(originalDeadline),
          toDateOnlyString(effectiveDeadline),
          totalAmount,
          paidAmount,
          status
        ]
      )
      invoiceIds.push(result.insertId)
    }

    // 6) Transactions for paid and partial invoices
    const paidInvoiceId = invoiceIds[0]
    const partialInvoiceId = invoiceIds[1]

    if (paidInvoiceId) {
      const [invoiceRows] = await connection.query('SELECT totalAmount FROM HoaDon WHERE id = ? LIMIT 1', [paidInvoiceId])
      const totalAmount = Number(invoiceRows?.[0]?.totalAmount || 0)
      const partA = Math.floor(totalAmount * 0.6)
      const partB = totalAmount - partA
      await connection.query('INSERT INTO GiaoDich (invoiceId, amount, paymentDate, method) VALUES (?, ?, NOW(), ?)', [
        paidInvoiceId,
        partA,
        'online'
      ])
      await connection.query('INSERT INTO GiaoDich (invoiceId, amount, paymentDate, method) VALUES (?, ?, NOW(), ?)', [
        paidInvoiceId,
        partB,
        'cash'
      ])
    }

    if (partialInvoiceId) {
      const [invoiceRows] = await connection.query('SELECT paidAmount FROM HoaDon WHERE id = ? LIMIT 1', [partialInvoiceId])
      const paidAmount = Number(invoiceRows?.[0]?.paidAmount || 0)
      await connection.query('INSERT INTO GiaoDich (invoiceId, amount, paymentDate, method) VALUES (?, ?, NOW(), ?)', [
        partialInvoiceId,
        paidAmount,
        'cash'
      ])
    }

    console.log('✅ Seed dữ liệu mẫu thành công!')
  } finally {
    if (connection) connection.release()
  }
}

seedData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Seed thất bại:', error)
    process.exit(1)
  })

