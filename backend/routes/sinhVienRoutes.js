const express = require('express')
const { verifyTokenAndRole } = require('../middleware/authMiddleware')
const {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  toggleBanStudent,
  getMyProfile
} = require('../controllers/sinhVienController')

const router = express.Router()

// Admin: chỉ đọc danh sách / chi tiết (gắn tài khoản). Staff: CRUD + khóa tài khoản SV.
router.get('/', verifyTokenAndRole(['admin', 'staff']), getAllStudents)
router.post('/', verifyTokenAndRole(['staff']), createStudent)
router.put('/:id', verifyTokenAndRole(['staff']), updateStudent)
router.patch('/:id/ban', verifyTokenAndRole(['staff']), toggleBanStudent)

// Student: xem thông tin cá nhân
router.get('/me/profile', verifyTokenAndRole(['student']), getMyProfile)

router.get('/:id', verifyTokenAndRole(['admin', 'staff']), getStudentById)

module.exports = router
