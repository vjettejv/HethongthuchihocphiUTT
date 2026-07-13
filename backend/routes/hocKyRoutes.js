const express = require('express')
const { verifyTokenAndRole } = require('../middleware/authMiddleware')
const {
  getAllSemesters,
  getSemesterById,
  createSemester,
  updateSemester,
  deleteSemester,
  getFeesBySemesterId
} = require('../controllers/hocKyController')

const router = express.Router()

// Cán bộ tài vụ (staff): CRUD học kỳ. Admin không thao tác nghiệp vụ thu phí.
router.get('/', verifyTokenAndRole(['staff']), getAllSemesters)
router.get('/:id', verifyTokenAndRole(['staff']), getSemesterById)
router.get('/:id/fees', verifyTokenAndRole(['staff']), getFeesBySemesterId)
router.post('/', verifyTokenAndRole(['staff']), createSemester)
router.put('/:id', verifyTokenAndRole(['staff']), updateSemester)
router.delete('/:id', verifyTokenAndRole(['staff']), deleteSemester)

module.exports = router
