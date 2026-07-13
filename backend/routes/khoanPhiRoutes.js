const express = require('express')
const { verifyTokenAndRole } = require('../middleware/authMiddleware')
const { getAllFees, getFeeById, createFee, updateFee, deleteFee } = require('../controllers/khoanPhiController')

const router = express.Router()

// Staff: CRUD khoản phí.
router.get('/', verifyTokenAndRole(['staff']), getAllFees)
router.get('/:id', verifyTokenAndRole(['staff']), getFeeById)
router.post('/', verifyTokenAndRole(['staff']), createFee)
router.put('/:id', verifyTokenAndRole(['staff']), updateFee)
router.delete('/:id', verifyTokenAndRole(['staff']), deleteFee)

module.exports = router
