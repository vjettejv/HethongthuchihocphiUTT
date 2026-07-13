const express = require('express')
const { verifyTokenAndRole } = require('../middleware/authMiddleware')
const {
  getAllInvoices,
  exportDebtListExcel,
  getInvoiceStats,
  getInvoicesByStudentId,
  createInvoice,
  updateInvoice,
  deleteInvoice
} = require('../controllers/hoaDonController')

const router = express.Router()

// Route cụ thể trước `/:id` và `/` (GET /api/invoices/me đã đăng ký trong server.js — giữ /student ở đây)
router.get('/student/:studentId', verifyTokenAndRole(['staff', 'student']), getInvoicesByStudentId)
router.get('/debt/export', verifyTokenAndRole(['staff']), exportDebtListExcel)
// Chỉ cán bộ tài vụ thao tác hóa đơn (admin không xem / không sửa qua API này).
router.get('/stats', verifyTokenAndRole(['staff']), getInvoiceStats)
router.put('/:id', verifyTokenAndRole(['staff']), updateInvoice)
router.delete('/:id', verifyTokenAndRole(['staff']), deleteInvoice)
router
  .route('/')
  .get(verifyTokenAndRole(['staff']), getAllInvoices)
  .post(verifyTokenAndRole(['staff']), createInvoice)

module.exports = router
