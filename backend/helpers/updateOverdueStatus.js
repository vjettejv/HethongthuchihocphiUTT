const cron = require('node-cron')
const db = require('../config/db')

async function updateOverdueStatus() {
  const sql = `
    UPDATE HoaDon
    SET status = 'overdue'
    WHERE status IN ('pending', 'partial')
      AND effectiveDeadline < CURRENT_DATE
  `
  const [result] = await db.query(sql)
  return result.affectedRows
}

async function banStudentsLongOverdue() {
  const sql = `
    UPDATE SinhVien sv
    INNER JOIN (
      SELECT DISTINCT hd.studentId AS sid
      FROM HoaDon hd
      WHERE hd.status IN ('pending', 'partial', 'overdue')
        AND hd.paidAmount < hd.totalAmount
        AND DATE_ADD(hd.effectiveDeadline, INTERVAL 15 DAY) < NOW()
    ) t ON sv.id = t.sid
    SET sv.isBanned = 1, sv.bannedDate = CURDATE()
    WHERE sv.isBanned = 0 OR sv.isBanned IS NULL
  `
  const [result] = await db.query(sql)
  return result.affectedRows
}

async function runOverdueJobs() {
  const overdueInvoices = await updateOverdueStatus()
  const bannedStudents = await banStudentsLongOverdue()
  return { overdueInvoices, bannedStudents }
}

function startOverdueCron() {
  cron.schedule('0 0 * * *', async () => {
    try {
      const { overdueInvoices, bannedStudents } = await runOverdueJobs()
      console.log(
        `[cron 00:00] overdue invoices: ${overdueInvoices}, banned students (deadline+15d): ${bannedStudents}`
      )
    } catch (err) {
      console.error('[cron overdue]', err.message)
    }
  })
}

module.exports = {
  updateOverdueStatus,
  banStudentsLongOverdue,
  runOverdueJobs,
  startOverdueCron
}
