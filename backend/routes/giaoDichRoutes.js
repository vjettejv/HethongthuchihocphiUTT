const express = require('express')
const { verifyTokenAndRole } = require('../middleware/authMiddleware')
const {
  getAllPayments,
  createPayment,
  studentPayInvoice,
  getStudentPayments,
  getStudentVietQr,
  confirmStudentVietQrPayment
} = require('../controllers/giaoDichController')

const router = express.Router()

// Đăng ký route cụ thể trước route gốc `/` để tránh xung đột matching
router.get('/qr/:invoiceId', verifyTokenAndRole(['student']), getStudentVietQr)
router.post('/confirm/:invoiceId', verifyTokenAndRole(['student']), confirmStudentVietQrPayment)
router.get('/me', verifyTokenAndRole(['student']), getStudentPayments)
router.post('/me/pay', verifyTokenAndRole(['student']), studentPayInvoice)

// Gốc router: kết hợp với app.use('/api/payments', ...) => GET|POST /api/payments
router
  .route('/')
  .get(verifyTokenAndRole(['staff']), getAllPayments)
  .post(verifyTokenAndRole(['staff']), createPayment)

module.exports = router
